'use client';

import { useState, useEffect } from 'react';
import { PlaceholderTooltip } from './placeholder-tooltip';

interface FieldChip {
  name: string;
  placeholder: string;
  description: string;
  category: 'base' | 'technical' | 'intraday' | 'long_term';
  healthStatus?: 'optimal' | 'wasted' | 'error' | 'future';
  retrievedFromBinance?: boolean;
  usedInPrompt?: boolean;
  promptLocation?: string | null;
}

const AVAILABLE_FIELDS: FieldChip[] = [
  // Composite Fields
  {
    name: 'Market Data (All Coins)',
    placeholder: '{{MARKET_DATA}}',
    description: 'Complete market data for all tracked coins (composite placeholder)',
    category: 'base',
  },
  {
    name: 'Positions (All Open)',
    placeholder: '{{POSITIONS}}',
    description: 'All current open positions with P&L (composite placeholder)',
    category: 'base',
  },

  // Account/Portfolio Fields
  {
    name: 'Minutes Trading',
    placeholder: '{{MINUTES}}',
    description: 'Minutes since trading session started',
    category: 'base',
  },
  {
    name: 'Balance',
    placeholder: '{{BALANCE}}',
    description: 'Available cash balance',
    category: 'base',
  },
  {
    name: 'Account Value',
    placeholder: '{{ACCOUNT_VALUE}}',
    description: 'Total account value (cash + positions)',
    category: 'base',
  },
  {
    name: 'Position Count',
    placeholder: '{{POSITION_COUNT}}',
    description: 'Number of open positions',
    category: 'base',
  },
  {
    name: 'Total Return',
    placeholder: '{{TOTAL_RETURN_PERCENT}}',
    description: 'Total return percentage since start',
    category: 'base',
  },
  {
    name: 'Sharpe Ratio',
    placeholder: '{{SHARPE_RATIO}}',
    description: 'Risk-adjusted return metric',
    category: 'base',
  },

  // Base Market Data (1H timeframe)
  {
    name: 'Coin Symbol',
    placeholder: '{{coin}}',
    description: 'Coin symbol (BTC, ETH, etc.)',
    category: 'base',
  },
  {
    name: 'Current Price',
    placeholder: '{{price}}',
    description: 'Current market price',
    category: 'base',
  },
  {
    name: '24H Volume',
    placeholder: '{{volume_24h}}',
    description: '24-hour trading volume',
    category: 'base',
  },
  {
    name: '24H Price Change',
    placeholder: '{{price_change_24h}}',
    description: '24-hour price change percentage',
    category: 'base',
  },

  // Technical Indicators (1H timeframe)
  {
    name: 'EMA 12',
    placeholder: '{{ema_12}}',
    description: '12-period exponential moving average',
    category: 'technical',
  },
  {
    name: 'EMA 20',
    placeholder: '{{ema_20}}',
    description: '20-period exponential moving average',
    category: 'technical',
  },
  {
    name: 'EMA 26',
    placeholder: '{{ema_26}}',
    description: '26-period exponential moving average',
    category: 'technical',
  },
  {
    name: 'EMA 50',
    placeholder: '{{ema_50}}',
    description: '50-period exponential moving average',
    category: 'technical',
  },
  {
    name: 'RSI 7',
    placeholder: '{{rsi_7}}',
    description: '7-period RSI (short-term momentum)',
    category: 'technical',
  },
  {
    name: 'RSI 14',
    placeholder: '{{rsi_14}}',
    description: '14-period RSI (standard momentum)',
    category: 'technical',
  },
  {
    name: 'MACD',
    placeholder: '{{macd}}',
    description: 'MACD indicator (trend strength)',
    category: 'technical',
  },
  {
    name: 'MACD Signal',
    placeholder: '{{macd_signal}}',
    description: 'MACD signal line',
    category: 'technical',
  },

  // Intraday Multi-Timeframe (3-min intervals)
  {
    name: 'Price History 3M',
    placeholder: '{{price_history_3m}}',
    description: 'Last 10 prices at 3-min intervals (oldest → newest)',
    category: 'intraday',
  },
  {
    name: 'RSI History 3M',
    placeholder: '{{rsi_history_3m}}',
    description: 'Last 10 RSI-7 values at 3-min intervals',
    category: 'intraday',
  },
  {
    name: 'EMA History 3M',
    placeholder: '{{ema_history_3m}}',
    description: 'Last 10 EMA-20 values at 3-min intervals',
    category: 'intraday',
  },

  // Long-Term Context (4H timeframe)
  {
    name: 'Price 4H',
    placeholder: '{{price_4h}}',
    description: '4-hour timeframe price',
    category: 'long_term',
  },
  {
    name: 'Volume 4H',
    placeholder: '{{volume_4h}}',
    description: '4-hour timeframe volume',
    category: 'long_term',
  },
  {
    name: 'RSI 4H',
    placeholder: '{{rsi_4h}}',
    description: '4-hour timeframe RSI-14',
    category: 'long_term',
  },
  {
    name: 'MACD 4H',
    placeholder: '{{macd_4h}}',
    description: '4-hour timeframe MACD',
    category: 'long_term',
  },
];

