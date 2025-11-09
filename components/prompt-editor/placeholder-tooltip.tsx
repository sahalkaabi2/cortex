'use client';

import { useState, useEffect } from 'react';
import { generatePositionsPreview } from '@/lib/prompt-preview';

interface PlaceholderTooltipProps {
  children: React.ReactNode;
  placeholder: string;
  onLoad?: () => void;
}

interface PlaceholderStructure {
  sections: {
    title: string;
    fields: { name: string; description: string }[];
  }[];
}

const MARKET_DATA_STRUCTURE: PlaceholderStructure = {
  sections: [
    {
      title: 'Current State',
      fields: [
        { name: 'current_price', description: 'Current market price' },
        { name: 'current_ema12', description: '12-period EMA' },
        { name: 'current_ema20', description: '20-period EMA' },
        { name: 'current_ema26', description: '26-period EMA' },
        { name: 'current_ema50', description: '50-period EMA' },
        { name: 'current_macd', description: 'MACD value' },
        { name: 'current_rsi', description: '7-period RSI' },
      ],
    },
    {
      title: 'Intraday Series (3-minute intervals)',
      fields: [
        { name: 'price_history', description: 'Last 10 prices (oldest → newest)' },
        { name: 'rsi_history', description: 'Last 10 RSI-7 values' },
        { name: 'ema_history', description: 'Last 10 EMA-20 values' },
        { name: 'macd', description: 'MACD indicator' },
        { name: 'macd_signal', description: 'MACD signal line' },
      ],
    },
    {
      title: 'Long-term Context (4-hour timeframe)',
      fields: [
        { name: '4h_price', description: '4H price' },
        { name: '4h_volume', description: '4H volume' },
        { name: '4h_rsi', description: '4H RSI-14' },
        { name: '4h_macd', description: '4H MACD' },
        { name: '24h_change', description: '24H price change %' },
        { name: '24h_volume', description: '24H trading volume' },
      ],
    },
  ],
};

const POSITIONS_STRUCTURE: PlaceholderStructure = {
  sections: [
    {
      title: 'Position Data',
      fields: [
        { name: 'symbol', description: 'Coin symbol (e.g., BTC)' },
        { name: 'quantity', description: 'Amount of coin held' },
        { name: 'entry_price', description: 'Price when position was opened' },
        { name: 'current_price', description: 'Current market price' },
        { name: 'unrealized_pnl', description: 'Unrealized profit/loss in USD' },
        { name: 'pnl_percent', description: 'P&L as percentage' },
      ],
    },
  ],
};

const COMPOSITE_PLACEHOLDERS = ['{{MARKET_DATA}}', '{{POSITIONS}}'];

