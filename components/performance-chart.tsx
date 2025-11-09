'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LLMIcon } from './llm-icon';
import { getLLMColor } from '@/lib/llm-colors';
import { format } from 'date-fns';

interface PerformanceData {
  timestamp: string;
  OpenAI: number;
  Claude: number;
  DeepSeek: number;
  Qwen: number;
  BuyAndHold: number;
}

interface Trader {
  name: string;
  total_llm_api_cost?: number;
  total_tokens_used?: number;
  total_trading_fees?: number;
  total_slippage_cost?: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
  traders?: Trader[];
  sessionStartTime?: string;
}

export function PerformanceChart({ data, traders = [], sessionStartTime }: PerformanceChartProps) {
  // Calculate dynamic Y-axis domain with padding
  const yAxisDomain = useMemo(() => {
    if (data.length === 0) return [95, 105];

    const allValues: number[] = [];
    data.forEach((point) => {
      allValues.push(point.OpenAI, point.Claude, point.DeepSeek, point.Qwen, point.BuyAndHold);
    });

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    // Add 10% padding above max and below min for better visibility
    const range = maxValue - minValue;
    const padding = Math.max(range * 0.1, 5); // At least $5 padding

    const domainMin = Math.floor(minValue - padding);
    const domainMax = Math.ceil(maxValue + padding);

    return [domainMin, domainMax];
  }, [data]);

  return (
    <div className="w-full h-full">
      <div className="mb-4 border-b border-black dark:border-white pb-2">
        <h2 className="text-sm font-bold font-mono">
          PERFORMANCE COMPARISON
        </h2>
        {sessionStartTime && (
          <p className="text-xs font-mono opacity-60 mt-1">
            Session started: {format(new Date(sessionStartTime), 'MMM d, yyyy h:mm a')}
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="0" stroke="currentColor" strokeWidth={0.5} opacity={0.2} />
          <XAxis
            dataKey="timestamp"
            stroke="currentColor"
            tick={{ fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
          />
          <YAxis
            domain={yAxisDomain}
            stroke="currentColor"
            tick={{ fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            label={{
              value: 'VALUE ($)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 10, fontFamily: 'monospace' }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid currentColor',
              borderRadius: 0,
              fontFamily: 'monospace',
              fontSize: 11,
            }}
            formatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          />

          <Line
            type="monotone"
            dataKey="OpenAI"
            stroke={getLLMColor('OpenAI')}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Claude"
            stroke={getLLMColor('Claude')}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="DeepSeek"
            stroke={getLLMColor('DeepSeek')}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Qwen"
            stroke={getLLMColor('Qwen')}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="BuyAndHold"
            stroke={getLLMColor('BuyAndHold')}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            opacity={0.6}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Current Values Summary */}
      <div className="mt-4 grid grid-cols-5 gap-3 border-t border-black dark:border-white pt-3">
        {['OpenAI', 'Claude', 'DeepSeek', 'Qwen', 'BuyAndHold'].map((name) => {
          const latestValue = data.length > 0 ? data[data.length - 1][name as keyof PerformanceData] : 100;
          const pnl = typeof latestValue === 'number' ? latestValue - 100 : 0;
          const pnlPercent = ((pnl / 100) * 100).toFixed(2);

          // Get trader cost data
          const trader = traders.find((t) => t.name === name);
          const totalCosts = trader
            ? (trader.total_llm_api_cost || 0) + (trader.total_trading_fees || 0) + (trader.total_slippage_cost || 0)
            : 0;

          return (
            <div key={name} className="text-center font-mono">
              <div className="text-xs font-bold opacity-60 flex items-center justify-center gap-1">
                {/* Color indicator bar */}
                <div
                  className="w-1 h-4 rounded-sm"
                  style={{ backgroundColor: getLLMColor(name) }}
                />
                {name !== 'BuyAndHold' && <LLMIcon llm={name} size={14} />}
                {name === 'BuyAndHold' ? 'B&H' : name.toUpperCase()}
              </div>
              <div className="text-sm font-bold">
                ${typeof latestValue === 'number' ? latestValue.toFixed(2) : '100.00'}
              </div>
              <div className="text-xs">
                {pnl >= 0 ? '+' : ''}{pnlPercent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
