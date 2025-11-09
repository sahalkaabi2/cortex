import { NextResponse } from 'next/server';
import { getCostSettings, updateCostSettings, loadCostPreset, clearCostCache } from '@/lib/costs';

/**
 * GET /api/costs
 * Retrieve all cost settings
 */
export async function GET() {
  try {
    const settings = await getCostSettings();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching cost settings:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/costs
 * Update cost settings
 *
 * Body can be:
 * 1. { preset: 'zero' | 'standard' | 'conservative' | 'high_volume' }
 * 2. { settings: { key: value, ... } }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle preset loading
    if (body.preset) {
      const preset = body.preset as 'zero' | 'standard' | 'conservative' | 'high_volume';

      if (!['zero', 'standard', 'conservative', 'high_volume'].includes(preset)) {
        return NextResponse.json(
          { success: false, error: 'Invalid preset name' },
          { status: 400 }
        );
      }

      await loadCostPreset(preset);
      clearCostCache();

      return NextResponse.json({
        success: true,
        message: `Loaded ${preset} preset successfully`,
      });
    }

    // Handle individual settings updates
    if (body.settings) {
      // Validate settings
      const validKeys = [
        'openai_api_cost',
        'claude_api_cost',
        'deepseek_api_cost',
        'qwen_api_cost',
        'binance_fee_rate',
        'slippage_enabled',
        'slippage_min',
        'slippage_max',
        'deduct_costs_from_balance',
        'include_costs_in_pnl',
      ];

      const updates: any = {};

      for (const [key, value] of Object.entries(body.settings)) {
        if (!validKeys.includes(key)) {
          return NextResponse.json(
            { success: false, error: `Invalid setting key: ${key}` },
            { status: 400 }
          );
        }

        // Validate value ranges
        const numValue = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value);

        if (isNaN(numValue)) {
          return NextResponse.json(
            { success: false, error: `Invalid value for ${key}` },
            { status: 400 }
          );
        }

        // Range validation
        if (key.includes('api_cost') && (numValue < 0 || numValue > 1)) {
          return NextResponse.json(
            { success: false, error: `API cost must be between $0 and $1` },
            { status: 400 }
          );
        }

        if (key === 'binance_fee_rate' && (numValue < 0 || numValue > 0.01)) {
          return NextResponse.json(
            { success: false, error: `Fee rate must be between 0% and 1%` },
            { status: 400 }
          );
        }

        if (key.includes('slippage') && !key.includes('enabled') && (numValue < 0 || numValue > 0.05)) {
          return NextResponse.json(
            { success: false, error: `Slippage must be between 0% and 5%` },
            { status: 400 }
          );
        }

        updates[key] = value;
      }

      await updateCostSettings(updates);
      clearCostCache();

      return NextResponse.json({
        success: true,
        message: 'Cost settings updated successfully',
        updated: updates,
      });
    }

    return NextResponse.json(
      { success: false, error: 'No preset or settings provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating cost settings:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
