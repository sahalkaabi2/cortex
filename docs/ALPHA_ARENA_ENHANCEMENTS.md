# Alpha Arena-Inspired Enhancements

This document summarizes the enhancements made to the Cortex platform, inspired by the Nof1 Alpha Arena research article.

## 🎯 **Phase 1 Completed: Prompt Engineering Revolution**

### ✅ **1.1 Enhanced Type System**
- **File**: `lib/types.ts`
- **Changes**:
  - Added `ema_20`, `ema_50` for multi-period EMA analysis
  - Added `rsi_7` for short-term momentum (alongside existing `rsi_14`)
  - Added optional multi-timeframe fields: `price_history_3m`, `rsi_history_3m`, `ema_history_3m`
  - Added 4-hour context fields: `price_4h`, `volume_4h`, `rsi_4h`, `macd_4h`
  - Extended `LLMResponse` interface with:
    - `confidence` (0-1 scale)
    - `profit_target` (price level for take-profit)
    - `stop_loss` (price level for stop-loss)
    - `invalidation_condition` (string describing when trade thesis is invalidated)
    - `risk_usd` (dollar amount at risk)
  - Added `TraderPerformanceMetrics` interface for comprehensive performance tracking

### ✅ **1.2 Sophisticated Trading Prompt (Alpha Arena Style)**
- **File**: `lib/llm/base.ts`
- **Key Improvements**:

#### **Structure & Formatting**
```
It has been {N} minutes since you started trading.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**
```
- Explicit data ordering (critical for LLM interpretation)
- Multi-timeframe presentation (3-minute intraday + 4-hour context)
- Clear section headers and organization

#### **Market Data Enrichment**
- Current state: `current_price`, `current_ema20`, `current_macd`, `current_rsi (7 period)`
- Intraday series at 3-minute intervals (last 10 data points)
- Longer-term 4-hour context
- 24H volume and price change

#### **Account Performance Context**
- **Current Total Return (%)**: Shows overall performance
- **Sharpe Ratio**: Risk-adjusted return metric provided to agent
- **Available Cash**: Clear capital constraints
- **Current Account Value**: Total portfolio value (cash + positions)
- **Position details**: Entry price, current price, unrealized P&L, P&L percentage

#### **Structured Exit Plan Requirements**
The prompt now REQUIRES agents to provide for every BUY decision:
1. **profit_target**: Specific price level for taking profit
2. **stop_loss**: Specific price level for cutting losses
3. **invalidation_condition**: Pre-registered signal that voids the trade (e.g., "BTC breaks below $40,000, confirming downtrend")
4. **confidence**: Self-assessment on 0-1 scale with clear bands:
   - 0.9-1.0 = Very high confidence
   - 0.7-0.89 = High confidence
   - 0.5-0.69 = Medium confidence
   - 0.3-0.49 = Low confidence
   - 0.0-0.29 = Very low confidence
5. **risk_usd**: Dollar amount being risked

#### **Example-Based Learning**
The prompt includes three concrete examples:
- **BUY example**: Shows proper exit plan structure
- **SELL example**: Shows how to close positions
- **HOLD example**: Shows when to wait

### ✅ **1.3 Performance Metrics Module**
- **File**: `lib/performance-metrics.ts`
- **Functions**:
  - `calculateSharpeRatio()`: Risk-adjusted return metric
  - `calculateTotalReturn()`: Total return percentage
  - `calculateWinRate()`: Percentage of profitable trades
  - `calculateAvgHoldingPeriod()`: Average position duration in hours
  - `calculateTradeFrequency()`: Trades per day
  - `calculateAvgPositionSize()`: Average USD per position
  - `calculateProfitFactor()`: Gross profit / Gross loss
  - `calculateMaxDrawdown()`: Largest peak-to-trough decline
  - `getAllPerformanceMetrics()`: Aggregate function for all metrics
  - `getMinutesSinceStart()`: Time elapsed since trading began

### ✅ **1.4 Updated LLM Providers**
- **Files**: `lib/llm/openai.ts`, `lib/llm/claude.ts`, `lib/llm/deepseek.ts`, `lib/llm/qwen.ts`
- **Changes**:
  - All providers now accept `traderId` parameter
  - All providers use async `createTradingPrompt()` function
  - All providers parse and return structured exit plan fields
  - Enhanced system prompts emphasizing discipline and structured planning
  - Increased `max_tokens` for Claude (1024 → 2048) to handle richer responses

