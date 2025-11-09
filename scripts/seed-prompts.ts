/**
 * Seed Default Prompts
 * Run with: npx tsx scripts/seed-prompts.ts
 * Or source .env.local first: source .env.local && npx tsx scripts/seed-prompts.ts
 */

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_PROMPTS = [
  {
    name: 'Alpha Arena',
    description: 'Comprehensive trading prompt with detailed market data, technical indicators, and structured exit planning. Optimized for rigorous analysis.',
    category: 'default',
    is_default: true,
    is_active: true,
    content: `It has been {{MINUTES}} minutes since you started trading.

Below, we are providing you with market data, price history, technical indicators, and your current account state so you can discover profitable opportunities.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise, intraday series are provided at **3-minute intervals**. Longer-term context is provided at 4-hour intervals when available.

---

### CURRENT MARKET STATE FOR ALL COINS

{{MARKET_DATA}}

---

### HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

**Current Total Return (percent):** {{TOTAL_RETURN_PERCENT}}%

**Available Cash:** ${{BALANCE}}

**Current Account Value:** ${{ACCOUNT_VALUE}}

**Current live positions & performance:**
{{POSITIONS}}

**Sharpe Ratio:** {{SHARPE_RATIO}}

---

## TRADING RULES & GUIDELINES

1. **Position Limits:** You can only hold ONE position per coin at a time. You currently have {{POSITION_COUNT}} open position(s).

2. **Capital Management:** You have ${{BALANCE}} available cash. Manage your position sizing carefully - don't invest all capital at once.

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

Make your decision based on rigorous technical analysis, risk management principles, and the current market context.`,
  },
  {
    name: 'Minimal Trader',
    description: 'Simplified trading prompt focusing on essential market data and quick decision-making. Best for rapid trading cycles.',
    category: 'default',
    is_default: true,
    is_active: false,
    content: `Trading Session: {{MINUTES}} minutes

## MARKET DATA
{{MARKET_DATA}}

## YOUR ACCOUNT
Balance: ${{BALANCE}}
Total Value: ${{ACCOUNT_VALUE}}
Positions: {{POSITION_COUNT}}
{{POSITIONS}}

## INSTRUCTIONS
- Analyze market trends and make ONE decision: BUY, SELL, or HOLD
- For BUY: specify profit_target, stop_loss, and risk amount
- Respond in JSON format only

## RESPOND IN JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "coin": "BTC" | "ETH" | "SOL" | "BNB" | "XRP",
  "amount": <number>,
  "reasoning": "<brief explanation>",
  "confidence": <0-1>,
  "profit_target": <number>,
  "stop_loss": <number>,
  "invalidation_condition": "<string>",
  "risk_usd": <number>
}`,
  },
  {
    name: 'Verbose Analyst',
    description: 'Highly detailed prompt with extensive guidelines and examples. Encourages thorough analysis and comprehensive reasoning.',
    category: 'default',
    is_default: true,
    is_active: false,
    content: `# COMPREHENSIVE TRADING SESSION ANALYSIS

## SESSION OVERVIEW
You have been trading for {{MINUTES}} minutes. Your performance is tracked continuously against benchmarks.

**Your Current Return:** {{TOTAL_RETURN_PERCENT}}%
**Your Sharpe Ratio:** {{SHARPE_RATIO}}

---

## COMPLETE MARKET STATE

Below is the complete market data for all available coins. Each data point is ordered from OLDEST to NEWEST, meaning the last value in each array is the most recent.

{{MARKET_DATA}}

---

## YOUR TRADING ACCOUNT STATUS

**Cash Available:** ${{BALANCE}}
**Total Account Value:** ${{ACCOUNT_VALUE}}
**Number of Open Positions:** {{POSITION_COUNT}}

### Current Positions:
{{POSITIONS}}

---

## COMPREHENSIVE TRADING RULES

### 1. Position Management
- **ONE position per coin** - You cannot open multiple positions in the same coin
- Currently you have {{POSITION_COUNT}} position(s) open
- Consider diversification across multiple assets

### 2. Capital Allocation Strategy
- Available cash: ${{BALANCE}}
- Never allocate all capital to a single trade
- Consider position sizing relative to your confidence level
- Higher confidence trades can justify larger allocations

### 3. Technical Analysis Framework
You have access to multiple timeframes and indicators:
- **Short-term (3-min):** Use for entry timing and momentum confirmation
- **Mid-term (indicators):** RSI, EMA, MACD for trend analysis
- **Long-term (4H):** Use for overall context and trend direction

Key indicators explained:
- **RSI (7 & 14 period):** Overbought >70, Oversold <30
- **EMA (12, 20, 26, 50):** Price above EMA = bullish, below = bearish
- **MACD:** Positive crossover = bullish, negative = bearish

### 4. Mandatory Exit Planning (for ALL BUY orders)
Every BUY decision requires a complete exit plan:

**profit_target:**
- Price level where you'll take profit
- Should be based on resistance levels or technical targets
- Example: If buying BTC at $42,000, target might be $45,000

**stop_loss:**
- Price level where you'll cut losses
- Typically 3-7% below entry for aggressive, 2-3% for conservative
- Must be below recent support levels

**invalidation_condition:**
- Specific market event that would void your thesis
- Must be observable and measurable
- Examples:
  - "BTC closes below $40,000 on 4H timeframe"
  - "RSI drops below 30 indicating strong bearish momentum"
  - "BTC loses correlation with equities, suggesting risk-off mode"

**risk_usd:**
- Dollar amount you're putting at risk
- Calculate: (Entry Price - Stop Loss) × Position Size
- Should be reasonable relative to your balance

### 5. Confidence Assessment Guidelines
Rate your decision confidence from 0 to 1:

**0.9-1.0 (Very High):**
- Multiple strong confluent signals
- Clear trend direction
- Low market volatility risk
- High probability setup

**0.7-0.89 (High):**
- Several confirming indicators
- Decent trend clarity
- Manageable risk

**0.5-0.69 (Medium):**
- Mixed signals but opportunity present
- Moderate uncertainty
- Requires careful position sizing

**0.3-0.49 (Low):**
- Weak setup but potential upside
- High uncertainty
- Only for small positions

**0.0-0.29 (Very Low):**
- Highly speculative
- Avoid unless risk tolerance is very high

### 6. Data Interpretation Best Practices
- All arrays show **OLDEST → NEWEST** (last value = most recent)
- Look for trends in the data, not just current values
- Compare short-term vs long-term indicators for divergences
- Volume confirmation strengthens price moves

### 7. Risk Management Philosophy
- Never risk more than 5% of your total account on one trade
- Consider correlation - don't have all positions in correlated assets
- Monitor your Sharpe Ratio - higher is better (above 1.0 is good)
- If uncertain, HOLD is always a valid decision

---

## RESPONSE FORMAT (STRICT JSON)

Respond ONLY in valid JSON format. Do not include any text outside the JSON structure.

{
  "action": "BUY" | "SELL" | "HOLD",
  "coin": "BTC" | "ETH" | "SOL" | "BNB" | "XRP" (required for BUY/SELL),
  "amount": <number> (for BUY: dollar amount to invest, for SELL: units to sell),
  "reasoning": "<detailed analysis: why this coin? why now? what's the setup? what's the strategy?>",
  "confidence": <number 0-1>,
  "profit_target": <number> (required for BUY),
  "stop_loss": <number> (required for BUY),
  "invalidation_condition": "<specific observable condition>" (required for BUY),
  "risk_usd": <number> (required for BUY)
}

### Example Responses:

**Strong BUY Setup:**
{
  "action": "BUY",
  "coin": "BTC",
  "amount": 500,
  "reasoning": "BTC showing strong bullish reversal. Price broke above EMA20 and EMA50 with increasing volume. RSI at 58 showing momentum without being overbought. MACD just crossed positive. 4H timeframe confirms uptrend recovery from oversold RSI. Targeting resistance at $45,000. Stop loss at $41,500 protects against false breakout.",
  "confidence": 0.78,
  "profit_target": 45000,
  "stop_loss": 41500,
  "invalidation_condition": "If BTC closes below $41,000 on 4H timeframe, invalidating bullish structure and suggesting continued downtrend",
  "risk_usd": 285
}

**Profit Taking SELL:**
{
  "action": "SELL",
  "coin": "ETH",
  "amount": 0.5,
  "reasoning": "ETH reached profit target at $3,200 (+8% gain). RSI now at 76 showing overbought conditions. MACD showing early bearish divergence. Taking profit while momentum is still positive to lock in gains.",
  "confidence": 0.85,
  "profit_target": null,
  "stop_loss": null,
  "invalidation_condition": null,
  "risk_usd": null
}

**Strategic HOLD:**
{
  "action": "HOLD",
  "coin": null,
  "amount": null,
  "reasoning": "Current positions performing well with unrealized gains. Market showing consolidation pattern - no clear breakout yet. Waiting for BTC to either break above $43,500 resistance for bullish continuation or below $41,000 support for bearish confirmation. Better to preserve capital and wait for high-probability setup than force a trade.",
  "confidence": 0.68,
  "profit_target": null,
  "stop_loss": null,
  "invalidation_condition": null,
  "risk_usd": null
}

---

Make your decision methodically. Analyze the data, assess the risk, plan your exit, and execute with confidence.`,
  },
];

