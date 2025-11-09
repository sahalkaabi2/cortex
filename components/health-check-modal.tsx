'use client';

import { useState, useEffect } from 'react';
import { IoClose, IoRefresh, IoCheckmarkCircle, IoCloseCircle, IoWarning, IoEllipseOutline } from 'react-icons/io5';

interface FieldStatus {
  present: boolean;
  type: string;
  retrievedFromBinance: boolean;
  usedInPrompt: boolean;
  status: 'optimal' | 'wasted' | 'error' | 'future';
  promptLocation: string | null;
  description: string;
}

interface CoinHealth {
  coin: string;
  fields: Record<string, FieldStatus>;
  promptReadiness: {
    score: number;
    total: number;
    percentage: number;
    ready: boolean;
    missingFields: string[];
  };
  summary: {
    optimal: { total: number; present: number; missing: number };
    wasted: { total: number; present: number; names: string[] };
    errors: { total: number; count: number; names: string[] };
    future: { total: number; count: number; names: string[] };
  };
}

interface HealthData {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'error';
  message: string;
  coins: CoinHealth[];
  error?: string;
}

interface HealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HealthCheckModal({ isOpen, onClose }: HealthCheckModalProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchHealthData();
      // Auto-refresh every 30 seconds when modal is open
      const interval = setInterval(fetchHealthData, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchHealthData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const coinData = healthData?.coins.find((c) => c.coin === selectedCoin);

  // Get fields by status
  const optimalFields = Object.entries(coinData?.fields || {}).filter(([_, f]) => f.status === 'optimal');
  const wastedFields = Object.entries(coinData?.fields || {}).filter(([_, f]) => f.status === 'wasted');
  const errorFields = Object.entries(coinData?.fields || {}).filter(([_, f]) => f.status === 'error');
  const futureFields = Object.entries(coinData?.fields || {}).filter(([_, f]) => f.status === 'future');

  const renderField = (fieldName: string, field: FieldStatus, showPromptLocation: boolean = false) => {
    let icon;
    let colorClass;
    let statusBadge;

    // Icon and color based on status
    if (field.status === 'optimal' && field.present) {
      icon = <IoCheckmarkCircle size={16} />;
      colorClass = 'text-green-600 dark:text-green-400';
      statusBadge = <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">✅ OPTIMAL</span>;
    } else if (field.status === 'optimal' && !field.present) {
      icon = <IoCloseCircle size={16} />;
      colorClass = 'text-red-600 dark:text-red-400';
      statusBadge = <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">❌ MISSING</span>;
    } else if (field.status === 'wasted') {
      icon = <IoWarning size={16} />;
      colorClass = 'text-yellow-600 dark:text-yellow-400';
      statusBadge = <span className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">⚠️ WASTED</span>;
    } else if (field.status === 'error') {
      icon = <IoCloseCircle size={16} />;
      colorClass = 'text-red-600 dark:text-red-400';
      statusBadge = <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">❌ ERROR</span>;
    } else {
      icon = <IoEllipseOutline size={16} />;
      colorClass = 'text-gray-400 dark:text-gray-600';
      statusBadge = <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">⭕ FUTURE</span>;
    }

    return (
      <div key={fieldName} className="py-2 border-b border-gray-200 dark:border-gray-800 last:border-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <span className={`${colorClass} mt-0.5`}>{icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold">{fieldName}</span>
                {statusBadge}
                <span className="text-xs opacity-60">({field.type})</span>
              </div>
              <div className="text-xs opacity-70 mt-0.5">{field.description}</div>
              <div className="flex gap-3 mt-1 text-xs">
                <span className={`${field.retrievedFromBinance ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  📥 {field.retrievedFromBinance ? 'Retrieved from Binance' : 'Not retrieved'}
                </span>
                <span className={`${field.usedInPrompt ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                  📤 {field.usedInPrompt ? 'Used in prompt' : 'Not in prompt'}
                </span>
              </div>
              {showPromptLocation && field.promptLocation && (
                <div className="text-xs opacity-50 mt-1 italic">📍 {field.promptLocation}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getReadinessColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white w-full max-w-3xl max-h-[90vh] flex flex-col font-mono">
        {/* Header */}
        <div className="border-b-2 border-black dark:border-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">🏥 SYSTEM HEALTH CHECK</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Prompt Readiness Banner */}
        {coinData && (
          <div className={`border-b-2 border-black dark:border-white p-4 ${
            coinData.promptReadiness.ready
              ? 'bg-green-50 dark:bg-green-950'
              : 'bg-yellow-50 dark:bg-yellow-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="text-sm font-bold opacity-60">PROMPT READINESS</div>
                  <div className={`text-2xl font-bold ${getReadinessColor(coinData.promptReadiness.percentage)}`}>
                    {coinData.promptReadiness.score}/{coinData.promptReadiness.total} ({coinData.promptReadiness.percentage}%)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-60 mb-1">Overall Status</div>
                <div className={`text-sm font-bold px-3 py-1 border-2 ${
                  coinData.promptReadiness.ready
                    ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
                    : 'border-yellow-600 text-yellow-600 dark:border-yellow-400 dark:text-yellow-400'
                }`}>
                  {coinData.promptReadiness.ready ? '✅ READY' : '⚠️  INCOMPLETE'}
                </div>
              </div>
            </div>
            {coinData.promptReadiness.missingFields.length > 0 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                ❌ Missing prompt fields: {coinData.promptReadiness.missingFields.join(', ')}
              </div>
            )}
            {coinData.summary.wasted.present > 0 && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                ⚠️ {coinData.summary.wasted.present} field(s) retrieved but unused: {coinData.summary.wasted.names.join(', ')}
              </div>
            )}
            {coinData.summary.errors.count > 0 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                ❌ {coinData.summary.errors.count} ERROR(S) - Used in prompt but not retrieved: {coinData.summary.errors.names.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Top Controls */}
        <div className="border-b border-black dark:border-white p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs opacity-60">Select Coin:</span>
              <select
                value={selectedCoin}
                onChange={(e) => setSelectedCoin(e.target.value)}
                className="px-3 py-1 border border-black dark:border-white bg-white dark:bg-black text-sm"
              >
                {healthData?.coins.map((coin) => (
                  <option key={coin.coin} value={coin.coin}>
                    {coin.coin}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchHealthData}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-30"
            >
              <IoRefresh size={14} className={isLoading ? 'animate-spin' : ''} />
              REFRESH
            </button>
          </div>
          {lastUpdated && (
            <div className="text-xs opacity-60 mt-2">Last checked: {lastUpdated}</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!healthData ? (
            <div className="text-center py-8 opacity-60">Loading health data...</div>
          ) : coinData ? (
            <div className="space-y-6">
              {/* Optimal Fields */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2 border-b-2 border-black dark:border-white">
                  <span>✅ OPTIMAL FIELDS</span>
                  <span className="text-xs opacity-60">(Retrieved from Binance AND Used in Prompt)</span>
                </h3>
                <div className="text-xs opacity-70 mb-3 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  These fields are fetched from Binance and sent to the LLM. This is the ideal state - we use everything we fetch.
                </div>
                <div className="border border-black dark:border-white p-3">
                  <div className="text-xs mb-2 font-bold">
                    {coinData.summary.optimal.present}/{coinData.summary.optimal.total} present
                  </div>
                  {optimalFields.map(([name, field]) => renderField(name, field, true))}
                </div>
              </div>

              {/* Wasted Fields */}
              {wastedFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2 border-b-2 border-black dark:border-white">
                    <span>⚠️ WASTED COMPUTATION</span>
                    <span className="text-xs opacity-60">(Retrieved but NOT Used in Prompt)</span>
                  </h3>
                  <div className="text-xs opacity-70 mb-3 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                    ⚠️ These fields are fetched from Binance but NOT sent to the LLM. Either use them in the prompt or stop fetching them to save API calls.
                  </div>
                  <div className="border border-black dark:border-white p-3">
                    <div className="text-xs mb-2 font-bold">
                      {coinData.summary.wasted.present}/{coinData.summary.wasted.total} wasted fields
                    </div>
                    {wastedFields.map(([name, field]) => renderField(name, field, true))}
                  </div>
                </div>
              )}

              {/* Error Fields */}
              {errorFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2 border-b-2 border-red-600 dark:border-red-400">
                    <span>❌ CRITICAL ERRORS</span>
                    <span className="text-xs opacity-60">(Used in Prompt but NOT Retrieved)</span>
                  </h3>
                  <div className="text-xs opacity-70 mb-3 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    ❌ CRITICAL: These fields are sent to the LLM but NOT fetched from Binance! This will cause runtime errors. Fix immediately.
                  </div>
                  <div className="border border-black dark:border-white p-3">
                    <div className="text-xs mb-2 font-bold text-red-600 dark:text-red-400">
                      {coinData.summary.errors.count} error(s) detected
                    </div>
                    {errorFields.map(([name, field]) => renderField(name, field, true))}
                  </div>
                </div>
              )}

              {/* Future Fields */}
              {futureFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2 border-b-2 border-black dark:border-white">
                    <span>⭕ FUTURE ENHANCEMENTS</span>
                    <span className="text-xs opacity-60">(Neither Retrieved nor Used)</span>
                  </h3>
                  <div className="text-xs opacity-70 mb-3 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    These fields are potential future enhancements - currently neither fetched from Binance nor used in the prompt.
                  </div>
                  <div className="border border-black dark:border-white p-3">
                    <div className="text-xs mb-2 font-bold">
                      {coinData.summary.future.count} future field(s)
                    </div>
                    {futureFields.map(([name, field]) => renderField(name, field, false))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-black dark:border-white p-4 bg-gray-50 dark:bg-gray-900">
          <div className="text-xs opacity-60 text-center space-y-1">
            <div className="font-bold mb-2">DUAL HEALTH CHECK LEGEND</div>
            <div className="flex flex-wrap justify-center gap-3">
              <span>✅ Optimal: Retrieved & Used</span>
              <span>⚠️ Wasted: Retrieved but NOT Used</span>
              <span>❌ Error: Used but NOT Retrieved</span>
              <span>⭕ Future: Neither Retrieved nor Used</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
