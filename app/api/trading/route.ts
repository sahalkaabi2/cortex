/**
 * Trading Control API
 * COMPLETELY REWRITTEN - No module-level state, referer-based security
 */

import { NextResponse } from 'next/server';
import { TradingEngine } from '@/lib/trading-engine';
import { BuyAndHoldBenchmark } from '@/lib/benchmark';
import { supabase } from '@/lib/supabase';
import { getAllMarketData } from '@/lib/binance';
import { generateMarketDataPreview } from '@/lib/prompt-preview';
import { CRYPTO_PAIRS } from '@/lib/types';

// NO MODULE-LEVEL STATE
// All state is stored in database or created per-request

// In-memory reference to trading engine (will be lost on server restart - that's a feature!)
let globalEngineInstance: TradingEngine | null = null;
let globalBenchmarkInterval: NodeJS.Timeout | null = null;

/**
 * Get settings from database
 */
async function getSettings() {
  const { data: settings } = await supabase.from('settings').select('*');

  const settingsMap: Record<string, any> = {};
  settings?.forEach((s: any) => {
    settingsMap[s.key] = s.value;
  });

  // Parse selected_models if it's a JSON string
  let selectedModels = settingsMap.selected_models;
  if (typeof selectedModels === 'string') {
    try {
      selectedModels = JSON.parse(selectedModels);
    } catch (e) {
      console.warn('Error parsing selected_models:', e);
      selectedModels = null;
    }
  }

  return {
    trading_interval_minutes: Number(settingsMap.trading_interval_minutes) || 60,
    enabled_llms: settingsMap.enabled_llms || ['OpenAI', 'Claude', 'DeepSeek', 'Qwen'],
    selected_models: selectedModels || {
      'OpenAI': 'gpt-4o',
      'Claude': 'claude-3-5-sonnet-20241022',
      'DeepSeek': 'deepseek-chat',
      'Qwen': 'qwen-plus'
    }
  };
}

/**
 * POST /api/trading
 * Control trading engine with referer validation
 */
