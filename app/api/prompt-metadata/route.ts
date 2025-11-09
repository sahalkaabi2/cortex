/**
 * Prompt Metadata API
 * Provides detailed information about the LLM prompt template and data field usage
 * Links to health check to show alignment between retrieved data and prompt usage
 */

import { NextResponse } from 'next/server';

// Import health check metadata
const FIELD_METADATA: Record<
  string,
  {
    retrievedFromBinance: boolean;
    usedInPrompt: boolean;
    promptLocation: string | null;
    description: string;
    category: 'base' | 'technical' | 'intraday' | 'long_term';
  }
> = {
  // BASE MARKET DATA (1H timeframe)
  coin: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 48: Market sections header',
    description: 'Coin symbol (BTC, ETH, etc.)',
    category: 'base',
  },
  price: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 51: current_price',
    description: 'Current market price',
    category: 'base',
  },
  volume_24h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 61: 24H Volume',
    description: '24-hour trading volume',
    category: 'base',
  },
  price_change_24h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 61: 24H Change',
    description: '24-hour price change percentage',
    category: 'base',
  },

  // TECHNICAL INDICATORS (1H timeframe)
  ema_12: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Lines 51, 56: current_ema12, EMA (12)',
    description: '12-period exponential moving average',
    category: 'technical',
  },
  ema_20: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Lines 51, 56: current_ema20, EMA (20)',
    description: '20-period exponential moving average',
    category: 'technical',
  },
  ema_26: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Lines 51, 56: current_ema26, EMA (26)',
    description: '26-period exponential moving average',
    category: 'technical',
  },
  ema_50: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 56: EMA (50)',
    description: '50-period exponential moving average',
    category: 'technical',
  },
  rsi_7: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Lines 51, 55: current_rsi (7 period), RSI (7-period)',
    description: '7-period RSI (short-term momentum)',
    category: 'technical',
  },
  rsi_14: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 55: RSI (14-period)',
    description: '14-period RSI (standard momentum)',
    category: 'technical',
  },
  macd: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Lines 51, 57: current_macd, MACD',
    description: 'MACD indicator (trend strength)',
    category: 'technical',
  },
  macd_signal: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 57: MACD Signal',
    description: 'MACD signal line',
    category: 'technical',
  },

  // INTRADAY MULTI-TIMEFRAME (3-min intervals)
  price_history_3m: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 54: Intraday series (price history)',
    description: 'Last 10 prices at 3-min intervals',
    category: 'intraday',
  },
  rsi_history_3m: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 55: RSI history',
    description: 'Last 10 RSI-7 values at 3-min intervals',
    category: 'intraday',
  },
  ema_history_3m: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 56: EMA history',
    description: 'Last 10 EMA-20 values at 3-min intervals',
    category: 'intraday',
  },

  // LONGER-TERM CONTEXT (4H timeframe)
  price_4h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 60: 4H Price',
    description: '4-hour timeframe price',
    category: 'long_term',
  },
  volume_4h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 60: 4H Volume',
    description: '4-hour timeframe volume',
    category: 'long_term',
  },
  rsi_4h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 60: 4H RSI',
    description: '4-hour timeframe RSI-14',
    category: 'long_term',
  },
  macd_4h: {
    retrievedFromBinance: true,
    usedInPrompt: true,
    promptLocation: 'Line 60: 4H MACD',
    description: '4-hour timeframe MACD',
    category: 'long_term',
  },
};

