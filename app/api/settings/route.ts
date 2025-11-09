import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('*');

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

    return NextResponse.json({
      trading_interval_minutes: Number(settingsMap.trading_interval_minutes) || 60,
      enabled_llms: settingsMap.enabled_llms || ['OpenAI', 'Claude', 'DeepSeek', 'Qwen'],
      selected_models: selectedModels || {
        'OpenAI': 'gpt-4o',
        'Claude': 'claude-3-5-sonnet-20241022',
        'DeepSeek': 'deepseek-chat',
        'Qwen': 'qwen-plus'
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trading_interval_minutes, enabled_llms, selected_models } = body;

    const errors: string[] = [];
    const now = new Date().toISOString();

    // Upsert trading interval
    if (trading_interval_minutes !== undefined) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'trading_interval_minutes',
          value: trading_interval_minutes.toString(),
          updated_at: now,
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('[SETTINGS] Error saving trading_interval_minutes:', error);
        errors.push(`Trading interval: ${error.message}`);
      }
    }

    // Upsert enabled LLMs
    if (enabled_llms !== undefined) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'enabled_llms',
          value: enabled_llms,
          updated_at: now,
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('[SETTINGS] Error saving enabled_llms:', error);
        errors.push(`Enabled LLMs: ${error.message}`);
      }
    }

    // Upsert selected models (CRITICAL FIX: Pass object directly for jsonb column)
    if (selected_models !== undefined) {
      // For jsonb columns, pass the object directly - do NOT stringify
      const modelValue = typeof selected_models === 'string'
        ? JSON.parse(selected_models)
        : selected_models;

      console.log('[SETTINGS] Saving selected_models:', JSON.stringify(modelValue, null, 2));

      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'selected_models',
          value: modelValue,  // ✅ Object, not string
          updated_at: now,
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('[SETTINGS] Error saving selected_models:', error);
        errors.push(`Selected models: ${error.message}`);
      } else {
        console.log('[SETTINGS] ✓ Selected models saved successfully');
      }
    }

    // Return errors if any occurred
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors,
          message: `Failed to save: ${errors.join(', ')}`
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SETTINGS] Error updating settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
