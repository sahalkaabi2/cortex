export const CRYPTO_PAIRS = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL'] as const;
export type CryptoPair = typeof CRYPTO_PAIRS[number];

export const LLM_PROVIDERS = ['OpenAI', 'Claude', 'DeepSeek', 'Qwen'] as const;
export type LLMProvider = typeof LLM_PROVIDERS[number];

export type TradingMode = 'paper' | 'live';

export interface MarketData {
  coin: string;
  price: number;
  volume_24h: number;
  price_change_24h: number;
  ema_12: number;
  ema_26: number;
  ema_20: number; // Added for Alpha Arena-style prompts
  ema_50: number; // Added for longer-term context
  rsi_14: number;
  rsi_7: number; // Added for short-term momentum
  macd: number;
  macd_signal: number;
  // Multi-timeframe data (for intraday analysis)
  price_history_3m?: number[]; // Last 10 prices at 3-min intervals
  rsi_history_3m?: number[]; // Last 10 RSI values
  ema_history_3m?: number[]; // Last 10 EMA20 values
  // Longer-term context (4-hour or daily)
  price_4h?: number;
  volume_4h?: number;
  rsi_4h?: number;
  macd_4h?: number;
}

export interface PortfolioState {
  balance: number;
  positions: {
    coin: string;
    amount: number;
    entry_price: number;
    current_price: number;
    pnl: number;
  }[];
}

export interface LLMResponse {
  action: 'BUY' | 'SELL' | 'HOLD';
  coin?: string;
  amount?: number;
  reasoning: string;
  // Alpha Arena-inspired structured output
  confidence?: number; // [0, 1] self-assessment of decision quality
  profit_target?: number; // Price target for taking profit
  stop_loss?: number; // Price level for cutting losses
  invalidation_condition?: string; // Pre-registered signal that voids the plan
  risk_usd?: number; // Dollar amount at risk in this trade
  // Full prompt and response for logging/audit
  prompt_text?: string; // The full prompt sent to the LLM
  raw_response?: string; // The raw response received from the LLM
  // API usage and cost tracking
  usage?: {
    prompt_tokens?: number;      // OpenAI, DeepSeek
    completion_tokens?: number;  // OpenAI, DeepSeek
    total_tokens?: number;       // OpenAI, DeepSeek
    input_tokens?: number;       // Claude
    output_tokens?: number;      // Claude
  };
  calculated_cost?: number; // Actual cost in USD based on usage
}

export interface TradingDecision {
  llmProvider: LLMProvider;
  action: 'BUY' | 'SELL' | 'HOLD';
  coin?: string;
  amount?: number;
  reasoning: string;
  timestamp: string;
}

export interface TraderPerformanceMetrics {
  total_return_percent: number; // Total return as percentage
  sharpe_ratio: number; // Risk-adjusted return metric
  win_rate: number; // Percentage of winning trades
  avg_holding_period_hours: number; // Average time positions are held
  trade_frequency: number; // Trades per day
  avg_position_size_usd: number; // Average dollar amount per position
  max_drawdown_percent: number; // Largest peak-to-trough decline
  profit_factor: number; // Gross profit / Gross loss
}

export interface PredictionData {
  llm_name: string;
  coin: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  current_price: number;
  profit_target: number | null;
  stop_loss_price: number | null;
  created_at: string;
  suggested_amount?: number;
}

export interface DecisionTimestamp {
  timestamp: string;
  llm_count: number;
  coin_count: number;
}

export interface MissingDecision {
  llm: string;
  coin: string;
}

export interface DecisionCoverage {
  total_expected: number;
  total_found: number;
  missing: MissingDecision[];
}

export interface PredictionsResponse {
  predictions: PredictionData[];
  timestamp: string;
  availableTimeRange: {
    earliest: string | null;
    latest: string | null;
  };
  decisionTimestamps: DecisionTimestamp[];
  coverage: DecisionCoverage;
}