export async function GET() {
  try {
    // Calculate statistics
    const allFields = Object.entries(FIELD_METADATA);
    const retrieved = allFields.filter(([_, f]) => f.retrievedFromBinance);
    const usedInPrompt = allFields.filter(([_, f]) => f.usedInPrompt);
    const optimal = allFields.filter(([_, f]) => f.retrievedFromBinance && f.usedInPrompt);
    const wasted = allFields.filter(([_, f]) => f.retrievedFromBinance && !f.usedInPrompt);
    const errors = allFields.filter(([_, f]) => !f.retrievedFromBinance && f.usedInPrompt);
    const future = allFields.filter(([_, f]) => !f.retrievedFromBinance && !f.usedInPrompt);

    // Group by category
    const byCategory = {
      base: allFields.filter(([_, f]) => f.category === 'base'),
      technical: allFields.filter(([_, f]) => f.category === 'technical'),
      intraday: allFields.filter(([_, f]) => f.category === 'intraday'),
      long_term: allFields.filter(([_, f]) => f.category === 'long_term'),
    };

    // Get full prompt template (simplified version for display)
    const promptTemplate = getPromptTemplate();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats: {
        total_fields: allFields.length,
        retrieved: retrieved.length,
        used_in_prompt: usedInPrompt.length,
        optimal: optimal.length,
        wasted: wasted.length,
        errors: errors.length,
        future: future.length,
      },
      fields: FIELD_METADATA,
      categories: {
        base: {
          label: '📊 BASE MARKET DATA',
          description: '1-hour timeframe base metrics',
          count: byCategory.base.length,
          fields: Object.fromEntries(byCategory.base),
        },
        technical: {
          label: '📈 TECHNICAL INDICATORS (1H)',
          description: 'EMA, RSI, MACD calculated on 1-hour candles',
          count: byCategory.technical.length,
          fields: Object.fromEntries(byCategory.technical),
        },
        intraday: {
          label: '⏱️ INTRADAY MULTI-TIMEFRAME (3-min)',
          description: 'Last 10 data points at 3-minute intervals',
          count: byCategory.intraday.length,
          fields: Object.fromEntries(byCategory.intraday),
        },
        long_term: {
          label: '🕐 LONGER-TERM CONTEXT (4H)',
          description: '4-hour timeframe for broader market view',
          count: byCategory.long_term.length,
          fields: Object.fromEntries(byCategory.long_term),
        },
      },
      prompt_template: promptTemplate,
    });
  } catch (error) {
    console.error('[PROMPT METADATA] Error:', error);
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'Failed to generate prompt metadata',
        message: String(error),
      },
      { status: 500 }
    );
  }
}

// Simplified prompt template for display
function getPromptTemplate() {
  return `It has been ${'{{MINUTES}}'} minutes since you started trading.

Below, we are providing you with market data, price history, technical indicators, and your current account state.

**ALL PRICE/SIGNAL DATA IS ORDERED: OLDEST → NEWEST**
**Timeframes:** 3-minute intervals (intraday), 4-hour intervals (longer-term context)

---

### CURRENT MARKET STATE FOR ALL COINS

### ALL ${'{{COIN}}'} DATA

**Current state:**
current_price = ${'{{price}}'}
current_ema12 = ${'{{ema_12}}'}
current_ema20 = ${'{{ema_20}}'}
current_ema26 = ${'{{ema_26}}'}
current_ema50 = ${'{{ema_50}}'}
current_macd = ${'{{macd}}'}
current_rsi (7 period) = ${'{{rsi_7}}'}

**Intraday series (3-minute intervals, oldest → latest):**
Price history: [${'{{price_history_3m}}'}]
RSI (7-period) history: [${'{{rsi_history_3m}}'}]
EMA (20-period) history: [${'{{ema_history_3m}}'}]
EMA values: EMA (12): ${'{{ema_12}}'}, EMA (20): ${'{{ema_20}}'}, EMA (26): ${'{{ema_26}}'}, EMA (50): ${'{{ema_50}}'}
MACD: ${'{{macd}}'}, MACD Signal: ${'{{macd_signal}}'}

**Longer-term context (4-hour timeframe):**
4H Price: ${'{{price_4h}}'}
4H Volume: ${'{{volume_4h}}'}
4H RSI: ${'{{rsi_4h}}'}
4H MACD: ${'{{macd_4h}}'}
24H Change: ${'{{price_change_24h}}'}%
24H Volume: ${'{{volume_24h}}'}

---

### YOUR ACCOUNT INFORMATION

**Current Total Return:** ${'{{RETURN}}'}%
**Available Cash:** $${'{{BALANCE}}'}
**Current Account Value:** ${'{{ACCOUNT_VALUE}}'}
**Current Positions:** ${'{{POSITIONS}}'}
**Sharpe Ratio:** ${'{{SHARPE}}'}

---

## TRADING RULES & GUIDELINES

1. Position Limits: ONE position per coin. Current: ${'{{POSITION_COUNT}}'} positions
2. Capital Management: $${'{{BALANCE}}'} available cash
3. Technical Analysis: Use RSI, EMA, MACD across timeframes
4. Exit Planning: Specify profit_target, stop_loss, invalidation_condition
5. Risk Assessment: Calculate risk_usd
6. Confidence: 0-1 scale

---

RESPOND IN STRICT JSON FORMAT:
{
  "action": "BUY" | "SELL" | "HOLD",
  "coin": "BTC" | "ETH" | "SOL" | "BNB" | "XRP",
  "amount": <number>,
  "reasoning": "<analysis>",
  "confidence": <0-1>,
  "profit_target": <number>,
  "stop_loss": <number>,
  "invalidation_condition": "<string>",
  "risk_usd": <number>
}`;
}
