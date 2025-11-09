import { LLMResponse, MarketData, PortfolioState } from '../types';
import { getAllPerformanceMetrics, getMinutesSinceStart } from '../performance-metrics';
import { supabase } from '../supabase';

export interface LLMProvider {
  name: string;
  makeDecision(
    marketData: MarketData[],
    portfolioState: PortfolioState,
    traderId?: string
  ): Promise<LLMResponse>;
}

/**
 * Fetch active prompt template from Supabase
 * Returns null if no active prompt is set
 */
async function fetchActivePrompt(): Promise<string | null> {
  try {
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select('content')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[PROMPT] Error fetching active prompt:', error);
      return null;
    }

    return template?.content || null;
  } catch (error) {
    console.error('[PROMPT] Error fetching active prompt:', error);
    return null;
  }
}

/**
 * Fill prompt template with actual market data
 * Replaces placeholders like {{BALANCE}}, {{PRICE}}, etc.
 */
function fillPromptTemplate(
  template: string,
  marketData: MarketData[],
  portfolioState: PortfolioState,
  minutesSinceStart: number,
  performanceMetrics: any,
  recentDecisions: string
): string {
  const totalReturnPercent = performanceMetrics?.total_return_percent || 0;
  const sharpeRatio = performanceMetrics?.sharpe_ratio || 0;
  const totalAccountValue = portfolioState.balance + portfolioState.positions.reduce((sum, p) => sum + (p.current_price * p.amount), 0);

  // Format market data sections
  const marketDataSections = marketData
    .map((m) => {
      const priceHistoryStr = m.price_history_3m
        ? `Mid prices (3-min intervals, **OLDEST → NEWEST**): [${m.price_history_3m.map(p => p.toFixed(2)).join(', ')}]`
        : `Current price: $${m.price.toFixed(2)}`;

      const rsiHistoryStr = m.rsi_history_3m
        ? `RSI (7-period) history: [${m.rsi_history_3m.map(r => r.toFixed(2)).join(', ')}]`
        : `RSI (7-period): ${m.rsi_7.toFixed(2)}, RSI (14-period): ${m.rsi_14.toFixed(2)}`;

      const emaHistoryStr = m.ema_history_3m
        ? `EMA (20-period) history: [${m.ema_history_3m.map(e => e.toFixed(2)).join(', ')}]`
        : `EMA (12): $${m.ema_12.toFixed(2)}, EMA (20): $${m.ema_20.toFixed(2)}, EMA (26): $${m.ema_26.toFixed(2)}, EMA (50): $${m.ema_50.toFixed(2)}`;

      return `
### ALL ${m.coin} DATA

**Current state:**
current_price = ${m.price.toFixed(2)}, current_ema12 = ${m.ema_12.toFixed(2)}, current_ema20 = ${m.ema_20.toFixed(2)}, current_ema26 = ${m.ema_26.toFixed(2)}, current_ema50 = ${m.ema_50.toFixed(2)}, current_macd = ${m.macd.toFixed(3)}, current_rsi (7 period) = ${m.rsi_7.toFixed(3)}

**Intraday series (3-minute intervals, oldest → latest):**
${priceHistoryStr}
${rsiHistoryStr}
${emaHistoryStr}
MACD: ${m.macd.toFixed(4)}, MACD Signal: ${m.macd_signal.toFixed(4)}

**Longer-term context (4-hour timeframe):**
${m.price_4h ? `4H Price: $${m.price_4h.toFixed(2)}, 4H Volume: ${m.volume_4h?.toFixed(0) || 'N/A'}, 4H RSI: ${m.rsi_4h?.toFixed(2) || 'N/A'}, 4H MACD: ${m.macd_4h?.toFixed(3) || 'N/A'}` : 'Not available'}
24H Change: ${m.price_change_24h.toFixed(2)}%, 24H Volume: ${m.volume_24h.toFixed(0)}

---
`;
    })
    .join('\n');

  // Format positions
  const positionsStr =
    portfolioState.positions.length > 0
      ? portfolioState.positions
          .map((p) => {
            const pnlStr = p.pnl >= 0 ? `+$${p.pnl.toFixed(2)}` : `-$${Math.abs(p.pnl).toFixed(2)}`;
            const pnlPct = ((p.pnl / (p.entry_price * p.amount)) * 100).toFixed(2);
            return `{'symbol': '${p.coin}', 'quantity': ${p.amount.toFixed(6)}, 'entry_price': ${p.entry_price.toFixed(2)}, 'current_price': ${p.current_price.toFixed(2)}, 'unrealized_pnl': ${p.pnl.toFixed(2)}, 'pnl_percent': ${pnlPct}%}`;
          })
          .join('\n')
      : 'No open positions';

  // Calculate net spendable balance (after ~0.2% trading costs)
  const netBalance = portfolioState.balance * 0.998;

  // Replace all placeholders
  let filled = template
    .replace(/\{\{MINUTES\}\}/g, minutesSinceStart.toString())
    .replace(/\{\{TOTAL_RETURN_PERCENT\}\}/g, totalReturnPercent.toFixed(2))
    .replace(/\{\{BALANCE\}\}/g, portfolioState.balance.toFixed(2))
    .replace(/\{\{NET_BALANCE\}\}/g, netBalance.toFixed(2))
    .replace(/\{\{ACCOUNT_VALUE\}\}/g, totalAccountValue.toFixed(2))
    .replace(/\{\{POSITION_COUNT\}\}/g, portfolioState.positions.length.toString())
    .replace(/\{\{POSITIONS\}\}/g, positionsStr)
    .replace(/\{\{SHARPE_RATIO\}\}/g, sharpeRatio.toFixed(3))
    .replace(/\{\{MARKET_DATA\}\}/g, marketDataSections)
    .replace(/\{\{RECENT_DECISIONS\}\}/g, recentDecisions);

  return filled;
}