### ✅ **1.5 Trading Engine Enhancements**
- **File**: `lib/trading-engine.ts`
- **Changes**:

#### **Decision Processing**
- Pass `traderId` to LLM providers for performance metrics
- Store exit plan details in `llm_decisions` table:
  - `confidence`
  - `profit_target`
  - `stop_loss_price`
  - `invalidation_condition`
  - `risk_usd`

#### **Position Management**
- `executeBuy()` now accepts optional `exitPlan` parameter
- Stores exit plan details in `positions` table:
  - `profit_target_price`
  - `invalidation_condition`
  - `confidence`
- Uses agent-specified stop loss or defaults to 5%

#### **Auto-Execution (Alpha Arena-style)**
- Renamed `checkStopLosses()` to reflect dual functionality
- Now monitors BOTH:
  - **Profit Targets**: Auto-sells when price >= profit_target_price
  - **Stop Losses**: Auto-sells when price <= stop_loss_price
- Console logging with clear indicators:
  - `✓ Profit target hit for BTC at $45,000`
  - `✗ Stop loss triggered for ETH at $3,000`

---

## 📊 **What This Achieves**

### **Immediate Benefits**
1. **Exit Plan Discipline**: Every trade now has a structured plan, preventing emotional/erratic decisions
2. **Risk Management**: Explicit risk quantification (`risk_usd`, `stop_loss`) enforces careful position sizing
3. **Performance Awareness**: Agents see their Sharpe ratio and total return, encouraging risk-adjusted thinking
4. **Accountability**: Confidence scores reveal how well agents calibrate their certainty vs. outcomes
5. **Automated Risk Control**: Profit targets and stop losses execute automatically

### **Research Capabilities Unlocked**
Following Alpha Arena's methodology, you can now analyze:
1. **Confidence Calibration**: Do high-confidence trades actually perform better?
2. **Exit Plan Adherence**: Do agents stick to their plans or deviate?
3. **Risk Posture**: Which LLMs size positions conservatively vs. aggressively?
4. **Profit Factor**: Gross gains vs. gross losses per LLM
5. **Sharpe Ratio Trends**: Which LLMs deliver better risk-adjusted returns?

---

## 🚧 **Still TODO: Database Schema Updates**

### **Required Supabase Migrations**

#### **1. Update `llm_decisions` table**
```sql
ALTER TABLE llm_decisions
ADD COLUMN confidence DECIMAL(3,2),
ADD COLUMN profit_target DECIMAL(20,8),
ADD COLUMN stop_loss_price DECIMAL(20,8),
ADD COLUMN invalidation_condition TEXT,
ADD COLUMN risk_usd DECIMAL(20,2);
```

#### **2. Update `positions` table**
```sql
ALTER TABLE positions
ADD COLUMN profit_target_price DECIMAL(20,8),
ADD COLUMN invalidation_condition TEXT,
ADD COLUMN confidence DECIMAL(3,2);
```

---

## 📈 **Next Phase: Market Data Enhancement**

### **To Implement (Phase 2)**
The types and prompt are READY for multi-timeframe data, but we need to enhance:

#### **File: `lib/binance.ts` or new `lib/market-data.ts`**
- Collect historical price arrays (last 10 data points at 3-min intervals)
- Calculate RSI-7 (short-term momentum)
- Calculate EMA-20 and EMA-50
- Fetch 4-hour timeframe data for longer-term context
- Populate optional fields: `price_history_3m`, `rsi_history_3m`, `ema_history_3m`, etc.

---

## 🎨 **UI Updates Needed**

### **Display Exit Plans**
- **File**: `components/activity-feed.tsx` (Decisions tab)
- Show confidence score as a colored badge or bar
- Display profit target, stop loss, invalidation condition
- Add visual indicators for high/medium/low confidence

### **Display Positions with Exit Plans**
- **File**: `components/activity-feed.tsx` (Positions tab)
- Show profit target and stop loss prices
- Display distance to profit target / stop loss as percentage
- Show invalidation condition below position details

### **Performance Metrics Dashboard**
- **New Component**: `components/performance-metrics.tsx`
- Display Sharpe ratio, win rate, avg holding period, profit factor
- Comparative charts across LLMs
- Confidence calibration chart (predicted vs. actual outcomes)

---

## 🔬 **Research Opportunities (Alpha Arena-Inspired)**

