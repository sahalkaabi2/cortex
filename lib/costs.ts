import { supabase } from './supabase';
import { getModelPricing } from './models';

/**
 * Cost Configuration Interface
 *
 * IMPORTANT: LLM API costs are now calculated dynamically based on actual token usage.
 * The per-call cost fields below are DEPRECATED and maintained only for backward compatibility.
 * Actual costs are calculated using:
 * - Token usage from API responses (input_tokens, output_tokens)
 * - Per-million-token pricing from lib/models.ts MODEL_REGISTRY
 * - Formula: (input_tokens / 1M × inputPrice) + (output_tokens / 1M × outputPrice)
 *
 * See calculateLLMCost() function below for implementation.
 */
export interface CostConfig {
  // LLM API Costs (DEPRECATED - kept for backward compatibility only)
  // Actual costs are calculated dynamically based on token usage and model pricing
  openai_api_cost?: number;
  claude_api_cost?: number;
  deepseek_api_cost?: number;
  qwen_api_cost?: number;

  // Trading Fees
  binance_fee_rate: number;

  // Slippage
  slippage_enabled: boolean;
  slippage_min: number;
  slippage_max: number;

  // Accounting
  deduct_costs_from_balance: boolean;
  include_costs_in_pnl: boolean;
}

// In-memory cache for cost settings (refreshed every 5 minutes)
let costCache: CostConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all cost settings from database with caching
 */
export async function getCostSettings(): Promise<CostConfig> {
  const now = Date.now();

  // Return cached version if still valid
  if (costCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return costCache;
  }

  try {
    const { data: settings, error } = await supabase
      .from('cost_settings')
      .select('key, value');

    if (error) throw error;

    // Convert array to object
    const config: any = {};
    settings?.forEach((setting) => {
      const key = setting.key;
      const value = setting.value;

      // Convert boolean flags
      if (key.includes('enabled') || key.includes('deduct') || key.includes('include')) {
        config[key] = value === 1;
      } else {
        config[key] = value;
      }
    });

    costCache = config as CostConfig;
    cacheTimestamp = now;

    return costCache;
  } catch (error) {
    console.error('Error fetching cost settings:', error);

    // Return defaults if database fails
    return getDefaultCostSettings();
  }
}

/**
 * Get default cost settings (fallback)
 */
export function getDefaultCostSettings(): CostConfig {
  return {
    openai_api_cost: 0.025,
    claude_api_cost: 0.020,
    deepseek_api_cost: 0.004,
    qwen_api_cost: 0.003,
    binance_fee_rate: 0.001,
    slippage_enabled: true,
    slippage_min: 0.0005,
    slippage_max: 0.0015,
    deduct_costs_from_balance: true,
    include_costs_in_pnl: true,
  };
}

/**
 * Update a single cost setting
 */
export async function updateCostSetting(key: string, value: number): Promise<void> {
  await supabase
    .from('cost_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);

  // Clear cache to force refresh
  costCache = null;
}

/**
 * Update multiple cost settings at once
 */
export async function updateCostSettings(updates: Partial<CostConfig>): Promise<void> {
  const promises = Object.entries(updates).map(([key, value]) => {
    // Convert boolean to number for database
    const dbValue = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    return updateCostSetting(key, dbValue);
  });

  await Promise.all(promises);
}

/**
 * LLM Pricing (USD per 1M tokens) - DEPRECATED - Use getModelPricing from models.ts
 * Kept for backwards compatibility
 * @deprecated Use getModelPricing from lib/models.ts instead
 */
const LLM_PRICING = {
  'gpt-4o': {
    input: 2.50,   // $2.50 per 1M input tokens
    output: 10.00, // $10.00 per 1M output tokens
  },
  'claude-3-5-sonnet-20241022': {
    input: 3.00,   // $3.00 per 1M input tokens
    output: 15.00, // $15.00 per 1M output tokens
  },
  'deepseek-chat': {
    input: 0.14,   // $0.14 per 1M input tokens
    output: 0.28,  // $0.28 per 1M output tokens
  },
  'qwen-plus': {
    input: 0.50,   // Estimate - $0.50 per 1M input tokens
    output: 1.00,  // Estimate - $1.00 per 1M output tokens
  },
};

/**
 * Map model IDs to provider names
 */
function getProviderFromModel(model: string): string {
  if (model.startsWith('gpt-') || model.startsWith('o1-')) return 'OpenAI';
  if (model.startsWith('claude-')) return 'Claude';
  if (model.startsWith('deepseek-')) return 'DeepSeek';
  if (model.startsWith('qwen')) return 'Qwen';

  console.warn(`Unknown provider for model: ${model}`);
  return 'OpenAI'; // Default fallback
}

/**
 * Calculate actual LLM API cost based on token usage
 *
 * This function dynamically calculates costs using:
 * 1. The actual token usage returned by the API (input + output tokens)
 * 2. The per-million-token pricing from lib/models.ts MODEL_REGISTRY
 *
 * Formula: cost = (input_tokens / 1,000,000) × inputPrice + (output_tokens / 1,000,000) × outputPrice
 *
 * This replaces the deprecated fixed "per-call" costs and provides accurate,
 * model-specific pricing that reflects actual usage.
 *
 * @param model - The model ID (e.g., "gpt-4o", "claude-3-5-sonnet-20241022")
 * @param usage - Token usage from the API response
 * @returns The calculated cost in USD
 */
export function calculateLLMCost(
  model: string,
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  }
): number {
  // Get provider from model name
  const provider = getProviderFromModel(model);

  // Get pricing from model registry (with fallback)
  const pricing = getModelPricing(provider, model);

  // Support both OpenAI format (prompt_tokens, completion_tokens)
  // and Claude format (input_tokens, output_tokens)
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice;

  return inputCost + outputCost;
}

