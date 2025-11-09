import { MarketData, PortfolioState } from './types';

/**
 * Generate a preview of what {{POSITIONS}} looks like
 * Shows example positions or actual positions if provided
 */
export function generatePositionsPreview(portfolioState?: PortfolioState): string {
  // If no portfolio state provided, show example data
  if (!portfolioState || portfolioState.positions.length === 0) {
    return `Example with open positions:

{'symbol': 'BTC', 'quantity': 0.025000, 'entry_price': 67500.00, 'current_price': 68234.50, 'unrealized_pnl': 18.36, 'pnl_percent': 1.09%}
{'symbol': 'ETH', 'quantity': 0.500000, 'entry_price': 3420.00, 'current_price': 3456.80, 'unrealized_pnl': 18.40, 'pnl_percent': 1.08%}
{'symbol': 'SOL', 'quantity': 5.000000, 'entry_price': 145.20, 'current_price': 142.80, 'unrealized_pnl': -12.00, 'pnl_percent': -1.65%}

If you have no open positions:

No open positions`;
  }

  // Format actual positions
  return portfolioState.positions
    .map((p) => {
      const pnlPct = ((p.pnl / (p.entry_price * p.amount)) * 100).toFixed(2);
      return `{'symbol': '${p.coin}', 'quantity': ${p.amount.toFixed(6)}, 'entry_price': ${p.entry_price.toFixed(2)}, 'current_price': ${p.current_price.toFixed(2)}, 'unrealized_pnl': ${p.pnl.toFixed(2)}, 'pnl_percent': ${pnlPct}%}`;
    })
    .join('\n');
}

/**
 * Generate a preview of what {{MARKET_DATA}} looks like with real market data
 * This is used in the prompt editor tooltip to show users the actual structure
 */
export function generateMarketDataPreview(marketData: MarketData[], limit: number = 2): string {
  // Limit to first N coins to keep preview readable
  const limitedData = marketData.slice(0, limit);

  const marketDataSections = limitedData
    .map((m) => {
      // Format price history if available (oldest → newest)
      const priceHistoryStr = m.price_history_3m
        ? `Mid prices (3-min intervals, **OLDEST → NEWEST**): [${m.price_history_3m.map(p => p.toFixed(2)).join(', ')}]`
        : `Current price: $${m.price.toFixed(2)}`;

      const rsiHistoryStr = m.rsi_history_3m
        ? `RSI (7-period) history: [${m.rsi_history_3m.map(r => r.toFixed(2)).join(', ')}]`
        : `RSI (7-period): ${m.rsi_7.toFixed(2)}, RSI (14-period): ${m.rsi_14.toFixed(2)}`;

      const emaHistoryStr = m.ema_history_3m
        ? `EMA (20-period) history: [${m.ema_history_3m.map(e => e.toFixed(2)).join(', ')}]`
        : `EMA (12): $${m.ema_12.toFixed(2)}, EMA (20): $${m.ema_20.toFixed(2)}, EMA (26): $${m.ema_26.toFixed(2)}, EMA (50): $${m.ema_50.toFixed(2)}`;

      return `### ALL ${m.coin} DATA

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

---`;
    })
    .join('\n\n');

  const totalCoins = marketData.length;
  const suffix = limit < totalCoins
    ? `\n\n... and ${totalCoins - limit} more coin(s) with the same structure ...`
    : '';

  return marketDataSections + suffix;
}

/**
 * Get a description of what fields are included in {{MARKET_DATA}}
 */
export function getMarketDataFieldsDescription(): string {
  return `{{MARKET_DATA}} is a composite placeholder that expands to include:

For each coin being tracked:

**Current State (1H timeframe):**
- current_price
- current_ema12, current_ema20, current_ema26, current_ema50
- current_macd
- current_rsi (7-period)

**Intraday Series (3-minute intervals):**
- Price history (last 10 values, oldest → newest)
- RSI history (last 10 values)
- EMA history (last 10 values)
- MACD and MACD Signal

**Long-term Context (4-hour timeframe):**
- 4H Price, Volume, RSI, MACD
- 24H Price change percentage
- 24H Trading volume

This data is formatted in markdown and provides the LLM with comprehensive market context for making trading decisions.`;
}
