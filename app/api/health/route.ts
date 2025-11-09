/**
 * Enhanced Health Check API
 * Returns data availability AND alignment with LLM prompt requirements
 */

import { NextResponse } from 'next/server';
import { getAllMarketData } from '@/lib/binance';
import { CRYPTO_PAIRS } from '@/lib/types';

/**
 * Field metadata: Dual health check tracking
 * - retrievedFromBinance: Do we fetch/calculate this from Binance API?
 * - usedInPrompt: Do we send this to the LLM in the trading prompt?
 * - status: optimal (both), wasted (fetch but don't use), error (use but don't fetch), future (neither)
 */
const FIELD_METADATA: Record<
  string,
  {
    retrievedFromBinance: boolean;
    usedInPrompt: boolean;
    promptLocation: string | null;
    description: string;
  }
> = {
  // ========================================
  // BASE MARKET DATA (1H timeframe)
  // ========================================
  coin: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Market sections header (line 48)',
    description: 'Coin symbol (BTC, ETH, etc.)',
  },
  price: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'current_price (line 51)',
    description: 'Current market price',
  },
  volume_24h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: '24H Volume (line 61)',
    description: '24-hour trading volume',
  },
  price_change_24h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: '24H Change (line 61)',
    description: '24-hour price change percentage',
  },

  // ========================================
  // TECHNICAL INDICATORS (1H timeframe)
  // ========================================
  ema_12: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'current_ema12, EMA (12) (lines 51, 56)',
    description: '12-period exponential moving average (short-term trend)',
  },
  ema_20: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'current_ema20, EMA (20) (lines 51, 56)',
    description: '20-period exponential moving average',
  },
  ema_26: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'current_ema26, EMA (26) (lines 51, 56)',
    description: '26-period exponential moving average (medium-term trend)',
  },
  ema_50: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'EMA (50) (line 56)',
    description: '50-period exponential moving average (longer-term trend)',
  },
  rsi_7: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'current_rsi (7 period), RSI (7-period) (lines 51, 55)',
    description: '7-period RSI (short-term momentum)',
  },
  rsi_14: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'RSI (14-period) (line 55)',
    description: '14-period RSI (standard momentum indicator)',
  },
  macd: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'current_macd, MACD (lines 51, 57)',
    description: 'MACD indicator (trend strength)',
  },
  macd_signal: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'MACD Signal (line 57)',
    description: 'MACD signal line',
  },

  // ========================================
  // INTRADAY MULTI-TIMEFRAME (3-min intervals)
  // ========================================
  price_history_3m: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Intraday series (line 54)',
    description: 'Last 10 prices at 3-min intervals (array)',
  },
  rsi_history_3m: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'RSI history (line 55)',
    description: 'Last 10 RSI-7 values at 3-min intervals (array)',
  },
  ema_history_3m: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'EMA history (line 56)',
    description: 'Last 10 EMA-20 values at 3-min intervals (array)',
  },

  // ========================================
  // LONGER-TERM CONTEXT (4H timeframe)
  // ========================================
  price_4h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: '4H Price (line 60)',
    description: '4-hour timeframe price (longer-term context)',
  },
  volume_4h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: '4H Volume (line 60)',
    description: '4-hour timeframe volume (longer-term context)',
  },
  rsi_4h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: '4H RSI (line 60)',
    description: '4-hour timeframe RSI-14',
  },
  macd_4h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: '4H MACD (line 60)',
    description: '4-hour timeframe MACD',
  },
};

export async function GET() {
  try {
    // Fetch market data for all coins
    const marketData = await getAllMarketData(Array.from(CRYPTO_PAIRS));

    // Analyze each coin's data structure
    const healthReport = marketData.map((m) => {
      // Build field status with dual-check metadata
      const fields: Record<
        string,
        {
          present: boolean;
          type: string;
          retrievedFromBinance: boolean;
          usedInPrompt: boolean;
          status: 'optimal' | 'wasted' | 'error' | 'future';
          promptLocation: string | null;
          description: string;
        }
      > = {};

      Object.entries(FIELD_METADATA).forEach(([fieldName, metadata]) => {
        const value = (m as any)[fieldName];
        const isPresent = value !== undefined && (typeof value !== 'number' || !isNaN(value));

        // Calculate dual status
        let status: 'optimal' | 'wasted' | 'error' | 'future';
        if (metadata.retrievedFromBinance && metadata.usedInPrompt) {
          status = 'optimal'; // ✅ Best case: we fetch it AND use it
        } else if (metadata.retrievedFromBinance && !metadata.usedInPrompt) {
          status = 'wasted'; // ⚠️ Performance issue: we fetch but don't use
        } else if (!metadata.retrievedFromBinance && metadata.usedInPrompt) {
          status = 'error'; // ❌ Critical: we use in prompt but don't fetch (will crash!)
        } else {
          status = 'future'; // ⭕ Future enhancement: neither fetched nor used
        }

        fields[fieldName] = {
          present: isPresent,
          type: typeof value,
          retrievedFromBinance: metadata.retrievedFromBinance,
          usedInPrompt: metadata.usedInPrompt,
          status,
          promptLocation: metadata.promptLocation,
          description: metadata.description,
        };
      });

      // Calculate status-based summaries
      const optimal = Object.entries(fields).filter(([_, f]) => f.status === 'optimal');
      const optimalPresent = optimal.filter(([_, f]) => f.present);
      const wasted = Object.entries(fields).filter(([_, f]) => f.status === 'wasted');
      const wastedPresent = wasted.filter(([_, f]) => f.present);
      const errors = Object.entries(fields).filter(([_, f]) => f.status === 'error');
      const future = Object.entries(fields).filter(([_, f]) => f.status === 'future');

      // Prompt readiness: all fields marked as usedInPrompt must be present
      const promptFields = Object.entries(fields).filter(([_, f]) => f.usedInPrompt);
      const promptFieldsPresent = promptFields.filter(([_, f]) => f.present);

      const promptReadiness = {
        score: promptFieldsPresent.length,
        total: promptFields.length,
        percentage: Math.round((promptFieldsPresent.length / promptFields.length) * 100),
        ready: promptFieldsPresent.length === promptFields.length,
        missingFields: promptFields
          .filter(([_, f]) => !f.present)
          .map(([name, _]) => name),
      };

      return {
        coin: m.coin,
        fields,
        promptReadiness,
        summary: {
          optimal: {
            total: optimal.length,
            present: optimalPresent.length,
            missing: optimal.length - optimalPresent.length,
          },
          wasted: {
            total: wasted.length,
            present: wastedPresent.length,
            names: wastedPresent.map(([name, _]) => name),
          },
          errors: {
            total: errors.length,
            count: errors.length,
            names: errors.map(([name, _]) => name),
          },
          future: {
            total: future.length,
            count: future.length,
            names: future.map(([name, _]) => name),
          },
        },
      };
    });

    // Determine overall health status
    const allPromptReady = healthReport.every((coin) => coin.promptReadiness.ready);

    const status = allPromptReady ? 'healthy' : 'degraded';

    const message = allPromptReady
      ? 'All critical prompt fields are present'
      : `${healthReport.filter((c) => !c.promptReadiness.ready).length} coin(s) missing critical fields`;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status,
      message,
      coins: healthReport,
    });
  } catch (error) {
    console.error('[HEALTH CHECK] Error:', error);

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'error',
        message: 'Failed to fetch market data from Binance',
        error: String(error),
      },
      { status: 500 }
    );
  }
}