/**
 * Get API cost for a specific LLM provider (DEPRECATED - use calculateLLMCost)
 * @deprecated Use calculateLLMCost with actual usage data instead
 */
export function getApiCost(provider: string, settings: CostConfig): number {
  const key = `${provider.toLowerCase()}_api_cost` as keyof CostConfig;
  return (settings[key] as number) || 0;
}

/**
 * Calculate trading fee for a trade
 */
export function calculateTradingFee(tradeValue: number, settings: CostConfig): number {
  return tradeValue * settings.binance_fee_rate;
}

/**
 * Calculate slippage for a trade
 */
export function calculateSlippage(price: number, settings: CostConfig): number {
  if (!settings.slippage_enabled) return 0;

  // Random slippage between min and max
  const range = settings.slippage_max - settings.slippage_min;
  const slippagePercent = settings.slippage_min + (Math.random() * range);

  return price * slippagePercent;
}

/**
 * Calculate net amount after fees and slippage for a BUY order
 */
export function calculateNetBuyAmount(
  investment: number,
  price: number,
  settings: CostConfig
): {
  grossAmount: number;
  tradingFee: number;
  slippage: number;
  netAmount: number;
  effectivePrice: number;
} {
  // Gross amount before fees
  const grossAmount = investment / price;

  // Trading fee (0.1% of amount)
  const tradingFee = grossAmount * settings.binance_fee_rate;

  // Slippage (always works against trader - higher buy price)
  const slippagePercent = settings.slippage_enabled
    ? settings.slippage_min + (Math.random() * (settings.slippage_max - settings.slippage_min))
    : 0;
  const slippageAmount = grossAmount * slippagePercent;

  // Net amount received
  const netAmount = grossAmount - tradingFee - slippageAmount;

  // Effective price paid
  const effectivePrice = investment / netAmount;

  return {
    grossAmount,
    tradingFee,
    slippage: slippageAmount,
    netAmount,
    effectivePrice,
  };
}

/**
 * Calculate net value after fees and slippage for a SELL order
 */
export function calculateNetSellValue(
  amount: number,
  price: number,
  settings: CostConfig
): {
  grossValue: number;
  tradingFee: number;
  slippage: number;
  netValue: number;
  effectivePrice: number;
} {
  // Gross value before fees
  const grossValue = amount * price;

  // Trading fee (0.1% of value)
  const tradingFee = grossValue * settings.binance_fee_rate;

  // Slippage (always works against trader - lower sell price)
  const slippagePercent = settings.slippage_enabled
    ? settings.slippage_min + (Math.random() * (settings.slippage_max - settings.slippage_min))
    : 0;
  const slippageValue = grossValue * slippagePercent;

  // Net value received
  const netValue = grossValue - tradingFee - slippageValue;

  // Effective price received
  const effectivePrice = netValue / amount;

  return {
    grossValue,
    tradingFee,
    slippage: slippageValue,
    netValue,
    effectivePrice,
  };
}

/**
 * Load preset cost configuration
 */
export async function loadCostPreset(preset: 'zero' | 'standard' | 'conservative' | 'high_volume'): Promise<void> {
  let config: Partial<CostConfig>;

  switch (preset) {
    case 'zero':
      // No costs - pure strategy testing
      config = {
        openai_api_cost: 0,
        claude_api_cost: 0,
        deepseek_api_cost: 0,
        qwen_api_cost: 0,
        binance_fee_rate: 0,
        slippage_enabled: false,
      };
      break;

    case 'standard':
      // Typical retail trader
      config = {
        openai_api_cost: 0.025,
        claude_api_cost: 0.020,
        deepseek_api_cost: 0.004,
        qwen_api_cost: 0.003,
        binance_fee_rate: 0.001, // 0.1%
        slippage_enabled: true,
        slippage_min: 0.0005,
        slippage_max: 0.0015,
      };
      break;

    case 'conservative':
      // Higher cost assumptions
      config = {
        openai_api_cost: 0.030,
        claude_api_cost: 0.024,
        deepseek_api_cost: 0.005,
        qwen_api_cost: 0.004,
        binance_fee_rate: 0.001, // 0.1%
        slippage_enabled: true,
        slippage_min: 0.001, // 0.1%
        slippage_max: 0.002, // 0.2%
      };
      break;

    case 'high_volume':
      // VIP trader with discounts
      config = {
        openai_api_cost: 0.025,
        claude_api_cost: 0.020,
        deepseek_api_cost: 0.004,
        qwen_api_cost: 0.003,
        binance_fee_rate: 0.0004, // 0.04% VIP discount
        slippage_enabled: true,
        slippage_min: 0.0002, // 0.02%
        slippage_max: 0.0008, // 0.08%
      };
      break;
  }

  await updateCostSettings(config);
}

/**
 * Clear cost cache (force refresh on next request)
 */
export function clearCostCache(): void {
  costCache = null;
}