export function PlaceholderTooltip({ children, placeholder, onLoad }: PlaceholderTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const structure = placeholder === '{{MARKET_DATA}}' ? MARKET_DATA_STRUCTURE : POSITIONS_STRUCTURE;

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Only show modal for composite placeholders
  if (!COMPOSITE_PLACEHOLDERS.includes(placeholder)) {
    return <>{children}</>;
  }

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    setShowPreview(true);

    try {
      // Fetch market data to generate preview
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview_market_data' }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preview data');
      }

      const data = await response.json();

      if (data.preview) {
        setPreviewData(data.preview);
      } else {
        setPreviewData('Preview data not available. The trading API may not support preview mode yet.');
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
      setPreviewData(
        'Unable to load preview. Example structure:\n\n' +
        '### ALL BTC DATA\n\n' +
        '**Current state:**\n' +
        'current_price = 67823.45, current_ema12 = 67500.23, ...\n\n' +
        '**Intraday series (3-minute intervals, oldest → latest):**\n' +
        'Price history: [67500.00, 67550.00, 67600.00, ...]\n' +
        'RSI history: [45.23, 47.56, 48.92, ...]\n\n' +
        '**Longer-term context (4-hour timeframe):**\n' +
        '4H Price: $67800.00, 4H Volume: 1234567890, 4H RSI: 52.34, ...'
      );
    } finally {
      setIsLoadingPreview(false);
    }

    if (onLoad) {
      onLoad();
    }
  };

  const copyPreview = () => {
    if (previewData) {
      navigator.clipboard.writeText(previewData);
    }
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowPreview(false);
    setPreviewData(null);
  };

  return (
    <>
      <div className="relative inline-block w-full">
        <div className="relative inline-flex items-center gap-1.5 w-full">
          {children}
          <button
            onClick={handleIconClick}
            className="text-sm opacity-60 hover:opacity-100 cursor-pointer transition-opacity ml-auto flex-shrink-0"
            title={`Click to see ${placeholder} structure`}
          >
            ⓘ
          </button>
        </div>
      </div>

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Modal Content */}
          <div
            className="bg-white dark:bg-black border-2 border-black dark:border-white max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b-2 border-black dark:border-white flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-black dark:text-white font-mono">
                  {placeholder}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {placeholder === '{{MARKET_DATA}}'
                    ? 'Composite placeholder containing market data for all tracked coins'
                    : 'Composite placeholder containing all current open positions'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-2xl font-bold text-black dark:text-white hover:opacity-70 transition-opacity ml-4"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Structure Section */}
              <div className="mb-6">
                <h4 className="font-bold text-sm text-black dark:text-white mb-3 uppercase tracking-wider">
                  Data Structure
                </h4>
                <div className="space-y-4">
                  {structure.sections.map((section, idx) => (
                    <div key={idx} className="text-sm">
                      <div className={`font-semibold mb-2 ${
                        idx === 0 ? 'text-blue-600 dark:text-blue-400' :
                        idx === 1 ? 'text-green-600 dark:text-green-400' :
                        'text-orange-600 dark:text-orange-400'
                      }`}>
                        {section.title}
                      </div>
                      <ul className="space-y-1.5 pl-4">
                        {section.fields.map((field, fieldIdx) => (
                          <li key={fieldIdx} className="text-black dark:text-white">
                            <code className="font-mono text-sm bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                              {field.name}
                            </code>
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                              - {field.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Section for MARKET_DATA */}
              {placeholder === '{{MARKET_DATA}}' && (
                <div className="border-t-2 border-black dark:border-white pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-sm text-black dark:text-white uppercase tracking-wider">
                      Live Data Preview
                    </h4>
                    {previewData && (
                      <button
                        onClick={copyPreview}
                        className="text-sm px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                      >
                        Copy
                      </button>
                    )}
                  </div>

                  {!showPreview && (
                    <button
                      onClick={loadPreview}
                      disabled={isLoadingPreview}
                      className="w-full px-4 py-3 text-sm font-medium border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                      {isLoadingPreview ? 'Loading...' : 'Load Real Data Preview'}
                    </button>
                  )}

                  {showPreview && previewData && (
                    <div className="mt-3 p-4 border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-black dark:text-white">
                        {previewData}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Section for POSITIONS */}
              {placeholder === '{{POSITIONS}}' && (
                <div className="border-t-2 border-black dark:border-white pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-sm text-black dark:text-white uppercase tracking-wider">
                      Formatted Text Preview
                    </h4>
                    <button
                      onClick={() => {
                        const posPreview = generatePositionsPreview();
                        navigator.clipboard.writeText(posPreview);
                      }}
                      className="text-sm px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="p-4 border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap text-black dark:text-white">
                      {generatePositionsPreview()}
                    </pre>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                    💡 This shows example positions. The actual format will depend on your current open positions.
                  </p>
                </div>
              )}

              {/* Footer Note */}
              <div className="mt-6 pt-4 border-t-2 border-black dark:border-white">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💡 {placeholder === '{{MARKET_DATA}}'
                    ? 'This placeholder expands to include all tracked coins (BTC, ETH, BNB, XRP, SOL). Each coin gets its own section with the fields shown above.'
                    : 'This placeholder expands to include all your current open positions. If you have no positions, it shows "No open positions".'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t-2 border-black dark:border-white bg-gray-50 dark:bg-gray-900">
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 text-sm font-medium border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
