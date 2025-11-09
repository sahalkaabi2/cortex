'use client';

import { useState, useEffect } from 'react';
import { IoCheckmarkCircle, IoWarning, IoCloseCircle, IoEllipseOutline } from 'react-icons/io5';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
}

interface Settings {
  trading_interval_minutes: number;
  enabled_llms: string[];
  selected_models: Record<string, string>;
}

interface ModelInfo {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow?: number;
}

interface CostSettings {
  openai_api_cost: number;
  claude_api_cost: number;
  deepseek_api_cost: number;
  qwen_api_cost: number;
  binance_fee_rate: number;
  slippage_enabled: boolean;
  slippage_min: number;
  slippage_max: number;
  deduct_costs_from_balance: boolean;
  include_costs_in_pnl: boolean;
}

const ALL_LLMS = ['OpenAI', 'Claude', 'DeepSeek', 'Qwen'];

const INTERVAL_OPTIONS = [
  { label: '1 MIN', value: 1 },
  { label: '2 MIN', value: 2 },
  { label: '5 MIN', value: 5 },
  { label: '10 MIN', value: 10 },
  { label: '15 MIN', value: 15 },
  { label: '30 MIN', value: 30 },
  { label: '1 HR', value: 60 },
  { label: '2 HR', value: 120 },
  { label: '4 HR', value: 240 },
];