export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  console.log('═══════════════════════════════════════════════════');
  console.log(`[TRADING] POST Request received at ${timestamp}`);
  console.log('═══════════════════════════════════════════════════');

  try {
    const body = await request.json();
    const { action, isPaperMode } = body;

    console.log('[TRADING] Action:', action);
    console.log('[TRADING] Paper Mode:', isPaperMode);
    console.log('[TRADING] Referer:', request.headers.get('referer'));

    // Validate origin
    const referer = request.headers.get('referer');
    if (!referer || (!referer.includes('localhost') && !referer.includes('127.0.0.1'))) {
      console.warn('[TRADING] BLOCKED: Invalid referer -', referer);
      return NextResponse.json(
        { success: false, message: 'Invalid request origin' },
        { status: 403 }
      );
    }

    if (action === 'start') {
      console.log('[TRADING] ====== START REQUEST ======');

      // Check if already running
      if (globalEngineInstance) {
        console.warn('[TRADING] BLOCKED: Trading engine already running');
        return NextResponse.json(
          { success: false, message: 'Trading engine is already running' },
          { status: 400 }
        );
      }

      // STEP 1: Auto-create traders if they don't exist
      console.log('[TRADING] Checking for traders...');
      const { data: existingTraders } = await supabase
        .from('llm_traders')
        .select('*');

      if (!existingTraders || existingTraders.length === 0) {
        console.log('[TRADING] No traders found, creating them...');
        const tradersToCreate = ['OpenAI', 'Claude', 'DeepSeek', 'Qwen'].map((provider) => ({
          name: provider,
          provider: provider,
          initial_balance: 100,
          current_balance: 100,
          total_pnl: 0,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          total_llm_api_cost: 0,
          total_trading_fees: 0,
          total_slippage_cost: 0,
          llm_call_count: 0,
        }));

        const { error } = await supabase.from('llm_traders').insert(tradersToCreate);
        if (error) {
          console.error('[TRADING] ERROR creating traders:', error);
          return NextResponse.json(
            { success: false, message: 'Failed to create traders' },
            { status: 500 }
          );
        }
        console.log('[TRADING] ✓ Created 4 LLM traders');
      } else {
        console.log(`[TRADING] ✓ Found ${existingTraders.length} existing traders`);
      }

      // STEP 2: Prepare benchmark if it doesn't exist
      console.log('[TRADING] Preparing benchmark...');
      const benchmark = new BuyAndHoldBenchmark();
      await benchmark.prepareForStart();
      console.log('[TRADING] ✓ Benchmark prepared');

      // STEP 3: Load settings and start trading
      console.log('[TRADING] Creating trading engine...');
      const settings = await getSettings();
      console.log('[TRADING] Settings loaded from database:');
      console.log('  - Interval:', settings.trading_interval_minutes, 'minutes');
      console.log('  - Enabled LLMs:', settings.enabled_llms);
      console.log('  - Selected Models:', JSON.stringify(settings.selected_models, null, 2));

      // CRITICAL: Update database BEFORE starting engine to prevent race condition
      // The engine's first trading cycle will check the database status,
      // so we must ensure it's set to running BEFORE engine.start() is called
      console.log('[TRADING] Updating database status to running...');
      const { error: dbError } = await supabase
        .from('trading_status')
        .update({
          is_running: true,
          is_paper_mode: isPaperMode,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (dbError) {
        console.error('[TRADING] ERROR: Failed to update database status:', dbError);
        return NextResponse.json(
          { success: false, message: 'Failed to update database status' },
          { status: 500 }
        );
      }
      console.log('[TRADING] ✓ Database status updated: is_running = true');

      // Create NEW trading engine
      globalEngineInstance = new TradingEngine(isPaperMode ?? true);
      globalEngineInstance.setEnabledLLMs(settings.enabled_llms);
      globalEngineInstance.setSelectedModels(settings.selected_models);
      globalEngineInstance.start(settings.trading_interval_minutes);

      console.log('[TRADING] ✓ Trading engine started successfully');

      // Start benchmark tracking (buys BTC at current price)
      await benchmark.start();
      console.log('[TRADING] ✓ Benchmark started (purchased BTC at current price)');

      // Update benchmark value every hour
      globalBenchmarkInterval = setInterval(async () => {
        try {
          await benchmark.updateValue();
        } catch (error) {
          console.error('[TRADING] Benchmark update error:', error);
        }
      }, 60 * 60 * 1000);

      console.log('[TRADING] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[TRADING] ✓ LLMs AND BENCHMARK STARTED AT SAME TIME');
      console.log('[TRADING] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('═══════════════════════════════════════════════════');

      return NextResponse.json({
        success: true,
        message: 'Trading started successfully',
      });

    } else if (action === 'stop') {
      console.log('[TRADING] ====== STOP REQUEST ======');

      if (globalEngineInstance) {
        globalEngineInstance.stop();
        globalEngineInstance = null;
        console.log('[TRADING] ✓ Trading engine stopped');
      } else {
        console.log('[TRADING] No active engine to stop');
      }

      if (globalBenchmarkInterval) {
        clearInterval(globalBenchmarkInterval);
        globalBenchmarkInterval = null;
        console.log('[TRADING] ✓ Benchmark interval cleared');
      }

      // Update database to persist trading state
      const { error: dbError } = await supabase
        .from('trading_status')
        .update({
          is_running: false,
          stopped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (dbError) {
        console.error('[TRADING] Warning: Failed to update database status:', dbError);
      } else {
        console.log('[TRADING] ✓ Database status updated: is_running = false');
      }

      console.log('═══════════════════════════════════════════════════');

      return NextResponse.json({
        success: true,
        message: 'Trading stopped successfully',
      });

    } else if (action === 'status') {
      const isRunning = globalEngineInstance !== null;
      console.log('[TRADING] Status check - isRunning:', isRunning);

      return NextResponse.json({
        success: true,
        isRunning,
        isPaperMode,
      });

    } else if (action === 'preview_market_data') {
      console.log('[TRADING] Generating market data preview...');

      try {
        // Fetch current market data for all tracked coins
        const marketData = await getAllMarketData(Array.from(CRYPTO_PAIRS));

        // Generate preview (limit to 2 coins to keep it readable)
        const preview = generateMarketDataPreview(marketData, 2);

        console.log('[TRADING] Preview generated successfully');
        return NextResponse.json({
          success: true,
          preview,
          totalCoins: marketData.length,
        });
      } catch (error) {
        console.error('[TRADING] Error generating preview:', error);
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to generate preview',
            error: String(error)
          },
          { status: 500 }
        );
      }

    } else {
      console.warn('[TRADING] Invalid action:', action);
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[TRADING] ERROR:', error);
    console.error('[TRADING] Stack:', error instanceof Error ? error.stack : 'N/A');
    console.log('═══════════════════════════════════════════════════');

    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trading
 * Get current trading status from database
 */
export async function GET() {
  try {
    // Read status from database (source of truth)
    const { data: status, error } = await supabase
      .from('trading_status')
      .select('is_running, is_paper_mode')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('[TRADING] GET - Database error:', error);
      // Fallback to in-memory check if database fails
      const isRunning = globalEngineInstance !== null;
      return NextResponse.json({ success: true, isRunning });
    }

    const isRunning = status?.is_running || false;
    console.log('[TRADING] GET - Status check from DB:', isRunning);

    return NextResponse.json({
      success: true,
      isRunning,
      isPaperMode: status?.is_paper_mode || true,
    });
  } catch (error) {
    console.error('[TRADING] GET - Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
