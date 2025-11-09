'use client';

import { LLMIcon } from './llm-icon';
import { CryptoIcon } from './crypto-icon';
import { getLLMColor } from '@/lib/llm-colors';

interface Position {
  coin: string;
  amount: number;
  current_value: number;
}

interface Trader {
  name: string;
  provider: string;
  current_balance: number;
  total_llm_api_cost?: number;
  llm_call_count?: number;
  total_tokens_used?: number;
  total_trading_fees?: number;
  total_slippage_cost?: number;
  total_pnl?: number;
  total_trades?: number;
  winning_trades?: number;
  losing_trades?: number;
}

interface PortfolioDashboardProps {
  traders: Trader[];
  positions: Position[];
}

export function PortfolioDashboard({ traders, positions }: PortfolioDashboardProps) {
  // Group positions by trader
  const getTraderPositions = (traderName: string) => {
    return positions.filter((p: any) => p.llm_name === traderName);
  };

  // Calculate metrics for a trader
  const getTraderMetrics = (trader: Trader) => {
    const traderPositions = getTraderPositions(trader.name);
    const totalPositionValue = traderPositions.reduce((sum, p) => sum + p.current_value, 0);

    // Current portfolio value = cash balance + market value of positions
    // Note: Balance already has all costs deducted (API costs, trading fees, slippage)
    // as they are subtracted when incurred
    const currentPortfolio = trader.current_balance + totalPositionValue;

    const apiCost = trader.total_llm_api_cost || 0;
    const tradingFees = trader.total_trading_fees || 0;
    const slippage = trader.total_slippage_cost || 0;
    const totalCosts = apiCost + tradingFees + slippage;

    // Total P&L = (current portfolio value) - (initial balance)
    // This includes both realized P&L (from closed trades) and unrealized P&L (from open positions)
    // Costs are already accounted for in the balance, so this is net P&L after all costs
    const netPnl = currentPortfolio - trader.initial_balance;
    const netPnlPercent = (netPnl / trader.initial_balance) * 100;
    const roi = netPnlPercent; // Same as net P&L percent

    // Cost metrics
    const costsAsPercentOfInitial = (totalCosts / 100) * 100;
    const apiCostPercent = totalCosts > 0 ? (apiCost / totalCosts) * 100 : 0;
    const tradingFeesPercent = totalCosts > 0 ? (tradingFees / totalCosts) * 100 : 0;
    const slippagePercent = totalCosts > 0 ? (slippage / totalCosts) * 100 : 0;
    const avgCostPerTrade = trader.total_trades > 0 ? totalCosts / trader.total_trades : 0;

    const winRate = trader.total_trades
      ? ((trader.winning_trades || 0) / trader.total_trades) * 100
      : 0;

    return {
      traderPositions,
      totalPositionValue,
      currentPortfolio,
      apiCost,
      tradingFees,
      slippage,
      totalCosts,
      netPnl,
      netPnlPercent,
      roi,
      costsAsPercentOfInitial,
      apiCostPercent,
      tradingFeesPercent,
      slippagePercent,
      avgCostPerTrade,
      winRate,
    };
  };

  return (
    <div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {traders.map((trader) => {
          const metrics = getTraderMetrics(trader);

          return (
            <div
              key={trader.name}
              className="border border-black dark:border-white border-t-4 p-3 font-mono text-xs"
              style={{ borderTopColor: getLLMColor(trader.name) }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black dark:border-white">
                <LLMIcon llm={trader.name} size={16} />
                <span className="font-bold">{trader.name.toUpperCase()}</span>
                <span className="ml-auto font-bold">
                  ${metrics.currentPortfolio.toFixed(2)}
                </span>
              </div>

              {/* Cash Balance */}
              <div className="flex justify-between mb-2">
                <span className="opacity-60">CASH:</span>
                <span>${trader.current_balance.toFixed(2)}</span>
              </div>

              {/* Positions */}
              {metrics.traderPositions.length > 0 ? (
                <div className="mb-2">
                  <div className="opacity-60 mb-1">POSITIONS:</div>
                  <div className="pl-2 space-y-1">
                    {metrics.traderPositions.map((pos: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <CryptoIcon coin={pos.coin} size={12} />
                          <span className="text-xs">{pos.amount.toFixed(6)} {pos.coin}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs">${pos.current_value.toFixed(2)}</div>
                          <div className={`text-[10px] ${pos.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} ({pos.pnl_percentage >= 0 ? '+' : ''}{pos.pnl_percentage.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 pt-1 border-t border-black dark:border-white opacity-60">
                    <span>TOTAL POSITIONS:</span>
                    <span>${metrics.totalPositionValue.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="opacity-40 mb-2">No active positions</div>
              )}

              {/* Current Portfolio */}
              <div className="flex justify-between font-bold mb-2 pb-2 border-b border-black dark:border-white">
                <span>CURRENT VALUE:</span>
                <span className={metrics.netPnl >= 0 ? 'text-current' : 'opacity-60'}>
                  ${metrics.currentPortfolio.toFixed(2)}
                </span>
              </div>

              {/* Performance Metrics */}
              <div>
                <div className="opacity-60 mb-1">PERFORMANCE:</div>
                <div className="pl-2 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Net P&L (after all costs):</span>
                    <span className={metrics.netPnl >= 0 ? '' : 'opacity-50'}>
                      {metrics.netPnl >= 0 ? '+' : ''}${metrics.netPnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="opacity-80">ROI:</span>
                    <span className={metrics.roi >= 0 ? '' : 'opacity-50'}>
                      {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Trades:</span>
                    <span>
                      {trader.total_trades || 0} ({trader.winning_trades || 0}W / {trader.losing_trades || 0}L)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Win Rate:</span>
                    <span>{metrics.winRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