export function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'trading' | 'costs'>('trading');
  const [settings, setSettings] = useState<Settings>({
    trading_interval_minutes: 60,
    enabled_llms: ALL_LLMS,
    selected_models: {
      'OpenAI': 'gpt-4o',
      'Claude': 'claude-3-5-sonnet-20241022',
      'DeepSeek': 'deepseek-chat',
      'Qwen': 'qwen-plus'
    }
  });
  const [availableModels, setAvailableModels] = useState<Record<string, ModelInfo[]>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [costSettings, setCostSettings] = useState<CostSettings>({
    // Note: LLM API costs are now calculated dynamically based on token usage
    // and model pricing defined in lib/models.ts
    binance_fee_rate: 0.001,
    slippage_enabled: true,
    slippage_min: 0.0005,
    slippage_max: 0.0015,
    deduct_costs_from_balance: true,
    include_costs_in_pnl: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchCostSettings();
      fetchAvailableModels();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchCostSettings = async () => {
    try {
      const response = await fetch('/api/costs');
      const data = await response.json();
      if (data.success) {
        setCostSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching cost settings:', error);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const models: Record<string, ModelInfo[]> = {};

      // Fetch models for each provider
      for (const provider of ALL_LLMS) {
        try {
          const response = await fetch(`/api/models?provider=${provider}`);
          const data = await response.json();
          if (data.success && data.models) {
            models[provider] = data.models;
          }
        } catch (error) {
          console.error(`Error fetching models for ${provider}:`, error);
        }
      }

      setAvailableModels(models);
    } catch (error) {
      console.error('Error fetching available models:', error);
    }
  };

  const testModel = async (provider: string) => {
    const model = settings.selected_models[provider];

    if (!model) {
      alert('Please select a model first');
      return;
    }

    setTestingProvider(provider);
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    try {
      const response = await fetch('/api/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model })
      });

      const data = await response.json();

      if (data.success) {
        setTestResults((prev) => ({
          ...prev,
          [provider]: {
            success: true,
            message: data.message
          }
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [provider]: {
            success: false,
            message: data.suggestion
              ? `${data.error}\n💡 ${data.suggestion}`
              : data.error
          }
        }));
      }
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          message: `Network error: ${error.message}`
        }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save trading settings
      const tradingResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const tradingResult = await tradingResponse.json();

      // Check trading settings save result
      if (!tradingResponse.ok || !tradingResult.success) {
        const errorMsg = tradingResult.message || tradingResult.error || 'Failed to save trading settings';
        throw new Error(errorMsg);
      }

      // Save cost settings
      const costResponse = await fetch('/api/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: costSettings }),
      });

      const costResult = await costResponse.json();

      // Check cost settings save result
      if (!costResponse.ok || !costResult.success) {
        const errorMsg = costResult.message || costResult.error || 'Failed to save cost settings';
        throw new Error(errorMsg);
      }

      alert('Settings saved successfully! Stop and restart trading for changes to take effect.');
      onClose();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(`Failed to save settings: ${error.message || String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = async (preset: 'zero' | 'standard' | 'conservative' | 'high_volume') => {
    try {
      const response = await fetch('/api/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      });

      if (response.ok) {
        await fetchCostSettings();
        alert(`${preset.toUpperCase()} preset loaded`);
      }
    } catch (error) {
      console.error('Error loading preset:', error);
      alert('Failed to load preset');
    }
  };

  const toggleLLM = (llm: string) => {
    setSettings((prev) => {
      const enabled = prev.enabled_llms.includes(llm);

      if (enabled && prev.enabled_llms.length === 1) {
        alert('At least one LLM must be enabled');
        return prev;
      }

      return {
        ...prev,
        enabled_llms: enabled
          ? prev.enabled_llms.filter((l) => l !== llm)
          : [...prev.enabled_llms, llm],
      };
    });
  };

  const getPromptTemplate = () => {
    return `It has been ${'{{MINUTES}}'} minutes since you started trading.

Below, we are providing you with market data, price history, technical indicators, and your current account state so you can discover profitable opportunities.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise, intraday series are provided at **3-minute intervals**. Longer-term context is provided at 4-hour intervals when available.

---

### CURRENT MARKET STATE FOR ALL COINS

${'{{MARKET_DATA}}'}
  For each coin (BTC, ETH, SOL, BNB, XRP):
  - current_price, current_ema12, current_ema20, current_ema26, current_ema50
  - current_macd, current_rsi (7 period)
  - Intraday 3-min price history (last 10 data points)
  - RSI history (7-period, last 10 data points)
  - EMA history (20-period, last 10 data points)
  - 4H timeframe data (price, RSI, MACD)
  - 24H change % and volume

---

### HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

**Current Total Return (percent):** ${'{{RETURN}}'}%

**Available Cash:** $${'{{BALANCE}}'}

**Current Account Value:** ${'{{ACCOUNT_VALUE}}'}

**Current live positions & performance:**
${'{{POSITIONS}}'}
  For each position:
  - symbol, quantity, entry_price, current_price
  - unrealized_pnl, pnl_percent

**Sharpe Ratio:** ${'{{SHARPE}}'}

---

## TRADING RULES & GUIDELINES

1. **Position Limits:** You can only hold ONE position per coin at a time. You currently have ${'{{POSITION_COUNT}}'} open position(s).

2. **Capital Management:** You have $${'{{BALANCE}}'} available cash. Manage your position sizing carefully - don't invest all capital at once.

3. **Technical Analysis:** Use the provided indicators (RSI, EMA, MACD) across multiple timeframes to inform your decisions. Pay attention to both short-term (3-min) and longer-term (4H) context.

4. **Exit Planning:** For every BUY decision, you MUST specify:
   - **profit_target:** Price level where you'll take profit
   - **stop_loss:** Price level where you'll cut losses
   - **invalidation_condition:** A specific market signal that would void your trade thesis

5. **Risk Assessment:** Calculate and specify the **risk_usd** - the dollar amount you're putting at risk.

6. **Confidence:** Assess your confidence in this decision on a scale from 0 to 1, where:
   - 0.9-1.0 = Very high confidence
   - 0.7-0.89 = High confidence
   - 0.5-0.69 = Medium confidence
   - 0.3-0.49 = Low confidence
   - 0.0-0.29 = Very low confidence

7. **Data Interpretation:** Remember that all price/indicator arrays are ordered **OLDEST → NEWEST**.

---

## RESPOND IN STRICT JSON FORMAT:

{
  "action": "BUY" | "SELL" | "HOLD",
  "coin": "BTC" | "ETH" | "SOL" | "BNB" | "XRP" (required for BUY/SELL),
  "amount": <number> (for BUY: dollar amount to invest, for SELL: units to sell),
  "reasoning": "<concise analysis explaining your decision and strategy>",
  "confidence": <number 0-1>,
  "profit_target": <number> (price level, required for BUY),
  "stop_loss": <number> (price level, required for BUY),
  "invalidation_condition": "<string describing market signal that voids your thesis, required for BUY>",
  "risk_usd": <number> (dollar amount at risk, required for BUY)
}

**Example BUY response:**
{
  "action": "BUY",
  "coin": "BTC",
  "amount": 500,
  "reasoning": "BTC breaking above consolidation with strong RSI at 65, MACD positive, price above EMA20. 4H context shows recovery from oversold. Targeting retest of $45k resistance.",
  "confidence": 0.72,
  "profit_target": 45000,
  "stop_loss": 41500,
  "invalidation_condition": "If BTC closes below $41,000 on 4H timeframe, invalidating bullish structure",
  "risk_usd": 300
}

**Example SELL response:**
{
  "action": "SELL",
  "coin": "ETH",
  "amount": 0.5,
  "reasoning": "Profit target reached at $3,200. Taking profit as RSI shows overbought conditions.",
  "confidence": 0.80,
  "profit_target": null,
  "stop_loss": null,
  "invalidation_condition": null,
  "risk_usd": null
}

**Example HOLD response:**
{
  "action": "HOLD",
  "coin": null,
  "amount": null,
  "reasoning": "Current positions performing well. No strong setup for new entries. Waiting for BTC to break key resistance or support levels.",
  "confidence": 0.65,
  "profit_target": null,
  "stop_loss": null,
  "invalidation_condition": null,
  "risk_usd": null
}

Make your decision based on rigorous technical analysis, risk management principles, and the current market context.`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 font-mono">
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-black dark:border-white">
          <h2 className="text-lg font-bold">SETTINGS</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-black dark:border-white">
          <button
            onClick={() => setActiveTab('trading')}
            className={`px-4 py-2 text-xs font-bold ${
              activeTab === 'trading'
                ? 'border-b-2 border-black dark:border-white'
                : 'opacity-40'
            }`}
          >
            TRADING
          </button>
          <button
            onClick={() => setActiveTab('costs')}
            className={`px-4 py-2 text-xs font-bold ${
              activeTab === 'costs'
                ? 'border-b-2 border-black dark:border-white'
                : 'opacity-40'
            }`}
          >
            COSTS
          </button>
        </div>

        {/* Trading Tab */}
        {activeTab === 'trading' && (
          <div className="space-y-6">
            {/* Trading Interval */}
            <div>
              <label className="block text-sm font-bold mb-2">
                TRADING CYCLE INTERVAL
              </label>
            <select
              value={settings.trading_interval_minutes}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  trading_interval_minutes: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-black dark:border-white bg-white dark:bg-black text-xs"
            >
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs opacity-60">
              How often LLMs make decisions
            </p>
          </div>

          {/* Enable/Disable LLMs */}
          <div>
            <label className="block text-sm font-bold mb-3">
              ACTIVE LLM TRADERS
            </label>
            <div className="space-y-2">
              {ALL_LLMS.map((llm) => (
                <label
                  key={llm}
                  className="flex items-center justify-between p-2 border border-black dark:border-white cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enabled_llms.includes(llm)}
                      onChange={() => toggleLLM(llm)}
                      className="w-4 h-4 mr-3"
                    />
                    <span className="text-xs font-bold">
                      {llm.toUpperCase()}
                    </span>
                  </div>
                  {settings.enabled_llms.includes(llm) && (
                    <span className="text-xs">✓</span>
                  )}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs opacity-60">
              Disabled LLMs won&apos;t trade
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-bold mb-3">
              MODEL SELECTION
            </label>
            <div className="space-y-3">
              {ALL_LLMS.map((llm) => {
                const models = availableModels[llm] || [];
                const selectedModel = settings.selected_models[llm];
                const currentModel = models.find(m => m.id === selectedModel);
                const testResult = testResults[llm];
                const isTesting = testingProvider === llm;

                return (
                  <div key={llm} className="border border-black dark:border-white p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{llm.toUpperCase()}</span>
                      <button
                        onClick={() => testModel(llm)}
                        disabled={isTesting || models.length === 0}
                        className="px-2 py-1 text-xs border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {isTesting ? 'TESTING...' : 'TEST'}
                      </button>
                    </div>
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          selected_models: {
                            ...prev.selected_models,
                            [llm]: e.target.value
                          }
                        }));
                        // Clear test result when model changes
                        setTestResults((prev) => ({ ...prev, [llm]: null }));
                      }}
                      className="w-full px-2 py-1 border border-black dark:border-white bg-white dark:bg-black text-xs"
                      disabled={models.length === 0}
                    >
                      {models.length === 0 ? (
                        <option>Loading models...</option>
                      ) : (
                        models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} (${model.inputPrice.toFixed(2)}/${model.outputPrice.toFixed(2)} per 1M tokens)
                          </option>
                        ))
                      )}
                    </select>
                    {currentModel && (
                      <div className="mt-1 text-xs opacity-60">
                        Context: {currentModel.contextWindow?.toLocaleString() || 'N/A'} tokens
                      </div>
                    )}
                    {testResult && (
                      <div className={`mt-2 p-2 border text-xs ${
                        testResult.success
                          ? 'border-green-600 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
                          : 'border-red-600 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
                      }`}>
                        <div className="font-bold mb-1">
                          {testResult.success ? '✓ TEST PASSED' : '✗ TEST FAILED'}
                        </div>
                        <div className="whitespace-pre-wrap">{testResult.message}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs opacity-60">
              Pricing updates automatically from APIs. Use TEST button to verify connection.
            </p>
          </div>

            {/* Warning */}
            <div className="border border-black dark:border-white p-3">
              <p className="text-xs">
                ⚠ STOP TRADING BEFORE CHANGING SETTINGS
              </p>
            </div>
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === 'costs' && (
          <div className="space-y-6">
            {/* Presets */}
            <div>
              <label className="block text-sm font-bold mb-3">COST PRESETS</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => loadPreset('zero')}
                  className="px-3 py-2 border border-black dark:border-white text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  ZERO COSTS
                </button>
                <button
                  onClick={() => loadPreset('standard')}
                  className="px-3 py-2 border border-black dark:border-white text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  STANDARD
                </button>
                <button
                  onClick={() => loadPreset('conservative')}
                  className="px-3 py-2 border border-black dark:border-white text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  CONSERVATIVE
                </button>
                <button
                  onClick={() => loadPreset('high_volume')}
                  className="px-3 py-2 border border-black dark:border-white text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  HIGH VOLUME
                </button>
              </div>
              <p className="mt-2 text-xs opacity-60">
                Quick load common cost configurations
              </p>
            </div>

            {/* LLM API Costs - Dynamic Token-Based Pricing */}
            <div className="p-4 border border-black dark:border-white bg-gray-50 dark:bg-gray-900">
              <label className="block text-sm font-bold mb-2">LLM API COSTS</label>
              <p className="text-xs opacity-70 leading-relaxed">
                API costs are calculated dynamically based on actual token usage from each API call.
                Pricing is defined per model in the model selection above and is automatically applied.
                See the &quot;MODELS&quot; tab for specific pricing per 1M tokens for each model.
              </p>
            </div>

            {/* Trading Fees */}
            <div>
              <label className="block text-sm font-bold mb-3">TRADING FEES</label>
              <div className="flex items-center justify-between">
                <span className="text-xs">Binance Fee Rate:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="0.01"
                    value={(costSettings.binance_fee_rate * 100).toFixed(2)}
                    onChange={(e) =>
                      setCostSettings((prev) => ({
                        ...prev,
                        binance_fee_rate: parseFloat(e.target.value) / 100 || 0,
                      }))
                    }
                    className="w-24 px-2 py-1 border border-black dark:border-white bg-white dark:bg-black text-xs text-right"
                  />
                  <span className="text-xs">%</span>
                </div>
              </div>
              <p className="mt-1 text-xs opacity-60">
                Standard: 0.1% | VIP: 0.04-0.075%
              </p>
            </div>

            {/* Slippage */}
            <div>
              <label className="block text-sm font-bold mb-3">SLIPPAGE SIMULATION</label>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={costSettings.slippage_enabled}
                    onChange={(e) =>
                      setCostSettings((prev) => ({
                        ...prev,
                        slippage_enabled: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-xs">Enable Slippage</span>
                </label>
                {costSettings.slippage_enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Min Slippage:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="5"
                          value={(costSettings.slippage_min * 100).toFixed(2)}
                          onChange={(e) =>
                            setCostSettings((prev) => ({
                              ...prev,
                              slippage_min: parseFloat(e.target.value) / 100 || 0,
                            }))
                          }
                          className="w-24 px-2 py-1 border border-black dark:border-white bg-white dark:bg-black text-xs text-right"
                        />
                        <span className="text-xs">%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Max Slippage:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="5"
                          value={(costSettings.slippage_max * 100).toFixed(2)}
                          onChange={(e) =>
                            setCostSettings((prev) => ({
                              ...prev,
                              slippage_max: parseFloat(e.target.value) / 100 || 0,
                            }))
                          }
                          className="w-24 px-2 py-1 border border-black dark:border-white bg-white dark:bg-black text-xs text-right"
                        />
                        <span className="text-xs">%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cost Accounting */}
            <div>
              <label className="block text-sm font-bold mb-3">COST ACCOUNTING</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={costSettings.deduct_costs_from_balance}
                    onChange={(e) =>
                      setCostSettings((prev) => ({
                        ...prev,
                        deduct_costs_from_balance: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-xs">Deduct costs from trader balance</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={costSettings.include_costs_in_pnl}
                    onChange={(e) =>
                      setCostSettings((prev) => ({
                        ...prev,
                        include_costs_in_pnl: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-xs">Include costs in P&L calculations</span>
                </label>
              </div>
            </div>

            {/* Info */}
            <div className="border border-black dark:border-white p-3">
              <p className="text-xs font-bold mb-1">REALISTIC SIMULATION</p>
              <p className="text-xs opacity-60">
                Costs make DeepSeek ($0.004/call) more cost-effective than OpenAI ($0.025/call) for frequent trading
              </p>
            </div>
          </div>
        )}


        {/* Actions */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-black dark:border-white text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-bold disabled:opacity-50"
          >
            {isLoading ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}
