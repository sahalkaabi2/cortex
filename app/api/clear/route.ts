import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/clear
 * Reset all trading data - clears all trades, positions, decisions, and resets traders to $100
 */
export async function POST() {
  try {
    // Delete all LLM decisions - select all IDs first, then delete
    const { data: decisions } = await supabase.from('llm_decisions').select('id');
    if (decisions && decisions.length > 0) {
      const { error: decisionsError } = await supabase
        .from('llm_decisions')
        .delete()
        .in('id', decisions.map(d => d.id));

      if (decisionsError) {
        throw new Error(`Failed to delete decisions: ${decisionsError.message}`);
      }
    }

    // Delete all trades
    const { data: trades } = await supabase.from('trades').select('id');
    if (trades && trades.length > 0) {
      const { error: tradesError } = await supabase
        .from('trades')
        .delete()
        .in('id', trades.map(t => t.id));

      if (tradesError) {
        throw new Error(`Failed to delete trades: ${tradesError.message}`);
      }
    }

    // Delete all positions
    const { data: positions } = await supabase.from('positions').select('id');
    if (positions && positions.length > 0) {
      const { error: positionsError } = await supabase
        .from('positions')
        .delete()
        .in('id', positions.map(p => p.id));

      if (positionsError) {
        throw new Error(`Failed to delete positions: ${positionsError.message}`);
      }
    }

    // Delete all market snapshots
    const { data: snapshots } = await supabase.from('market_snapshots').select('id');
    if (snapshots && snapshots.length > 0) {
      const { error: snapshotsError } = await supabase
        .from('market_snapshots')
        .delete()
        .in('id', snapshots.map(s => s.id));

      if (snapshotsError) {
        throw new Error(`Failed to delete market snapshots: ${snapshotsError.message}`);
      }
    }

    // Delete all performance history
    const { data: performanceHistory } = await supabase.from('performance_history').select('id');
    if (performanceHistory && performanceHistory.length > 0) {
      const { error: performanceError } = await supabase
        .from('performance_history')
        .delete()
        .in('id', performanceHistory.map(p => p.id));

      if (performanceError) {
        throw new Error(`Failed to delete performance history: ${performanceError.message}`);
      }
    }

    // Reset all traders back to $100 and clear all stats/costs
    // IMPORTANT: Also reset created_at for true fresh start (affects "minutes since start" metric)
    const { error: tradersError } = await supabase
      .from('llm_traders')
      .update({
        current_balance: 100,
        total_pnl: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_llm_api_cost: 0,
        total_trading_fees: 0,
        total_slippage_cost: 0,
        llm_call_count: 0,
        total_tokens_used: 0,
        created_at: new Date().toISOString(), // Reset start time for fresh experiment
        updated_at: new Date().toISOString(),
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (tradersError) {
      console.error('Error resetting traders:', tradersError);
      throw new Error(`Failed to reset traders: ${tradersError.message}`);
    }

    // Delete benchmark (will be reinitialized with BTC only on next start)
    const { data: benchmarks } = await supabase
      .from('benchmark')
      .select('id')
      .eq('strategy', 'buy_and_hold');

    if (benchmarks && benchmarks.length > 0) {
      const { error: benchmarkError } = await supabase
        .from('benchmark')
        .delete()
        .in('id', benchmarks.map(b => b.id));

      if (benchmarkError) {
        throw new Error(`Failed to delete benchmark: ${benchmarkError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All trading data has been reset. Traders reset to $100.'
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
