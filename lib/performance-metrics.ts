/**
 * Performance Metrics Module
 * Calculates trading performance statistics inspired by Alpha Arena
 */

import { supabase, LLMTrader } from './supabase';

/**
 * Calculate Sharpe Ratio for a trader
 * Sharpe Ratio = (Average Return - Risk-Free Rate) / Standard Deviation of Returns
 *
 * For crypto trading, we'll use:
 * - Risk-free rate = 0 (simplified, as crypto is 24/7 and global)
 * - Returns calculated from daily snapshots or trade-by-trade
 */
export async function calculateSharpeRatio(traderId: string): Promise<number> {
  // Get trader's initial and current balance
  const { data: trader } = await supabase
    .from('llm_traders')
    .select('initial_balance, current_balance, created_at')
    .eq('id', traderId)
    .single();

  if (!trader) return 0;

  // Get all completed trades to calculate returns
  const { data: trades } = await supabase
    .from('trades')
    .select('executed_at, total_value, pnl')
    .eq('llm_trader_id', traderId)
    .order('executed_at', { ascending: true });

  if (!trades || trades.length < 2) {
    // Not enough data to calculate Sharpe ratio
    return 0;
  }

  // Calculate returns as percentage changes
  const returns: number[] = [];
  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    if (trade.pnl !== null && trade.pnl !== undefined) {
      // Calculate return as percentage of capital at that point
      const returnPct = (trade.pnl / trade.total_value) * 100;
      returns.push(returnPct);
    }
  }

  if (returns.length === 0) return 0;

  // Calculate average return
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate standard deviation of returns
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Avoid division by zero
  if (stdDev === 0) return 0;

  // Sharpe ratio (assuming risk-free rate = 0)
  const sharpeRatio = avgReturn / stdDev;

  return sharpeRatio;
}

/**
 * Calculate total return percentage for a trader
 * IMPORTANT: Uses total account value (cash + unrealized position value), not just cash balance
 */
export async function calculateTotalReturn(traderId: string): Promise<number> {
  const { data: trader } = await supabase
    .from('llm_traders')
    .select('initial_balance, current_balance')
    .eq('id', traderId)
    .single();

  if (!trader || trader.initial_balance === 0) return 0;

  // Get unrealized position value (filter out dust positions)
  const { data: positions } = await supabase
    .from('positions')
    .select('amount, current_price')
    .eq('llm_trader_id', traderId)
    .eq('is_active', true)
    .gt('amount', 0.00000001);

  // Calculate total account value = cash + unrealized position value
  const positionValue = positions?.reduce((sum, p) => sum + (p.amount * p.current_price), 0) || 0;
  const totalAccountValue = trader.current_balance + positionValue;

  // Return percentage based on total account value, not just cash
  return ((totalAccountValue - trader.initial_balance) / trader.initial_balance) * 100;
}

/**
 * Calculate win rate (percentage of profitable trades)
 */
export async function calculateWinRate(traderId: string): Promise<number> {
  const { data: trader } = await supabase
    .from('llm_traders')
    .select('winning_trades, losing_trades')
    .eq('id', traderId)
    .single();

  if (!trader) return 0;

  const totalTrades = trader.winning_trades + trader.losing_trades;
  if (totalTrades === 0) return 0;

  return (trader.winning_trades / totalTrades) * 100;
}

/**
 * Calculate average holding period in hours
 */
export async function calculateAvgHoldingPeriod(traderId: string): Promise<number> {
  const { data: positions } = await supabase
    .from('positions')
    .select('opened_at, updated_at, is_active')
    .eq('llm_trader_id', traderId)
    .eq('is_active', false); // Only closed positions

  if (!positions || positions.length === 0) return 0;

  const holdingPeriods: number[] = [];
  for (const position of positions) {
    const openedAt = new Date(position.opened_at).getTime();
    const closedAt = new Date(position.updated_at).getTime();
    const hoursHeld = (closedAt - openedAt) / (1000 * 60 * 60);
    holdingPeriods.push(hoursHeld);
  }

  const avgHours = holdingPeriods.reduce((sum, h) => sum + h, 0) / holdingPeriods.length;
  return avgHours;
}

/**
 * Calculate trade frequency (trades per day)
 */
