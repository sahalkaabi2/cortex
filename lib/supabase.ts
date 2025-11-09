import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface LLMTrader {
  id: string;
  name: string;
  provider: string;
  initial_balance: number;
  current_balance: number;
  total_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_llm_api_cost: number;
  total_trading_fees: number;
  llm_call_count: number;
  total_tokens_used: number;
  total_slippage_cost: number;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  llm_trader_id: string;
  coin: string;
  entry_price: number;
  current_price: number;
  amount: number;
  investment_value: number;
  current_value: number;
  pnl: number;
  pnl_percentage: number;
  stop_loss_price?: number;
  profit_target_price?: number;
  invalidation_condition?: string;
  confidence?: number;
  opened_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Trade {
  id: string;
  llm_trader_id: string;
  position_id?: string;
  action: 'BUY' | 'SELL';
  coin: string;
  price: number;
  amount: number;
  total_value: number;
  pnl?: number;
  pnl_percentage?: number;
  reasoning?: string;
  is_paper_trade: boolean;
  trading_fee: number;
  slippage: number;
  gross_amount?: number;
  net_amount?: number;
  executed_at: string;
}

export interface LLMDecision {
  id: string;
  llm_trader_id: string;
  decision_type: 'BUY' | 'SELL' | 'HOLD';
  coin?: string;
  suggested_amount?: number;
  reasoning: string;
  market_data?: any;
  portfolio_state?: any;
  was_executed: boolean;
  trade_id?: string;
  api_cost: number;
  token_count?: number;
  prompt_text?: string;
  raw_response?: string;
  confidence?: number;
  profit_target?: number;
  stop_loss_price?: number;
  invalidation_condition?: string;
  risk_usd?: number;
  created_at: string;
}

export interface MarketSnapshot {
  id: string;
  coin: string;
  price: number;
  volume_24h?: number;
  price_change_24h?: number;
  ema_12?: number;
  ema_26?: number;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  snapshot_at: string;
}

export interface Benchmark {
  id: string;
  strategy: string;
  initial_balance: number;
  current_value: number;
  holdings: any;
  total_pnl: number;
  pnl_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CostSetting {
  id: string;
  key: string;
  value: number;
  description?: string;
  category: string;
  created_at: string;
  updated_at: string;
}
