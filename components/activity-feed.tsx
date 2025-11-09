'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { LLMIcon } from './llm-icon';
import { CryptoIcon } from './crypto-icon';
import { getLLMColor } from '@/lib/llm-colors';

interface Decision {
  id: string;
  llm_name: string;
  decision_type: 'BUY' | 'SELL' | 'HOLD';
  coin?: string;
  suggested_amount?: number;
  reasoning: string;
  was_executed: boolean;
  created_at: string;
  market_data?: any;
  portfolio_state?: any;
  api_cost?: number;
  token_count?: number;
  prompt_text?: string;
  raw_response?: string;
  confidence?: number;
  profit_target?: number;
  stop_loss_price?: number;
  invalidation_condition?: string;
  risk_usd?: number;
}

interface Position {
  id: string;
  llm_name: string;
  coin: string;
  amount: number;
  entry_price: number;
  current_price: number;
  investment_value: number;
  current_value: number;
  pnl: number;
  pnl_percentage: number;
  trading_fees: number;
  slippage: number;
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

interface CompletedTrade {
  id: string;
  llm_name: string;
  coin: string;
  entry_price: number;
  exit_price: number;
  opened_at: string;
  closed_at: string;
  duration_hours: number;
  amount: number;
  investment_value: number;
  final_value: number;
  pnl: number;
  pnl_percentage: number;
  profit_target_price?: number;
  stop_loss_price?: number;
  exit_reason: 'PROFIT_TARGET_HIT' | 'STOP_LOSS_HIT' | 'MANUAL_EXIT';
  confidence?: number;
  trading_fees: number;
  slippage: number;
  total_costs: number;
  entry_reasoning?: string;
  exit_reasoning?: string;
}

interface ActivityFeedProps {
  decisions: Decision[];
  positions: Position[];
  traders: Trader[];
  completedTrades: CompletedTrade[];
  isRunning: boolean;
  isPaperMode: boolean;
  onToggleRunning: () => void;
  onToggleMode: () => void;
}

export function ActivityFeed({
  decisions,
  positions,
  traders,
  completedTrades,
  isRunning,
  isPaperMode,
  onToggleRunning,
  onToggleMode,
}: ActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<'decisions' | 'prompts' | 'portfolio' | 'history'>('decisions');
  const [selectedLLM, setSelectedLLM] = useState<string>('ALL');
  const [selectedExitPlan, setSelectedExitPlan] = useState<any>(null);

  // Get unique LLMs from decisions
  const uniqueLLMs = Array.from(new Set(decisions.map(d => d.llm_name)));

  // Filter decisions based on selected LLM
  const filteredDecisions = selectedLLM === 'ALL'
    ? decisions
    : decisions.filter(d => d.llm_name === selectedLLM);

  return (
    <div className="w-full h-full flex flex-col font-mono overflow-hidden">
      {/* Controls */}
      <div className="pb-3 px-6 border-b border-black dark:border-white flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">LIVE FEED</h2>
            {isRunning && (
              <span className="px-2 py-1 text-xs font-bold bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white">
                ACTIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMode}
              className="px-2 py-1 text-xs border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              {isPaperMode ? 'PAPER' : 'LIVE'}
            </button>
            <button
              onClick={onToggleRunning}
              className={`px-2 py-1 text-xs border border-black dark:border-white transition-colors ${
                isRunning
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
              }`}
            >
              {isRunning ? 'STOP' : 'START'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-black dark:border-white flex-shrink-0">
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-2 py-2 text-xs font-bold ${
            activeTab === 'decisions'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'opacity-40'
          }`}
        >
          DECISIONS
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-2 py-2 text-xs font-bold ${
            activeTab === 'portfolio'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'opacity-40'
          }`}
        >
          PORTFOLIO ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-2 py-2 text-xs font-bold ${
            activeTab === 'prompts'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'opacity-40'
          }`}
        >
          PROMPTS
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-2 py-2 text-xs font-bold ${
            activeTab === 'history'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'opacity-40'
          }`}
        >
          HISTORY ({completedTrades.length})
        </button>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${activeTab === 'portfolio' ? '' : 'px-6'}`}>
        {activeTab === 'portfolio' ? (
          <div className="flex flex-col h-full px-2">
            {traders.length === 0 ? (
              <p className="text-xs opacity-40 text-center py-4">
                NO TRADERS
              </p>
            ) : (
              (() => {
                // Helper function to find exit plan for a position
                const getExitPlan = (position: any) => {
                  const buyDecision = decisions.find((d: any) =>
                    d.decision_type === 'BUY' &&
                    d.coin === position.coin &&
                    d.llm_name === position.llm_name &&
                    d.was_executed
                  );
                  return {
                    position,
                    entryPrice: position.entry_price,
                    currentPrice: position.current_price,
                    profitTarget: buyDecision?.profit_target,
                    stopLoss: buyDecision?.stop_loss_price,
                    riskUsd: buyDecision?.risk_usd,
                    confidence: buyDecision?.confidence,
                    invested: position.investment_value,
                    amount: position.amount,
                    tradingFees: position.trading_fees || 0,
                    slippage: position.slippage || 0
                  };
                };

                // Determine side (LONG/SHORT) based on decision
                const getPositionSide = (position: any) => {
                  // For now, we'll default to LONG
                  // You can enhance this by looking at decision history
                  return 'LONG';
                };

                // Calculate leverage (estimate from position size vs cash)
                const getLeverage = (position: any, trader: any) => {
                  // Simple estimation: notional / invested
                  // If you have actual leverage data, use that instead
                  return '1X'; // Default, can be calculated
                };

                return (
                  <div className="flex-1 overflow-y-auto space-y-3 pt-3">
                    {/* Exit Plan Modal */}
                    {selectedExitPlan && (
                      <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setSelectedExitPlan(null)}
                      >
                        <div
                          className="bg-white dark:bg-black border-2 border-black dark:border-white p-4 max-w-md w-full mx-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-sm">EXIT PLAN DETAILS</h3>
                            <button
                              onClick={() => setSelectedExitPlan(null)}
                              className="text-xl opacity-60 hover:opacity-100"
                            >
                              ×
                            </button>
                          </div>
                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between">
                              <span className="opacity-60">Entry Price</span>
                              <span className="font-bold">${selectedExitPlan.entryPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Current Price</span>
                              <span className="font-bold">${selectedExitPlan.currentPrice.toFixed(2)}</span>
                            </div>
                            {selectedExitPlan.profitTarget && (
                              <div className="flex justify-between border-t border-black/20 dark:border-white/20 pt-2">
                                <span className="text-green-600">Profit Target</span>
                                <span className="font-bold">${selectedExitPlan.profitTarget.toFixed(2)}</span>
                              </div>
                            )}
                            {selectedExitPlan.stopLoss && (
                              <div className="flex justify-between">
                                <span className="text-red-600">Stop Loss</span>
                                <span className="font-bold">${selectedExitPlan.stopLoss.toFixed(2)}</span>
                              </div>
                            )}
                            {selectedExitPlan.riskUsd && (
                              <div className="flex justify-between border-t border-black/20 dark:border-white/20 pt-2">
                                <span className="opacity-60">Risk Amount</span>
                                <span>${selectedExitPlan.riskUsd.toFixed(2)}</span>
                              </div>
                            )}
                            {selectedExitPlan.confidence && (
                              <div className="flex justify-between">
                                <span className="opacity-60">Confidence</span>
                                <span>{(selectedExitPlan.confidence * 100).toFixed(0)}%</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-black/20 dark:border-white/20 pt-2">
                              <span className="opacity-60">Amount</span>
                              <span>{selectedExitPlan.amount.toFixed(6)} {selectedExitPlan.position.coin}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Invested</span>
                              <span className="font-bold">${selectedExitPlan.invested.toFixed(2)}</span>
                            </div>
                            {(selectedExitPlan.tradingFees > 0 || selectedExitPlan.slippage > 0) && (
                              <>
                                <div className="flex justify-between border-t border-black/20 dark:border-white/20 pt-2 mt-2">
                                  <span className="opacity-60">Trading Fees (Paid at Entry)</span>
                                  <span className="opacity-80">-${selectedExitPlan.tradingFees.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="opacity-60">Slippage (Paid at Entry)</span>
                                  <span className="opacity-80">-${selectedExitPlan.slippage.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                  <span className="opacity-60">Total Entry Costs</span>
                                  <span>-${(selectedExitPlan.tradingFees + selectedExitPlan.slippage).toFixed(4)}</span>
                                </div>
                                <div className="text-[9px] opacity-60 italic mt-1">
                                  ℹ️ These costs are already included in the Entry Price shown above and factored into P&L calculations.
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Portfolio Costs Summary */}
                    {(() => {
                      // Calculate aggregate costs across all traders
                      const portfolioCosts = traders.reduce((acc, trader) => ({
                        totalApiCost: acc.totalApiCost + (trader.total_llm_api_cost || 0),
                        totalApiCalls: acc.totalApiCalls + (trader.llm_call_count || 0),
                        totalTokens: acc.totalTokens + (trader.total_tokens_used || 0),
                        totalTradingFees: acc.totalTradingFees + (trader.total_trading_fees || 0),
                        totalSlippage: acc.totalSlippage + (trader.total_slippage_cost || 0),
                      }), {
                        totalApiCost: 0,
                        totalApiCalls: 0,
                        totalTokens: 0,
                        totalTradingFees: 0,
                        totalSlippage: 0,
                      });

                      const grandTotalCosts = portfolioCosts.totalApiCost +
                                              portfolioCosts.totalTradingFees +
                                              portfolioCosts.totalSlippage;

                      return (
                        <div className="border border-black dark:border-white font-mono">
                          {/* Header */}
                          <div className="px-2 py-1.5 border-b border-black dark:border-white bg-black dark:bg-white text-white dark:text-black">
                            <div className="text-xs font-bold uppercase tracking-wide">
                              Portfolio Costs
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-2 text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="opacity-60">API Costs</span>
                              <div className="flex items-center gap-2">
                                <span className="opacity-40 text-[10px]">
                                  ({portfolioCosts.totalApiCalls} calls)
                                </span>
                                <span className="font-bold">
                                  ${portfolioCosts.totalApiCost.toFixed(3)}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="opacity-60">Tokens Used</span>
                              <span className="font-bold">
                                {portfolioCosts.totalTokens.toLocaleString()} tokens
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="opacity-60">Trading Fees</span>
                              <span className="font-bold">
                                ${portfolioCosts.totalTradingFees.toFixed(3)}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="opacity-60">Slippage</span>
                              <span className="font-bold">
                                ${portfolioCosts.totalSlippage.toFixed(3)}
                              </span>
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center pt-1 mt-1 border-t border-black dark:border-white">
                              <span className="font-bold uppercase">Total Costs</span>
                              <span className="font-bold">
                                ${grandTotalCosts.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Traders and Positions */}
                    {traders.map((trader) => {
                      const traderPositions = positions.filter((p: any) => p.llm_name === trader.name);

                      // Calculate unrealized P&L from open positions
                      const unrealizedPnL = traderPositions.reduce((sum, p) => sum + p.pnl, 0);

                      // Calculate total portfolio value (balance + position values)
                      const totalPositionValue = traderPositions.reduce((sum, p) => sum + p.current_value, 0);
                      const totalPortfolioValue = trader.current_balance + totalPositionValue;

                      // Total P&L (includes both realized and unrealized, costs already deducted from balance)
                      const totalPnL = totalPortfolioValue - trader.initial_balance;

                      return (
                        <div key={trader.name} className="border border-black dark:border-white">
                          {/* Trader Header */}
                          <div className="flex items-center justify-between px-2 py-1.5 border-b border-black dark:border-white bg-gray-100 dark:bg-gray-900">
                            <div className="flex items-center gap-1.5">
                              <LLMIcon llm={trader.name} size={16} />
                              <span className="font-bold text-xs">{trader.name.toUpperCase()}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] opacity-60">TOTAL P&L:</div>
                              <div className={`font-bold text-xs ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Trader Costs Breakdown */}
                          {(() => {
                            const traderTotalCosts = (trader.total_llm_api_cost || 0) +
                                                     (trader.total_trading_fees || 0) +
                                                     (trader.total_slippage_cost || 0);

                            // Costs are already deducted from balance, so no need to subtract again
                            // This shows breakdown of what costs were incurred (for informational purposes)

                            return (
                              <div className="px-2 py-2 border-b border-black dark:border-white bg-gray-50 dark:bg-gray-950">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                  {/* Left Column */}
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between items-center">
                                      <span className="opacity-60">API Costs</span>
                                      <span className="font-mono">
                                        ${(trader.total_llm_api_cost || 0).toFixed(3)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="opacity-60">API Calls</span>
                                      <span className="font-mono">
                                        {trader.llm_call_count || 0}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="opacity-60">Tokens</span>
                                      <span className="font-mono">
                                        {(trader.total_tokens_used || 0).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right Column */}
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between items-center">
                                      <span className="opacity-60">Trading Fees</span>
                                      <span className="font-mono">
                                        ${(trader.total_trading_fees || 0).toFixed(3)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="opacity-60">Slippage</span>
                                      <span className="font-mono">
                                        ${(trader.total_slippage_cost || 0).toFixed(3)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="opacity-60 font-bold">Total Costs</span>
                                      <span className="font-mono font-bold">
                                        ${traderTotalCosts.toFixed(3)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* P&L Breakdown */}
                                <div className="mt-1.5 pt-1.5 border-t border-black/20 dark:border-white/20 space-y-0.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] opacity-60">Realized P&L</span>
                                    <span className={`text-[10px] font-mono ${(trader.total_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {(trader.total_pnl || 0) >= 0 ? '+' : ''}${(trader.total_pnl || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] opacity-60">Unrealized P&L</span>
                                    <span className={`text-[10px] font-mono ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center pt-0.5 border-t border-black/10 dark:border-white/10">
                                    <span className="text-[10px] font-bold uppercase">Total P&L (Net)</span>
                                    <span className={`font-bold text-xs font-mono ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Positions Table */}
                          {traderPositions.length === 0 ? (
                            <div className="p-2 text-center text-xs opacity-60">
                              No positions
                            </div>
                          ) : (
                            <>
                              {/* Table Header */}
                              <div className="grid grid-cols-[40px_60px_50px_50px_55px_45px_1fr] gap-1 px-2 py-1 text-[10px] font-bold border-b border-black dark:border-white bg-gray-50 dark:bg-gray-900 uppercase">
                                <div>SIDE</div>
                                <div>COIN</div>
                                <div>ENTRY</div>
                                <div>CURR</div>
                                <div>SIZE</div>
                                <div>EXIT</div>
                                <div className="text-right">P&L</div>
                              </div>

                              {/* Table Rows */}
                              {traderPositions.map((position) => {
                                const side = getPositionSide(position);
                                const leverage = getLeverage(position, trader);
                                const priceChange = ((position.current_price - position.entry_price) / position.entry_price) * 100;

                                return (
                                  <div
                                    key={position.id}
                                    className="grid grid-cols-[40px_60px_50px_50px_55px_45px_1fr] gap-1 px-2 py-1 text-xs border-b border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-900"
                                  >
                                    {/* SIDE */}
                                    <div className={`font-bold text-[10px] ${side === 'LONG' ? 'text-green-600' : 'text-red-600'}`}>
                                      {side}
                                    </div>

                                    {/* COIN */}
                                    <div className="flex items-center gap-1">
                                      <CryptoIcon coin={position.coin} size={12} />
                                      <span className="text-[11px]">{position.coin}</span>
                                    </div>

                                    {/* ENTRY PRICE */}
                                    <div className="text-[10px] opacity-60">
                                      ${position.entry_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>

                                    {/* CURRENT PRICE */}
                                    <div className={`text-[10px] ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ${position.current_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>

                                    {/* SIZE (current value) */}
                                    <div className="text-[11px]">${position.current_value.toFixed(0)}</div>

                                    {/* EXIT PLAN */}
                                    <div>
                                      <button
                                        onClick={() => setSelectedExitPlan(getExitPlan(position))}
                                        className="px-1.5 py-0.5 text-[10px] border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                                      >
                                        VIEW
                                      </button>
                                    </div>

                                    {/* UNREAL P&L */}
                                    <div className={`text-right font-bold text-[11px] ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                                      <div className="text-[9px] opacity-60">
                                        ({position.pnl_percentage >= 0 ? '+' : ''}{position.pnl_percentage.toFixed(1)}%)
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Available Cash Footer */}
                              <div className="px-2 py-1 text-[10px] bg-gray-100 dark:bg-gray-900">
                                <span className="font-bold">CASH: ${trader.current_balance.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        ) : activeTab === 'decisions' ? (
          <div className="flex flex-col h-full">
            {/* LLM Filter Bar */}
            <div className="flex gap-2 mb-3 pt-3 flex-wrap">
              <button
                onClick={() => setSelectedLLM('ALL')}
                className={`px-2 py-1 text-xs font-bold border border-black dark:border-white transition-colors ${
                  selectedLLM === 'ALL'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                }`}
              >
                ALL ({decisions.length})
              </button>
              {uniqueLLMs.map((llm) => {
                const llmCount = decisions.filter(d => d.llm_name === llm).length;
                return (
                  <button
                    key={llm}
                    onClick={() => setSelectedLLM(llm)}
                    className={`px-2 py-1 text-xs font-bold border border-black dark:border-white transition-colors flex items-center gap-1 ${
                      selectedLLM === llm
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                    }`}
                  >
                    <LLMIcon llm={llm} size={12} />
                    {llm.toUpperCase()} ({llmCount})
                  </button>
                );
              })}
            </div>

            {/* Chat-style Decisions Feed */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {filteredDecisions.length === 0 ? (
                <p className="text-xs opacity-40 text-center py-4">
                  {selectedLLM === 'ALL' ? 'NO DECISIONS YET' : `NO DECISIONS FROM ${selectedLLM}`}
                </p>
              ) : (
                filteredDecisions.map((decision) => {
                  // Determine decision type styling
                  const isBuy = decision.decision_type === 'BUY';
                  const isSell = decision.decision_type === 'SELL';

                  return (
                    <div
                      key={decision.id}
                      className="bg-gray-50 dark:bg-gray-900 p-3 border-l-4 break-words"
                      style={{ borderLeftColor: getLLMColor(decision.llm_name) }}
                    >
                      {/* Message Header */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className="mt-0.5">
                          <LLMIcon llm={decision.llm_name} size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs">{decision.llm_name}</span>
                              <span className={`px-1.5 py-0.5 text-xs font-bold border border-black dark:border-white ${
                                isBuy ? 'bg-green-600 text-white' :
                                isSell ? 'bg-red-600 text-white' :
                                'bg-gray-400 text-white'
                              }`}>
                                {decision.decision_type}
                              </span>
                              {decision.coin && (
                                <div className="flex items-center gap-1">
                                  <CryptoIcon coin={decision.coin} size={14} />
                                  <span className="font-bold text-xs">{decision.coin}</span>
                                </div>
                              )}
                              {decision.was_executed && (
                                <span className="px-1.5 py-0.5 text-xs font-bold bg-black dark:bg-white text-white dark:text-black">
                                  ✓ EXECUTED
                                </span>
                              )}
                            </div>
                            <span className="text-xs opacity-60 whitespace-nowrap">
                              {format(new Date(decision.created_at), 'HH:mm:ss')}
                            </span>
                          </div>

                          {/* Trading Details */}
                          {(decision.suggested_amount || decision.confidence || decision.profit_target || decision.stop_loss_price) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-xs opacity-80">
                              {decision.suggested_amount && (
                                <span>Amount: ${decision.suggested_amount.toFixed(2)}</span>
                              )}
                              {decision.confidence !== undefined && (
                                <span>Confidence: {(decision.confidence * 100).toFixed(0)}%</span>
                              )}
                              {decision.profit_target && (
                                <span>Target: ${decision.profit_target.toFixed(2)}</span>
                              )}
                              {decision.stop_loss_price && (
                                <span>Stop Loss: ${decision.stop_loss_price.toFixed(2)}</span>
                              )}
                              {decision.risk_usd && (
                                <span>Risk: ${decision.risk_usd.toFixed(2)}</span>
                              )}
                            </div>
                          )}

                          {/* Reasoning */}
                          <p className="text-xs leading-relaxed opacity-90">
                            {decision.reasoning}
                          </p>

                          {/* Footer Metadata */}
                          {(decision.api_cost !== undefined && decision.api_cost > 0) || (decision.token_count !== undefined && decision.token_count > 0) ? (
                            <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs opacity-60">
                              {decision.api_cost !== undefined && decision.api_cost > 0 && (
                                <span>API Cost: ${decision.api_cost.toFixed(4)}</span>
                              )}
                              {decision.token_count !== undefined && decision.token_count > 0 && (
                                <span className="ml-2">
                                  ({decision.token_count.toLocaleString()} tokens)
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : activeTab === 'history' ? (
          <div className="flex flex-col h-full">
            {/* Filter Bar */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={() => setSelectedLLM('ALL')}
                className={`px-2 py-1 text-xs font-bold border border-black dark:border-white transition-colors ${
                  selectedLLM === 'ALL'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                }`}
              >
                ALL ({completedTrades.length})
              </button>
              {uniqueLLMs.map((llm) => {
                const llmCount = completedTrades.filter(t => t.llm_name === llm).length;
                return (
                  <button
                    key={llm}
                    onClick={() => setSelectedLLM(llm)}
                    className={`px-2 py-1 text-xs font-bold border border-black dark:border-white transition-colors flex items-center gap-1 ${
                      selectedLLM === llm
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                    }`}
                  >
                    <LLMIcon llm={llm} size={12} />
                    {llm.toUpperCase()} ({llmCount})
                  </button>
                );
              })}
            </div>

            {/* Summary Statistics */}
            {(() => {
              const filteredTrades = selectedLLM === 'ALL'
                ? completedTrades
                : completedTrades.filter(t => t.llm_name === selectedLLM);

              const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
              const winningTrades = filteredTrades.filter(t => t.pnl > 0).length;
              const losingTrades = filteredTrades.filter(t => t.pnl < 0).length;
              const winRate = filteredTrades.length > 0
                ? (winningTrades / filteredTrades.length * 100).toFixed(1)
                : '0.0';
              const avgDuration = filteredTrades.length > 0
                ? (filteredTrades.reduce((sum, t) => sum + t.duration_hours, 0) / filteredTrades.length).toFixed(1)
                : '0.0';
              const totalCosts = filteredTrades.reduce((sum, t) => sum + t.total_costs, 0);

              return (
                <div className="border border-black dark:border-white mb-3 p-2 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="opacity-60">Total P&L</div>
                      <div className={`font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-60">Win Rate</div>
                      <div className="font-bold">{winRate}% ({winningTrades}W / {losingTrades}L)</div>
                    </div>
                    <div>
                      <div className="opacity-60">Avg Duration</div>
                      <div className="font-bold">{avgDuration} hours</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-black/20 dark:border-white/20">
                    <div className="flex justify-between">
                      <span className="opacity-60">Total Costs</span>
                      <span className="font-bold">${totalCosts.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Completed Trades Table */}
            <div className="flex-1 overflow-y-auto">
              {completedTrades.length === 0 ? (
                <p className="text-xs opacity-40 text-center py-4">
                  NO COMPLETED TRADES YET
                </p>
              ) : (
                <div className="border border-black dark:border-white">
                  {/* Table Header */}
                  <div className="grid grid-cols-[80px_60px_50px_50px_60px_70px_1fr] gap-1 px-2 py-1 text-[10px] font-bold border-b border-black dark:border-white bg-gray-50 dark:bg-gray-900 uppercase sticky top-0">
                    <div>TRADER</div>
                    <div>COIN</div>
                    <div>ENTRY</div>
                    <div>EXIT</div>
                    <div>DURATION</div>
                    <div>EXIT TYPE</div>
                    <div className="text-right">P&L</div>
                  </div>

                  {/* Table Rows */}
                  {(selectedLLM === 'ALL' ? completedTrades : completedTrades.filter(t => t.llm_name === selectedLLM))
                    .map((trade) => {
                      const durationDisplay = trade.duration_hours < 24
                        ? `${trade.duration_hours.toFixed(1)}h`
                        : `${(trade.duration_hours / 24).toFixed(1)}d`;

                      return (
                        <div
                          key={trade.id}
                          className="grid grid-cols-[80px_60px_50px_50px_60px_70px_1fr] gap-1 px-2 py-2 text-xs border-b border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                        >
                          {/* TRADER */}
                          <div className="flex items-center gap-1">
                            <LLMIcon llm={trade.llm_name} size={12} />
                            <span className="text-[10px]">{trade.llm_name}</span>
                          </div>

                          {/* COIN */}
                          <div className="flex items-center gap-1">
                            <CryptoIcon coin={trade.coin} size={12} />
                            <span className="text-[11px]">{trade.coin}</span>
                          </div>

                          {/* ENTRY PRICE */}
                          <div className="text-[10px] opacity-60">
                            ${trade.entry_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>

                          {/* EXIT PRICE */}
                          <div className={`text-[10px] ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${trade.exit_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>

                          {/* DURATION */}
                          <div className="text-[10px] opacity-60">{durationDisplay}</div>

                          {/* EXIT TYPE */}
                          <div className={`text-[9px] font-bold ${
                            trade.exit_reason === 'PROFIT_TARGET_HIT' ? 'text-green-600' :
                            trade.exit_reason === 'STOP_LOSS_HIT' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {trade.exit_reason === 'PROFIT_TARGET_HIT' ? '🎯 TARGET' :
                             trade.exit_reason === 'STOP_LOSS_HIT' ? '🛑 STOP' :
                             '✋ MANUAL'}
                          </div>

                          {/* P&L */}
                          <div className={`text-right font-bold text-[11px] ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            <div className="text-[9px] opacity-60">
                              ({trade.pnl_percentage >= 0 ? '+' : ''}{trade.pnl_percentage.toFixed(1)}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 min-w-0">
            {decisions.length === 0 ? (
              <p className="text-xs opacity-40 text-center py-4">
                NO PROMPTS YET
              </p>
            ) : (
              decisions.slice(0, 5).map((decision) => (
                <div
                  key={decision.id}
                  className="border-2 border-black dark:border-white p-3 text-xs break-words"
                >
                  <div className="flex justify-between items-start mb-3 pb-2 border-b border-black dark:border-white">
                    <div className="flex items-center gap-1">
                      <LLMIcon llm={decision.llm_name} size={16} />
                      <span className="font-bold">{decision.llm_name.toUpperCase()}</span>
                      <span className="mx-2 opacity-60">→</span>
                      <span className="font-bold">{decision.decision_type}</span>
                      {decision.coin && <span className="font-bold"> {decision.coin}</span>}
                    </div>
                    <span className="opacity-60">
                      {format(new Date(decision.created_at), 'HH:mm:ss')}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Full Prompt Sent to LLM */}
                    <details className="cursor-pointer">
                      <summary className="font-bold mb-2 opacity-80 hover:opacity-100">
                        📤 PROMPT SENT TO LLM (Click to expand)
                      </summary>
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 border border-black dark:border-white">
                        <pre className="text-xs opacity-80 whitespace-pre-wrap font-mono overflow-x-auto max-h-96 overflow-y-auto">
                          {decision.prompt_text || 'No prompt text available'}
                        </pre>
                      </div>
                    </details>

                    {/* Raw Response from LLM */}
                    <details className="cursor-pointer">
                      <summary className="font-bold mb-2 opacity-80 hover:opacity-100 border-t border-black dark:border-white pt-3">
                        📥 RAW RESPONSE FROM LLM (Click to expand)
                      </summary>
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 border border-black dark:border-white">
                        <pre className="text-xs opacity-80 whitespace-pre-wrap font-mono overflow-x-auto max-h-96 overflow-y-auto">
                          {decision.raw_response || 'No response available'}
                        </pre>
                      </div>
                    </details>

                    {/* Decision Summary */}
                    <div className="border-t border-black dark:border-white pt-3">
                      <div className="font-bold mb-2 opacity-60">📊 DECISION SUMMARY:</div>
                      <div className="opacity-80 space-y-1">
                        <div><strong>Action:</strong> {decision.decision_type}</div>
                        {decision.coin && <div><strong>Coin:</strong> {decision.coin}</div>}
                        {decision.suggested_amount && <div><strong>Amount:</strong> ${decision.suggested_amount.toFixed(2)}</div>}
                        {decision.was_executed && <div className="text-green-600 dark:text-green-400">✓ Executed</div>}
                        <div className="mt-2"><strong>Reasoning:</strong> {decision.reasoning}</div>
                      </div>
                    </div>

                    {/* Optional: Show Market Data & Portfolio (collapsed by default) */}
                    <details className="cursor-pointer">
                      <summary className="font-bold mb-2 opacity-60 hover:opacity-80 border-t border-black dark:border-white pt-3">
                        🔍 RAW INPUT DATA (Click to expand)
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <div className="font-bold mb-1 opacity-60 text-xs">Market Data:</div>
                          <pre className="text-xs opacity-70 whitespace-pre-wrap font-mono overflow-x-auto bg-gray-50 dark:bg-gray-900 p-2 border border-gray-300 dark:border-gray-700 max-h-48 overflow-y-auto">
                            {decision.market_data
                              ? JSON.stringify(decision.market_data, null, 2)
                              : 'No data'}
                          </pre>
                        </div>
                        <div>
                          <div className="font-bold mb-1 opacity-60 text-xs">Portfolio State:</div>
                          <pre className="text-xs opacity-70 whitespace-pre-wrap font-mono overflow-x-auto bg-gray-50 dark:bg-gray-900 p-2 border border-gray-300 dark:border-gray-700 max-h-48 overflow-y-auto">
                            {decision.portfolio_state
                              ? JSON.stringify(decision.portfolio_state, null, 2)
                              : 'No data'}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