With these enhancements, you can now investigate:

### **Behavioral Differences**
1. **Confidence Patterns**: Which LLM is most/least confident? Is high confidence correlated with better outcomes?
2. **Exit Plan Tightness**: Distance between stop loss and profit target (as % of entry price)
3. **Position Sizing**: Do LLMs vary their position sizes based on confidence?
4. **Holding Periods**: Average time from entry to exit per LLM

### **Prompt Sensitivity Testing**
Following Alpha Arena's findings on brittle behaviors:
1. **Ordering Bias**: Does reversing data order (newest → oldest) confuse LLMs?
2. **Ambiguous Terms**: Test variations like "free collateral" vs. "available cash"
3. **Rule-Gaming**: Do LLMs exploit loopholes in trading rules?
4. **Self-Referential Confusion**: Do LLMs contradict their own exit plans?

### **Statistical Rigor**
1. Run multiple seasons (reset balances between runs)
2. Track inter-season consistency
3. Calculate confidence intervals for performance metrics
4. Test statistical significance of LLM performance differences

---

## 📝 **Key Learnings from Alpha Arena**

### **1. Prompt Quality is Everything**
The richness and structure of prompts dramatically affects agent behavior. Our new prompt:
- Provides context (time elapsed, performance metrics)
- Enforces discipline (required exit plans)
- Reduces ambiguity (explicit data ordering, clear definitions)
- Teaches by example (three concrete JSON examples)

### **2. Exit Plans Create Accountability**
Requiring structured exit plans prevents:
- Over-trading (agents must justify each trade)
- Emotional decisions (pre-committed exits)
- Inconsistent risk management (explicit risk_usd calculation)

### **3. Brittle Behaviors Exist**
Alpha Arena found LLMs struggle with:
- **Data ordering**: Solved by explicit "OLDEST → NEWEST" labels
- **Ambiguous terms**: Solved by clear definitions (e.g., "Available Cash")
- **Rule-gaming**: Mitigated by structured output requirements
- **Self-reference**: Monitored via exit plan adherence tracking

### **4. Statistical Rigor Matters**
Single runs prove nothing. Need:
- Multiple seasons
- Long evaluation periods (weeks, not days)
- Different market conditions (bull, bear, sideways)
- Confidence intervals on performance metrics

---

## 🚀 **How to Test the Enhancements**

### **Step 1: Apply Database Migrations**
Run the SQL commands above in your Supabase dashboard to add new columns.

### **Step 2: Clear Existing Data**
Use the "DELETE ALL DATA" button in settings to start fresh with the new schema.

### **Step 3: Start Trading**
Click START and observe the console logs. You should see:
- Richer prompts being sent to LLMs
- Confidence scores in decisions
- Profit targets and stop losses being set
- Auto-execution messages when targets/stops are hit

### **Step 4: Analyze Behavior**
After a few hours of trading, check:
- Do LLMs provide confidence scores?
- Are exit plans reasonable (not too tight, not too loose)?
- Do profit targets and stop losses trigger correctly?
- How do Sharpe ratios compare across LLMs?

---

## 📚 **References**

- **Alpha Arena Article**: Nof1.ai "Exploring the Limits of Large Language Models as Quant Traders"
- **Key Concepts**:
  - Mid-to-low frequency trading (MLFT): Decisions every 2-3 minutes vs. microsecond HFT
  - Exit plan discipline: Profit targets, stop losses, invalidation conditions
  - Sharpe ratio: (Average Return - Risk-Free Rate) / Standard Deviation of Returns
  - Confidence calibration: Predicted confidence vs. actual outcomes

---

## ✨ **Summary**

We've successfully implemented **Phase 1** of the Alpha Arena-inspired enhancements:

✅ **Sophisticated prompt engineering** with multi-timeframe structure
✅ **Exit plan requirements** (profit targets, stop losses, invalidation conditions)
✅ **Performance metrics** (Sharpe ratio, win rate, profit factor, etc.)
✅ **Auto-execution** of profit targets and stop losses
✅ **Structured output** with confidence scores and risk quantification

**Next Steps**:
1. Apply database migrations
2. Enhance market data collection (multi-timeframe, historical arrays)
3. Update UI to display exit plans and confidence scores
4. Implement behavioral analytics dashboard

This transforms the platform from a simple LLM trading comparison into a **rigorous research environment** capable of uncovering meaningful insights about LLM decision-making under uncertainty.
