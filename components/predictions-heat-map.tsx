'use client';

import { useState } from 'react';
import { PredictionData, LLM_PROVIDERS, CRYPTO_PAIRS } from '@/lib/types';
import { PredictionTooltip } from './prediction-tooltip';
import { LLMIcon } from './llm-icon';
import { CryptoIcon } from './crypto-icon';

interface PredictionsHeatMapProps {
  predictions: PredictionData[];
}

export function PredictionsHeatMap({ predictions }: PredictionsHeatMapProps) {
  const [hoveredPrediction, setHoveredPrediction] = useState<PredictionData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Create a map for quick lookup: llm_name-coin -> prediction
  const predictionMap = new Map<string, PredictionData>();
  predictions.forEach((pred) => {
    predictionMap.set(`${pred.llm_name}-${pred.coin}`, pred);
  });

  const getActionColor = (action: 'BUY' | 'SELL' | 'HOLD', confidence: number) => {
    const opacity = Math.max(0.3, confidence); // Minimum 30% opacity

    switch (action) {
      case 'BUY':
        return `rgba(34, 197, 94, ${opacity})`; // Green
      case 'SELL':
        return `rgba(239, 68, 68, ${opacity})`; // Red
      case 'HOLD':
        return `rgba(156, 163, 175, ${opacity})`; // Gray
    }
  };

  const handleMouseEnter = (prediction: PredictionData, e: React.MouseEvent) => {
    setHoveredPrediction(prediction);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right,
      y: rect.top + rect.height / 2,
    });
  };

  const handleMouseLeave = () => {
    setHoveredPrediction(null);
  };

  return (
    <div className="relative">
      {/* Grid Container */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full border-2 border-black dark:border-white">
          {/* Header Row - Coin Symbols */}
          <div className="grid grid-cols-6 border-b-2 border-black dark:border-white bg-gray-100 dark:bg-gray-900">
            <div className="p-3 border-r-2 border-black dark:border-white">
              <span className="text-xs font-bold">LLM / COIN</span>
            </div>
            {CRYPTO_PAIRS.map((coin) => (
              <div
                key={coin}
                className="p-3 border-r-2 last:border-r-0 border-black dark:border-white flex items-center justify-center gap-2"
              >
                <CryptoIcon coin={coin} size={20} />
                <span className="text-xs font-bold">{coin}</span>
              </div>
            ))}
          </div>

          {/* Data Rows - One per LLM */}
          {LLM_PROVIDERS.map((llm) => (
            <div
              key={llm}
              className="grid grid-cols-6 border-b last:border-b-0 border-black dark:border-white"
            >
              {/* LLM Label Cell */}
              <div className="p-3 border-r-2 border-black dark:border-white bg-gray-50 dark:bg-gray-950 flex items-center gap-2">
                <LLMIcon provider={llm} size={20} />
                <span className="text-xs font-bold">{llm}</span>
              </div>

              {/* Prediction Cells */}
              {CRYPTO_PAIRS.map((coin) => {
                const prediction = predictionMap.get(`${llm}-${coin}`);

                if (!prediction) {
                  // No prediction available
                  return (
                    <div
                      key={coin}
                      className="p-3 border-r last:border-r-0 border-black dark:border-white bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-all duration-300 ease-in-out"
                    >
                      <span className="text-xs opacity-30 transition-opacity duration-300">N/A</span>
                    </div>
                  );
                }

                // Calculate data age
                const ageMs = Date.now() - new Date(prediction.created_at).getTime();
                const ageHours = ageMs / (1000 * 60 * 60);

                // Determine opacity and border style based on age
                let cellOpacity = 1;
                let borderStyle = '';
                if (ageHours > 6) {
                  cellOpacity = 0.6;
                  borderStyle = 'border-dashed';
                } else if (ageHours > 1) {
                  cellOpacity = 0.8;
                }

                const bgColor = getActionColor(prediction.action, prediction.confidence * cellOpacity);

                // Format timestamp
                const timeString = new Date(prediction.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={coin}
                    className={`p-2 border-r last:border-r-0 border-black dark:border-white cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 relative group ${borderStyle}`}
                    style={{ backgroundColor: bgColor }}
                    onMouseEnter={(e) => handleMouseEnter(prediction, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5 transition-opacity duration-300">
                      <span className="text-xs font-bold text-black dark:text-white transition-colors duration-300">
                        {prediction.action}
                      </span>
                      <span className="text-xs opacity-70 text-black dark:text-white transition-opacity duration-300">
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                      <span className="text-[10px] opacity-50 text-black dark:text-white font-mono transition-opacity duration-300">
                        {timeString}
                      </span>
                    </div>

                    {/* Hover border effect */}
                    <div className="absolute inset-0 border-2 border-black dark:border-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredPrediction && (
        <PredictionTooltip prediction={hoveredPrediction} position={tooltipPosition} />
      )}
    </div>
  );
}