async function seedPrompts() {
  console.log('🌱 Starting prompt seeding...\n');

  for (const promptTemplate of DEFAULT_PROMPTS) {
    console.log(`📝 Seeding: "${promptTemplate.name}"...`);

    try {
      // Check if prompt already exists
      const { data: existing } = await supabase
        .from('prompt_templates')
        .select('id')
        .eq('name', promptTemplate.name)
        .single();

      if (existing) {
        console.log(`   ⚠️  Already exists, skipping\n`);
        continue;
      }

      // Insert template
      const { data: template, error: templateError } = await supabase
        .from('prompt_templates')
        .insert({
          name: promptTemplate.name,
          description: promptTemplate.description,
          content: promptTemplate.content,
          category: promptTemplate.category,
          is_default: promptTemplate.is_default,
          is_active: promptTemplate.is_active,
          validation_status: {
            isValid: true,
            errors: [],
            warnings: [],
            fields_used: ['MINUTES', 'MARKET_DATA', 'BALANCE', 'POSITIONS', 'ACCOUNT_VALUE', 'POSITION_COUNT', 'TOTAL_RETURN_PERCENT', 'SHARPE_RATIO'],
            fields_missing: [],
            fields_wasted: [],
            score: 100,
          },
        })
        .select()
        .single();

      if (templateError) {
        console.error(`   ❌ Error:`, templateError);
        continue;
      }

      // Create initial version
      const { error: versionError } = await supabase
        .from('prompt_versions')
        .insert({
          template_id: template.id,
          version_number: 1,
          content: promptTemplate.content,
          change_summary: 'Initial version',
        });

      if (versionError) {
        console.error(`   ❌ Error creating version:`, versionError);
        continue;
      }

      console.log(`   ✅ Created successfully (ID: ${template.id})\n`);
    } catch (error) {
      console.error(`   ❌ Unexpected error:`, error);
    }
  }

  console.log('🎉 Prompt seeding completed!\n');
}

seedPrompts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