export async function calculateTradeFrequency(traderId: string): Promise<number> {
  const { data: trader } = await supabase
    .from('llm_traders')
    .select('created_at, total_trades')
    .eq('id', traderId)
    .single();

  if (!trader || trader.total_trades === 0) return 0;

  const createdAt = new Date(trader.created_at).getTime();
  const now = Date.now();
  const daysActive = (now - createdAt) / (1000 * 60 * 60 * 24);

  if (daysActive < 0.01) return 0; // Avoid division by very small numbers

  return trader.total_trades / daysActive;
}

/**
 * Calculate average position size in USD
 */
export async function calculateAvgPositionSize(traderId: string): Promise<number> {
  const { data: trades } = await supabase
    .from('trades')
    .select('total_value')
    .eq('llm_trader_id', traderId)
    .eq('action', 'BUY');

  if (!trades || trades.length === 0) return 0;

  const avgSize = trades.reduce((sum, t) => sum + t.total_value, 0) / trades.length;
  return avgSize;
}

/**
 * Calculate profit factor (Gross Profit / Gross Loss)
 */
export async function calculateProfitFactor(traderId: string): Promise<number> {
  const { data: trades } = await supabase
    .from('trades')
    .select('pnl')
    .eq('llm_trader_id', traderId)
    .not('pnl', 'is', null);

  if (!trades || trades.length === 0) return 0;

  let grossProfit = 0;
  let grossLoss = 0;

  for (const trade of trades) {
    if (trade.pnl > 0) {
      grossProfit += trade.pnl;
    } else if (trade.pnl < 0) {
      grossLoss += Math.abs(trade.pnl);
    }
  }

  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;

  return grossProfit / grossLoss;
}

/**
 * Calculate maximum drawdown percentage
 */
export async function calculateMaxDrawdown(traderId: string): Promise<number> {
  const { data: trader } = await supabase
    .from('llm_traders')
    .select('initial_balance')
    .eq('id', traderId)
    .single();

  if (!trader) return 0;

  // Get balance history from trades
  const { data: trades } = await supabase
    .from('trades')
    .select('executed_at, pnl')
    .eq('llm_trader_id', traderId)
    .order('executed_at', { ascending: true });

  if (!trades || trades.length === 0) return 0;

  // Reconstruct balance over time
  let balance = trader.initial_balance;
  let peak = balance;
  let maxDrawdown = 0;

  for (const trade of trades) {
    if (trade.pnl !== null) {
      balance += trade.pnl;

      if (balance > peak) {
        peak = balance;
      }

      const drawdown = ((peak - balance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return maxDrawdown;
}

/**
 * Get all performance metrics for a trader
 */
export async function getAllPerformanceMetrics(traderId: string) {
  const [
    sharpeRatio,
    totalReturn,
    winRate,
    avgHoldingPeriod,
    tradeFrequency,
    avgPositionSize,
    maxDrawdown,
    profitFactor,
  ] = await Promise.all([
    calculateSharpeRatio(traderId),
    calculateTotalReturn(traderId),
    calculateWinRate(traderId),
    calculateAvgHoldingPeriod(traderId),
    calculateTradeFrequency(traderId),
    calculateAvgPositionSize(traderId),
    calculateMaxDrawdown(traderId),
    calculateProfitFactor(traderId),
  ]);

  return {
    sharpe_ratio: sharpeRatio,
    total_return_percent: totalReturn,
    win_rate: winRate,
    avg_holding_period_hours: avgHoldingPeriod,
    trade_frequency: tradeFrequency,
    avg_position_size_usd: avgPositionSize,
    max_drawdown_percent: maxDrawdown,
    profit_factor: profitFactor,
  };
}

/**
 * Calculate time elapsed since trading started (for prompt context)
 */
export async function getMinutesSinceStart(traderId: string): Promise<number> {
  const { data: trader } = await supabase
    .from('llm_traders')
    .select('created_at')
    .eq('id', traderId)
    .single();

  if (!trader) return 0;

  const createdAt = new Date(trader.created_at).getTime();
  const now = Date.now();
  const minutesElapsed = (now - createdAt) / (1000 * 60);

  return Math.floor(minutesElapsed);
}
