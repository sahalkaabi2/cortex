'use client';

import { PredictionData } from '@/lib/types';
import { format } from 'date-fns';

interface PredictionTooltipProps {
  prediction: PredictionData;
  position: { x: number; y: number };
}

export function PredictionTooltip({ prediction, position }: PredictionTooltipProps) {
  const getActionColor = (action: 'BUY' | 'SELL' | 'HOLD') => {
    switch (action) {
      case 'BUY':
        return 'text-green-600 dark:text-green-400';
      case 'SELL':
        return 'text-red-600 dark:text-red-400';
      case 'HOLD':
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(10px, -50%)',
      }}
    >
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white shadow-lg max-w-md">
        {/* Header */}
        <div className="px-3 py-2 border-b border-black dark:border-white bg-black dark:bg-white text-white dark:text-black">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold">
              {prediction.llm_name} · {prediction.coin}
            </span>
            <span className={`text-xs font-bold ${getActionColor(prediction.action)}`}>
              {prediction.action}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-3 py-3 space-y-2 text-xs">
          {/* Confidence */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold opacity-70">CONFIDENCE</span>
              <span className="font-bold">{confidencePercent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 border border-black dark:border-white">
              <div
                className="h-full bg-black dark:bg-white"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>

          {/* Current Price */}
          <div className="flex items-center justify-between">
            <span className="font-bold opacity-70">CURRENT PRICE</span>
            <span className="font-mono">${prediction.current_price.toLocaleString()}</span>
          </div>

          {/* Price Targets (only for BUY) */}
          {prediction.action === 'BUY' && (
            <>
              {prediction.profit_target && (
                <div className="flex items-center justify-between">
                  <span className="font-bold opacity-70">PROFIT TARGET</span>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    ${prediction.profit_target.toLocaleString()}
                  </span>
                </div>
              )}
              {prediction.stop_loss_price && (
                <div className="flex items-center justify-between">
                  <span className="font-bold opacity-70">STOP LOSS</span>
                  <span className="font-mono text-red-600 dark:text-red-400">
                    ${prediction.stop_loss_price.toLocaleString()}
                  </span>
                </div>
              )}
              {prediction.suggested_amount && (
                <div className="flex items-center justify-between">
                  <span className="font-bold opacity-70">SUGGESTED AMOUNT</span>
                  <span className="font-mono">${prediction.suggested_amount.toLocaleString()}</span>
                </div>
              )}
            </>
          )}

          {/* Reasoning */}
          <div className="pt-2 border-t border-black dark:border-white">
            <div className="font-bold opacity-70 mb-1">REASONING</div>
            <div className="text-xs leading-relaxed opacity-80 max-h-32 overflow-y-auto">
              {prediction.reasoning || 'No reasoning provided'}
            </div>
          </div>

          {/* Timestamp */}
          <div className="pt-2 border-t border-black dark:border-white">
            <div className="flex items-center justify-between opacity-60">
              <span className="font-bold">TIME</span>
              <span className="font-mono">
                {format(new Date(prediction.created_at), 'MMM dd, HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