const CATEGORY_LABELS = {
  base: 'Base Market Data & Account',
  technical: 'Technical Indicators',
  intraday: 'Intraday Multi-Timeframe',
  long_term: 'Long-Term Context (4H)',
};

const CATEGORY_COLORS = {
  base: 'bg-blue-100 text-blue-700 border-blue-300',
  technical: 'bg-green-100 text-green-700 border-green-300',
  intraday: 'bg-purple-100 text-purple-700 border-purple-300',
  long_term: 'bg-orange-100 text-orange-700 border-orange-300',
};

export function FieldChipsPanel() {
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldsWithHealth, setFieldsWithHealth] = useState<FieldChip[]>(AVAILABLE_FIELDS);
  const [filterStatus, setFilterStatus] = useState<'all' | 'optimal' | 'issues'>('all');
  const [healthStats, setHealthStats] = useState<any>(null);

  // Fetch health monitor data
  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/prompt-metadata');
      const data = await response.json();

      if (data.success && data.field_metadata) {
        console.log('[FIELD CHIPS] Health metadata received:', Object.keys(data.field_metadata).length, 'fields');

        // Merge health data with field definitions
        const enhancedFields = AVAILABLE_FIELDS.map(field => {
          const fieldKey = field.placeholder.replace(/[{}]/g, ''); // {{price}} → price, {{BALANCE}} → BALANCE
          const healthData = data.field_metadata[fieldKey];

          if (healthData) {
            let status: 'optimal' | 'wasted' | 'error' | 'future' = 'future';
            if (healthData.retrievedFromBinance && healthData.usedInPrompt) {
              status = 'optimal';
            } else if (healthData.retrievedFromBinance && !healthData.usedInPrompt) {
              status = 'wasted';
            } else if (!healthData.retrievedFromBinance && healthData.usedInPrompt) {
              status = 'error';
            }

            return {
              ...field,
              healthStatus: status,
              retrievedFromBinance: healthData.retrievedFromBinance,
              usedInPrompt: healthData.usedInPrompt,
              promptLocation: healthData.promptLocation,
            };
          }
          return field;
        });

        const fieldsWithHealthStatus = enhancedFields.filter(f => f.healthStatus).length;
        console.log('[FIELD CHIPS] Matched', fieldsWithHealthStatus, 'out of', AVAILABLE_FIELDS.length, 'fields with health data');

        setFieldsWithHealth(enhancedFields);
        setHealthStats(data.stats);
      }
    } catch (error) {
      console.error('[FIELD CHIPS] Failed to fetch health data:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, field: FieldChip) => {
    e.dataTransfer.setData('text/plain', field.placeholder);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedField(field.placeholder);
  };

  const handleDragEnd = () => {
    setDraggedField(null);
  };

  const filteredFields = fieldsWithHealth.filter((field) => {
    // Search filter
    const matchesSearch = field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.placeholder.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (filterStatus === 'optimal') {
      return field.healthStatus === 'optimal';
    } else if (filterStatus === 'issues') {
      return field.healthStatus === 'wasted' || field.healthStatus === 'error';
    }
    return true; // 'all'
  });

  const groupedFields = filteredFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, FieldChip[]>);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'optimal':
        return <span className="text-xs">✅</span>;
      case 'wasted':
        return <span className="text-xs">⚠️</span>;
      case 'error':
        return <span className="text-xs">❌</span>;
      default:
        return <span className="text-xs opacity-40">⭕</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black border border-black dark:border-white font-mono">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black dark:border-white">
        <h3 className="text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wide">
          Data Fields
        </h3>

        {/* Health Stats */}
        {healthStats && (
          <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
            <div className="border border-black dark:border-white px-2 py-1.5">
              <div className="font-bold text-black dark:text-white">✅ Optimal</div>
              <div className="text-black dark:text-white">{healthStats.optimal || 0}</div>
            </div>
            <div className="border border-black dark:border-white px-2 py-1.5">
              <div className="font-bold text-black dark:text-white">⚠️ Wasted</div>
              <div className="text-black dark:text-white">{healthStats.wasted || 0}</div>
            </div>
            <div className="border border-black dark:border-white px-2 py-1.5">
              <div className="font-bold text-black dark:text-white">❌ Errors</div>
              <div className="text-black dark:text-white">{healthStats.errors || 0}</div>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 text-xs font-medium border transition-colors ${
              filterStatus === 'all'
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('optimal')}
            className={`px-3 py-1 text-xs font-medium border transition-colors ${
              filterStatus === 'optimal'
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
            }`}
          >
            ✅ Optimal
          </button>
          <button
            onClick={() => setFilterStatus('issues')}
            className={`px-3 py-1 text-xs font-medium border transition-colors ${
              filterStatus === 'issues'
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
            }`}
          >
            ⚠️ Issues
          </button>
        </div>

        <input
          type="text"
          placeholder="Search fields..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white placeholder:text-gray-500"
        />
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedFields).map(([category, fields]) => (
          <div key={category}>
            <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
            </h4>
            <div className="space-y-2">
              {fields.map((field) => (
                <PlaceholderTooltip
                  key={field.placeholder}
                  placeholder={field.placeholder}
                >
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, field)}
                    onDragEnd={handleDragEnd}
                    className={`
                      px-3 py-2 border border-black dark:border-white cursor-move transition-all
                      ${
                        draggedField === field.placeholder
                          ? 'opacity-50'
                          : 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="text-sm font-medium">
                            {field.name}
                          </div>
                          {getStatusBadge(field.healthStatus)}
                        </div>
                        <div className="text-xs opacity-75 mb-1">
                          {field.description}
                        </div>
                        <code className="text-xs font-mono border border-black dark:border-white px-1.5 py-0.5">
                          {field.placeholder}
                        </code>
                        {/* Health Indicators */}
                        {field.healthStatus && (
                          <div className="flex gap-2 mt-1.5 text-xs">
                            <span className={field.retrievedFromBinance ? '' : 'opacity-50'}>
                              📥 {field.retrievedFromBinance ? 'Retrieved' : 'Not retrieved'}
                            </span>
                            <span className={field.usedInPrompt ? '' : 'opacity-50'}>
                              📤 {field.usedInPrompt ? 'In prompt' : 'Not used'}
                            </span>
                          </div>
                        )}
                      </div>
                      <svg
                        className="w-4 h-4 flex-shrink-0 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </div>
                </PlaceholderTooltip>
              ))}
            </div>
          </div>
        ))}

        {filteredFields.length === 0 && (
          <div className="text-center py-8 text-black dark:text-white">
            <p className="text-xs">No fields found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-black dark:border-white">
        <p className="text-xs text-black dark:text-white">
          💡 Drag fields into editor
        </p>
      </div>
    </div>
  );
}
