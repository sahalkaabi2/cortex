import { supabase } from './supabase';

export interface TraderPerformance {
  final_value: number;
  return_pct: number;
  total_trades: number;
  win_rate: number;
  total_costs: number;
}

export interface Summary {
  total_trades: number;
  best_performer: {
    name: string;
    final_value: number;
    return_pct: number;
  };
  worst_performer: {
    name: string;
    final_value: number;
    return_pct: number;
  };
  total_api_calls: number;
  total_costs: number;
  traders_performance: { [key: string]: TraderPerformance };
}

/**
 * Calculate current summary statistics across all traders
 */
export async function getCurrentSummary(): Promise<Summary> {
  // Get all traders
  const { data: traders } = await supabase
    .from('llm_traders')
    .select('*');

  // Get active positions to calculate current value (filter out dust positions)
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('is_active', true)
    .gt('amount', 0.00000001);

  // Calculate metrics for each trader
  const tradersPerformance: { [key: string]: TraderPerformance } = {};
  let bestPerformer = { name: '', final_value: 0, return_pct: -100 };
  let worstPerformer = { name: '', final_value: 0, return_pct: 100 };
  let totalApiCalls = 0;
  let totalCosts = 0;
  let totalTrades = 0;

  if (traders) {
    for (const trader of traders) {
      // Calculate total portfolio value (balance + positions)
      const traderPositions = positions?.filter((p: any) => p.llm_trader_id === trader.id) || [];
      const positionsValue = traderPositions.reduce((sum: number, p: any) => {
        return sum + (p.current_value || 0);
      }, 0);

      const finalValue = trader.current_balance + positionsValue;
      const returnPct = ((finalValue - 100) / 100) * 100;
      const winRate = trader.total_trades > 0 ? ((trader.winning_trades || 0) / trader.total_trades) * 100 : 0;
      const traderTotalCosts = (trader.total_llm_api_cost || 0) + (trader.total_trading_fees || 0) + (trader.total_slippage_cost || 0);

      tradersPerformance[trader.name] = {
        final_value: finalValue,
        return_pct: returnPct,
        total_trades: trader.total_trades || 0,
        win_rate: winRate,
        total_costs: traderTotalCosts,
      };

      // Track best/worst
      if (returnPct > bestPerformer.return_pct) {
        bestPerformer = { name: trader.name, final_value: finalValue, return_pct: returnPct };
      }
      if (returnPct < worstPerformer.return_pct) {
        worstPerformer = { name: trader.name, final_value: finalValue, return_pct: returnPct };
      }

      // Aggregate totals
      totalApiCalls += trader.llm_call_count || 0;
      totalCosts += traderTotalCosts;
      totalTrades += trader.total_trades || 0;
    }
  }

  return {
    total_trades: totalTrades,
    best_performer: bestPerformer,
    worst_performer: worstPerformer,
    total_api_calls: totalApiCalls,
    total_costs: totalCosts,
    traders_performance: tradersPerformance,
  };
}