export async function createTradingPrompt(
  marketData: MarketData[],
  portfolioState: PortfolioState,
  traderId?: string
): Promise<string> {
  // Get performance metrics if traderId provided
  let performanceMetrics: any = null;
  let minutesSinceStart = 0;
  let recentDecisions = 'No recent trading history';

  if (traderId) {
    performanceMetrics = await getAllPerformanceMetrics(traderId);
    minutesSinceStart = await getMinutesSinceStart(traderId);

    // Fetch recent decisions (last 10 decisions)
    const { data: decisions } = await supabase
      .from('llm_decisions')
      .select('decision_type, coin, suggested_amount, reasoning, was_executed, created_at')
      .eq('llm_trader_id', traderId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (decisions && decisions.length > 0) {
      // Format recent decisions (newest first)
      recentDecisions = decisions
        .map((d, i) => {
          const timeAgo = minutesSinceStart - Math.floor((Date.now() - new Date(d.created_at).getTime()) / 60000);
          const executedStr = d.was_executed ? '✓ EXECUTED' : '✗ NOT EXECUTED';
          const amountStr = d.suggested_amount !== null ? `$${d.suggested_amount.toFixed(2)}` : 'N/A';
          const coinStr = d.coin || 'N/A';
          return `${i + 1}. [${timeAgo}min ago] ${d.decision_type} ${coinStr} ${amountStr} - ${executedStr}\n   Reason: ${d.reasoning.substring(0, 150)}${d.reasoning.length > 150 ? '...' : ''}`;
        })
        .join('\n\n');
    }
  }

  // Try to fetch active prompt from Supabase
  const activePromptTemplate = await fetchActivePrompt();

  if (activePromptTemplate) {
    console.log('[PROMPT] Using active prompt template from Supabase');
    return fillPromptTemplate(
      activePromptTemplate,
      marketData,
      portfolioState,
      minutesSinceStart,
      performanceMetrics,
      recentDecisions
    );
  }

  // Fall back to default hardcoded prompt
  console.log('[PROMPT] No active prompt found, using default hardcoded prompt');

  // Calculate total return percentage
  const totalReturnPercent = performanceMetrics?.total_return_percent || 0;
  const sharpeRatio = performanceMetrics?.sharpe_ratio || 0;

  // Format market data with Alpha Arena-style structure
  const marketDataSections = marketData
    .map((m) => {
      // Format price history if available (oldest → newest)
      const priceHistoryStr = m.price_history_3m
        ? `Mid prices (3-min intervals, **OLDEST → NEWEST**): [${m.price_history_3m.map(p => p.toFixed(2)).join(', ')}]`
        : '';

      const rsiHistoryStr = m.rsi_history_3m
        ? `RSI (7-period) history: [${m.rsi_history_3m.map(r => r.toFixed(2)).join(', ')}]`
        : '';

      const emaHistoryStr = m.ema_history_3m
        ? `EMA (20-period) history: [${m.ema_history_3m.map(e => e.toFixed(2)).join(', ')}]`
        : '';

      return `
### ALL ${m.coin} DATA

**Current state:**
current_price = ${m.price.toFixed(2)}, current_ema12 = ${m.ema_12.toFixed(2)}, current_ema20 = ${m.ema_20.toFixed(2)}, current_ema26 = ${m.ema_26.toFixed(2)}, current_ema50 = ${m.ema_50.toFixed(2)}, current_macd = ${m.macd.toFixed(3)}, current_rsi (7 period) = ${m.rsi_7.toFixed(3)}

**Intraday series (3-minute intervals, oldest → latest):**
${priceHistoryStr || `Current price: $${m.price.toFixed(2)}`}
${rsiHistoryStr || `RSI (7-period): ${m.rsi_7.toFixed(2)}, RSI (14-period): ${m.rsi_14.toFixed(2)}`}
${emaHistoryStr || `EMA (12): $${m.ema_12.toFixed(2)}, EMA (20): $${m.ema_20.toFixed(2)}, EMA (26): $${m.ema_26.toFixed(2)}, EMA (50): $${m.ema_50.toFixed(2)}`}
MACD: ${m.macd.toFixed(4)}, MACD Signal: ${m.macd_signal.toFixed(4)}

**Longer-term context (4-hour timeframe):**
${m.price_4h ? `4H Price: $${m.price_4h.toFixed(2)}, 4H Volume: ${m.volume_4h?.toFixed(0) || 'N/A'}, 4H RSI: ${m.rsi_4h?.toFixed(2) || 'N/A'}, 4H MACD: ${m.macd_4h?.toFixed(3) || 'N/A'}` : 'Not available'}
24H Change: ${m.price_change_24h.toFixed(2)}%, 24H Volume: ${m.volume_24h.toFixed(0)}

---
`;
    })
    .join('\n');

  // Format positions with liquidation context
  const positionsStr =
    portfolioState.positions.length > 0
      ? portfolioState.positions
          .map(
            (p) => {
              const pnlStr = p.pnl >= 0 ? `+$${p.pnl.toFixed(2)}` : `-$${Math.abs(p.pnl).toFixed(2)}`;
              const pnlPct = ((p.pnl / (p.entry_price * p.amount)) * 100).toFixed(2);
              return `{'symbol': '${p.coin}', 'quantity': ${p.amount.toFixed(6)}, 'entry_price': ${p.entry_price.toFixed(2)}, 'current_price': ${p.current_price.toFixed(2)}, 'unrealized_pnl': ${p.pnl.toFixed(2)}, 'pnl_percent': ${pnlPct}%}`;
            }
          )
          .join('\n')
      : 'No open positions';

  return `It has been ${minutesSinceStart} minutes since you started trading.

Below, we are providing you with market data, price history, technical indicators, and your current account state so you can discover profitable opportunities.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise, intraday series are provided at **3-minute intervals**. Longer-term context is provided at 4-hour intervals when available.

---

### CURRENT MARKET STATE FOR ALL COINS

${marketDataSections}

---

### HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

**Current Total Return (percent):** ${totalReturnPercent.toFixed(2)}%

**Available Cash (gross):** $${portfolioState.balance.toFixed(2)}

**Estimated Spendable Balance (after ~0.2% costs):** $${(portfolioState.balance * 0.998).toFixed(2)}

**Current Account Value:** $${(portfolioState.balance + portfolioState.positions.reduce((sum, p) => sum + (p.current_price * p.amount), 0)).toFixed(2)}

**Current live positions & performance:**
${positionsStr}

**Sharpe Ratio:** ${sharpeRatio.toFixed(3)}

---

### YOUR RECENT TRADING HISTORY

${recentDecisions}

**IMPORTANT:** Review your recent decisions above to avoid repeating the same trades immediately. Consider diversifying across different coins rather than repeatedly trading the same asset.

---

## TRADING RULES & GUIDELINES

1. **Position Limits:** You can only hold ONE position per coin at a time. You currently have ${portfolioState.positions.length} open position(s).

2. **Capital Management:** You have $${portfolioState.balance.toFixed(2)} gross cash ($${(portfolioState.balance * 0.998).toFixed(2)} spendable after costs). Account for trading fees (~0.1%) and slippage (~0.1%) when sizing positions. Don't invest all capital at once.

3. **Technical Analysis:** Use the provided indicators (RSI, EMA, MACD) across multiple timeframes to inform your decisions. Pay attention to both short-term (3-min) and longer-term (4H) context.

4. **Exit Planning:** For every BUY decision, you MUST specify:
   - **profit_target:** Price level where you'll take profit
   - **stop_loss:** Price level where you'll cut losses
   - **invalidation_condition:** A specific market signal that would void your trade thesis (e.g., "BTC breaks below $40,000, confirming downtrend")

5. **Risk Assessment:** Calculate and specify the **risk_usd** - the dollar amount you're putting at risk. This should be informed by your stop loss distance.

6. **Confidence:** Assess your confidence in this decision on a scale from 0 to 1, where:
   - 0.9-1.0 = Very high confidence
   - 0.7-0.89 = High confidence
   - 0.5-0.69 = Medium confidence
   - 0.3-0.49 = Low confidence
   - 0.0-0.29 = Very low confidence

7. **Data Interpretation:** Remember that all price/indicator arrays are ordered **OLDEST → NEWEST**. The last value is the most recent.

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

**Example SELL response (closing a position):**
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
}
