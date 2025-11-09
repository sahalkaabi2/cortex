# Pre-Experiment Implementation Plan
## Critical Tasks Before Starting 1-2 Week Cortex Trading Test

**Status:** Planning Phase
**Created:** November 2, 2025
**Target:** Complete before starting actual experiment

---

## 🎯 Objective

Ensure the LLM crypto trading experiment is production-ready, safe, and scientifically valid for a 1-2 week autonomous test period.

---

## Phase 0: Binance Integration Testing & Validation ⚠️ CRITICAL

### Why This Matters
We need to verify that actual Binance trading works correctly with real (small) trades before committing to a long experiment. This validates that our integration sends/receives correct data and uses proper APIs.

### 1. Create Binance Test Suite API
**File:** `app/api/test/binance/route.ts`

**Purpose:** Comprehensive testing of all Binance API interactions

**Tests to Include:**
- ✅ Market data fetching for all 5 coins (BTC, ETH, SOL, BNB, XRP)
- ✅ Order placement with minimal amounts ($1-2)
- ✅ Order status tracking and confirmation
- ✅ Balance retrieval and update verification
- ✅ Fee calculation validation
- ✅ Error handling (invalid orders, insufficient balance, network errors)
- ✅ Rate limit testing
- ✅ Multi-timeframe data accuracy (1H, 3m, 4H)

**Output:** JSON report with pass/fail for each test

### 2. Create Small Trade Test Mode
**File:** `lib/trading-engine.ts` (update)

**Purpose:** Allow testing with real money but minimal risk

**Features:**
- Add `testMode` boolean flag
- Limit trades to $1-5 per position
- Set `maxTestTrades` per LLM (default: 2)
- Override risk settings for small amounts
- Log all test trades separately

**Usage:** Run 1-2 trading cycles with real execution but tiny amounts

### 3. Create Binance Integration Validator
**File:** `lib/binance-validator.ts` (new)

**Purpose:** Pre-flight checks for Binance API

**Validations:**
- API key permissions (spot trading enabled)
- Withdrawal disabled (safety)
- IP whitelist status (if enabled)
- Minimum order sizes per coin
- Test all 5 USDT trading pairs
- Verify response times (<2 seconds)
- Check rate limits (current usage vs limits)
- Validate historical data accuracy

### 4. Create Data Reconciliation Tool
**File:** `app/api/test/reconcile/route.ts`

**Purpose:** Verify our data matches Binance reality

**Features:**
- Fetch trade history from Binance API
- Compare against our `trades` table
- Check balances match exactly (our calculation vs Binance account)
- Identify missing or duplicated trades
- Verify fee calculations match actual fees charged
- Generate reconciliation report with discrepancies

### 5. Create Integration Test Checklist
**File:** `BINANCE_INTEGRATION_TEST.md`

**Contents:**
```markdown
# Binance Integration Test Checklist

## Pre-Test Setup
- [ ] Binance API key created
- [ ] Spot trading enabled
- [ ] Withdrawal disabled
- [ ] IP whitelist configured (if used)
- [ ] Small test balance available ($20-50 USDT)

## API Tests
- [ ] Can fetch ticker data for all 5 coins
- [ ] Can fetch 1H candles (100 periods)
- [ ] Can fetch 3m candles (100 periods)
- [ ] Can fetch 4H candles (100 periods)
- [ ] Indicators calculate correctly (EMA, RSI, MACD)
- [ ] Can retrieve account balance

## Order Tests
- [ ] Can place MARKET BUY order ($1)
- [ ] Order executes within 5 seconds
- [ ] Receive correct fill price
- [ ] Receive correct executed quantity
- [ ] Fees calculated correctly
- [ ] Balance updates correctly
- [ ] Can place MARKET SELL order ($1)
- [ ] Sell order executes correctly

## Error Handling Tests
- [ ] Invalid symbol returns proper error
- [ ] Insufficient balance returns proper error
- [ ] Invalid quantity returns proper error
- [ ] Network timeout handled gracefully

## Reconciliation
- [ ] Trade history matches our database
- [ ] Balances match exactly
- [ ] Fee totals match

## Sign-Off
Date: ___________
Tester: ___________
Status: PASS / FAIL
Notes: ___________
```

---

## Phase 1: Pre-Flight & Risk Management (P0 - Critical)

### 6. Create Pre-Flight Check System
**File:** `app/api/preflight/route.ts`

**Purpose:** Comprehensive system validation before starting experiment

**Checks:**
1. **API Keys Validation**
   - OpenAI: Test with sample completion request
   - Claude: Test with sample completion request
   - DeepSeek: Test with sample completion request
   - Qwen: Test with sample completion request
   - Binance: Test with balance query

2. **Binance Data Quality**
   - Fetch market data for all 5 coins
   - Verify no NaN values in indicators
   - Check timestamps are recent (<5 minutes old)
   - Validate price ranges are reasonable

3. **Database Health**
   - Test Supabase connection
   - Verify all tables exist
   - Check schema matches expected structure
   - Test read/write operations

4. **Configuration Validation**
   - Cost settings configured
   - Risk limits configured
   - Enabled LLMs set
   - Trading interval set

5. **Binance Integration Tests**
   - Run full integration test suite
   - All tests must pass

**Output:** GO/NO-GO report with traffic light status (🟢🟡🔴)

### 7. Add Risk Management System

**Database Migration:**
```sql
-- Add risk management settings to cost_settings table
INSERT INTO cost_settings (key, value, description, category) VALUES
('max_position_size_pct', 30, 'Maximum % of balance per single trade', 'risk'),
('max_total_exposure_pct', 80, 'Maximum % of balance invested at once', 'risk'),
('max_daily_loss_usd', 20, 'Maximum loss per day before circuit breaker', 'risk'),
('min_cash_reserve_usd', 10, 'Minimum cash to keep uninvested', 'risk'),
('max_trades_per_cycle', 1, 'Maximum trades per LLM per cycle', 'risk'),
('circuit_breaker_enabled', 1, 'Enable auto-stop on daily loss limit', 'risk');
```

**File:** `lib/risk-manager.ts` (new)
```typescript
// Risk validation functions
- validatePositionSize(amount, balance)
- validateTotalExposure(newPosition, currentPositions, balance)
- checkDailyLoss(traderId)
- validateCashReserve(amount, balance)
- checkTradeLimit(traderId, cycleStartTime)
```

**Update:** `lib/trading-engine.ts`
- Call risk validation before `executeBuy()`
- Reject trades that violate limits
- Log risk violations
- Implement circuit breaker (auto-stop on daily loss)

### 8. Create Persistent Trading State

**Database Migration:**
```sql
CREATE TABLE trading_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_running boolean DEFAULT false,
  mode text DEFAULT 'paper', -- 'paper' or 'live'
  started_at timestamptz,
  stopped_at timestamptz,
  last_cycle_at timestamptz,
  last_cycle_success boolean DEFAULT true,
  consecutive_errors integer DEFAULT 0,
  enabled_llms jsonb DEFAULT '["OpenAI", "Claude", "DeepSeek", "Qwen"]',
  interval_minutes integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert initial state
INSERT INTO trading_state (id) VALUES (gen_random_uuid());
```

**File:** `lib/state-manager.ts` (new)
```typescript
// State management functions
- getState()
- startTrading(mode, intervalMinutes, enabledLLMs)
- stopTrading()
- updateLastCycle(success)
- incrementErrors()
- resetErrors()
- shouldResumeOnRestart()
```

**Update:** `app/api/trading/route.ts`
- Replace in-memory state with database state
- On server restart, check `trading_state` table
- Optionally resume if was running (with confirmation)
- Log all state transitions

### 9. Add Emergency Controls

**File:** `app/api/emergency/stop/route.ts`
```typescript
// Emergency stop - bypasses normal checks
- Stop trading immediately
- Log emergency stop with reason
- Send alert notification
- Return status
```

**File:** `app/api/emergency/close-all/route.ts`
```typescript
// Force close all open positions
- Get all active positions
- Execute market sell for each
- Log manual intervention
- Update position status
- Return summary of closed positions
```

**File:** `lib/emergency-logger.ts` (new)
```typescript
// Log emergency actions to separate table
CREATE TABLE emergency_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text, -- 'emergency_stop', 'force_close_all', 'manual_close'
  triggered_by text,
  reason text,
  positions_affected jsonb,
  executed_at timestamptz DEFAULT now()
);
```

---

## Phase 2: Monitoring, Alerts & Error Handling (P1 - Important)

### 10. Enhanced Health Monitoring

**Update:** `app/api/health/route.ts`

**Additional Health Checks:**
```typescript
{
  timestamp: "2025-11-02T10:30:00Z",
  overall_status: "healthy" | "degraded" | "critical",

  services: {
    openai: { status: "ok", last_success: "...", response_time_ms: 1234 },
    claude: { status: "ok", last_success: "...", response_time_ms: 1456 },
    deepseek: { status: "ok", last_success: "...", response_time_ms: 892 },
    qwen: { status: "ok", last_success: "...", response_time_ms: 1123 },
    binance: { status: "ok", last_success: "...", response_time_ms: 234 }
  },

  trading: {
    is_running: true,
    last_cycle: "2025-11-02T10:00:00Z",
    next_cycle: "2025-11-02T11:00:00Z",
    consecutive_errors: 0
  },

  database: {
    status: "ok",
    last_query: "2025-11-02T10:30:00Z"
  },

  data_quality: {
    market_data_age_seconds: 45,
    stale_data: false,
    indicators_valid: true
  }
}
```

**Update:** `app/page.tsx`
- Add System Status indicator in header
- 🟢 Healthy / 🟡 Degraded / 🔴 Critical
- Show last successful cycle time
- Display error counts
- Add "View Health Report" modal

### 11. Auto-Recovery & Error Handling

**File:** `lib/error-handler.ts` (new)

**Features:**
- Exponential backoff for API retries (1s, 2s, 4s, 8s)
- Circuit breaker per LLM (disable after 3 consecutive failures)
- Graceful degradation (continue with working LLMs)
- Rate limit detection and automatic delays
- Error classification (recoverable vs fatal)

**Update:** `lib/trading-engine.ts`
```typescript
async processDecisionWithRetry(traderId, provider, marketData) {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      return await this.processDecision(traderId, provider, marketData);
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        // Disable this LLM temporarily
        await this.disableLLM(provider, error);
      }
      await this.exponentialBackoff(retries);
    }
  }
}
```

### 12. Alert System

**File:** `lib/alerts.ts` (new)

**Alert Configuration Table:**
```sql
CREATE TABLE alert_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text, -- 'email', 'webhook', 'sms'
  destination text, -- email address or webhook URL
  enabled boolean DEFAULT true,
  events jsonb DEFAULT '["api_failure", "circuit_breaker", "emergency_stop"]',
  created_at timestamptz DEFAULT now()
);
```

**Alert Events:**
- API failure (3+ consecutive)
- Circuit breaker triggered
- Unusual P&L swing (>15% in 1 cycle)
- Emergency stop activated
- Daily loss limit approaching (80%)
- Daily summary (every 24 hours)

**Implementation Options:**
1. Supabase Edge Functions + email service
2. Webhook to Zapier/Make
3. Simple SMTP email
4. Console logging only (Phase 1)

### 13. Data Quality Validation

**File:** `lib/data-validator.ts` (new)

**Validations:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateMarketData(data: MarketData): ValidationResult {
  // Price validations
  - price > 0
  - price within reasonable range (not 10x or 0.1x previous)

  // Indicator validations
  - RSI between 0-100
  - EMA values positive
  - MACD values reasonable
  - Volume > 0

  // Timestamp validations
  - Data age < 5 minutes
  - No future timestamps

  // Multi-timeframe alignment
  - 3m, 1H, 4H data timestamps consistent
  - No missing timeframes
}
```

**Integration:**
- Call validation before passing data to LLMs
- Reject invalid data
- Use last known good data as fallback
- Log all validation failures

---

## Phase 3: Testing Procedures & Documentation (P1)

### 14. Create Pre-Flight Checklist Document

**File:** `PRE_FLIGHT_CHECKLIST.md`

```markdown
# Pre-Flight Checklist - Cortex Trading Experiment

## T-Minus 7 Days: API Setup
- [ ] OpenAI API key created and funded
- [ ] Claude API key created and funded
- [ ] DeepSeek API key created and funded
- [ ] Qwen API key created and funded
- [ ] Binance API key created (spot trading enabled)
- [ ] Binance withdrawal disabled
- [ ] All API keys added to .env.local

## T-Minus 3 Days: Integration Testing
- [ ] Run Binance integration test suite (/api/test/binance)
- [ ] All tests pass ✓
- [ ] Execute 2-3 small real trades ($1-2 each)
- [ ] Verify trades appear in Binance history
- [ ] Run data reconciliation tool
- [ ] All data matches ✓

## T-Minus 2 Days: System Validation
- [ ] Run pre-flight check (/api/preflight)
- [ ] All API keys valid ✓
- [ ] Market data fetching works ✓
- [ ] Database connection healthy ✓
- [ ] Risk settings configured ✓

## T-Minus 1 Day: 24-Hour Dry Run
- [ ] Start trading in PAPER mode
- [ ] Run for 24 hours (2-3 trading cycles)
- [ ] All LLMs make decisions ✓
- [ ] No critical errors ✓
- [ ] Performance tracking works ✓
- [ ] Data quality acceptable ✓
- [ ] Cost projections reasonable ✓

## T-Minus 4 Hours: Final Checks
- [ ] Review risk settings (position limits, circuit breaker)
- [ ] Set up monitoring alerts
- [ ] Clear all test data (Settings → DELETE ALL DATA)
- [ ] Verify starting balance ($100 per LLM)
- [ ] Document expected behavior baseline

## T-Minus 1 Hour: Go/No-Go Decision
- [ ] All systems green ✓
- [ ] No outstanding errors
- [ ] Monitoring in place
- [ ] Emergency contacts ready
- [ ] Decision: GO / NO-GO

## T-Zero: Launch
- [ ] Click START
- [ ] Verify first cycle completes successfully
- [ ] Monitor for first 2-3 hours
- [ ] Set calendar reminder for daily checks

## Sign-Off
Date: ___________
Project Lead: ___________
Status: APPROVED / HOLD
```

### 15. Create Testing & Monitoring Guide

**File:** `TESTING_GUIDE.md`

```markdown
# Testing & Monitoring Guide

## Day 0: Launch Day

### Hour 0-1: Launch
- Start trading
- Watch first cycle complete
- Verify all LLMs execute
- Check for errors

### Hour 1-4: Initial Monitoring
- Check every 30 minutes
- Verify data quality
- Monitor API responses
- Review first decisions

### Hour 4-24: Active Monitoring
- Check every 2-3 hours
- Review decision quality
- Monitor P&L
- Check for anomalies

## Day 1-3: Close Monitoring

### Daily Tasks
- [ ] Morning health check (view /api/health)
- [ ] Review overnight decisions
- [ ] Check P&L vs expected
- [ ] Verify no unusual patterns
- [ ] Monitor API costs
- [ ] Review error logs

### Red Flags to Watch For
- ⚠️ Same LLM failing repeatedly
- ⚠️ Unusually large position sizes
- ⚠️ P&L swings >20% in one cycle
- ⚠️ No trading activity for multiple cycles
- ⚠️ Data quality degraded
- ⚠️ API costs exceeding projections

## Day 4-7: Standard Monitoring

### Daily Tasks
- [ ] Once-daily health check
- [ ] Review summary statistics
- [ ] Spot check recent decisions
- [ ] Verify costs on track

## Week 2: Maintenance Mode

### Every 2-3 Days
- [ ] Health check
- [ ] Review performance trends
- [ ] Check for degradation

## When to Intervene

### Stop Immediately If:
- 🛑 Multiple API failures
- 🛑 Circuit breaker triggered repeatedly
- 🛑 Suspicious trading patterns
- 🛑 Data quality critical
- 🛑 Total loss >40%

### Investigate If:
- 🔍 One LLM significantly underperforming
- 🔍 Unusual decision patterns
- 🔍 API costs 2x projections
- 🔍 No trades for 4+ cycles

## Recovery Procedures

### API Failure Recovery
1. Check API status page
2. Verify API key still valid
3. Test API manually
4. If persistent: disable that LLM
5. Continue with remaining LLMs

### Data Quality Issues
1. Check Binance API status
2. Verify internet connection
3. Review data validation logs
4. Manually fetch sample data
5. If persistent: stop and investigate

### Performance Issues
1. Export current data
2. Analyze decision quality
3. Review market conditions
4. Check if within expected variance
5. Document findings
```

### 16. Add Cost Projection Calculator

**File:** `app/api/costs/projection/route.ts`

```typescript
// Calculate estimated costs for experiment duration

interface CostProjection {
  duration_days: number;
  cycles_per_day: number;
  total_cycles: number;

  per_llm: {
    OpenAI: { api_cost: number, trading_fees: number, slippage: number, total: number },
    Claude: { api_cost: number, trading_fees: number, slippage: number, total: number },
    DeepSeek: { api_cost: number, trading_fees: number, slippage: number, total: number },
    Qwen: { api_cost: number, trading_fees: number, slippage: number, total: number }
  },

  totals: {
    api_costs: number,
    trading_fees: number,
    slippage: number,
    grand_total: number
  },

  daily_average: number,
  warnings: string[]
}
```

**Calculation Logic:**
- Assume avg tokens per decision (based on historical or estimate)
- Calculate API cost per cycle per LLM
- Estimate 30% of balance traded per cycle (conservative)
- Calculate trading fees (0.1% of trade value)
- Calculate slippage (0.05-0.15% of trade value)
- Multiply by cycles per day × days
- Add warnings if total > $50 or daily > $5

### 17. Create 24-Hour Dry Run Protocol

**File:** `DRY_RUN_PROTOCOL.md`

```markdown
# 24-Hour Dry Run Protocol

## Objective
Validate system works correctly in paper mode before risking real money.

## Setup
- Mode: PAPER
- Duration: 24 hours minimum
- Interval: 60 minutes (standard)
- Starting balance: $100 per LLM

## Validation Checklist

### Cycle 1 (First Hour)
- [ ] All 4 LLMs make decisions
- [ ] Decisions have reasoning
- [ ] BUY decisions execute correctly
- [ ] Positions recorded in database
- [ ] Performance chart updates
- [ ] Activity feed shows decisions
- [ ] No critical errors

### Cycle 2-3 (Hours 2-3)
- [ ] Decisions continue
- [ ] Some HOLD decisions (normal)
- [ ] Position P&L calculated correctly
- [ ] Stop loss monitoring works
- [ ] Data quality remains high

### After 12 Hours
- [ ] Multiple cycles completed (12-24)
- [ ] Some positions opened and closed
- [ ] P&L tracking accurate
- [ ] No memory leaks
- [ ] No degradation in performance
- [ ] Costs within projections

### After 24 Hours
- [ ] All systems stable
- [ ] Data quality consistent
- [ ] Decision quality reasonable
- [ ] Performance as expected
- [ ] Ready for production

## Data to Review
1. Total decisions made: ___
2. Total trades executed: ___
3. Win rate: ____%
4. Average P&L: ____%
5. API costs: $___
6. Error count: ___

## Go/No-Go Decision
- All checks passed: GO
- Any critical issues: NO-GO (fix and repeat)

## Sign-Off
Date completed: ___________
Reviewer: ___________
Decision: GO / NO-GO
```

---

## Phase 4: Advanced Features (P2 - Nice to Have)

### 18. Performance Attribution Analysis

**File:** `app/api/analysis/attribution/route.ts`

**Purpose:** Understand what drives performance differences

**Metrics:**
- Return by coin (which coin trades were most profitable)
- Return by action (BUY vs SELL timing quality)
- Win rate by confidence level (do high-confidence trades win more?)
- Average hold time by outcome
- Best/worst trades per LLM
- Profit factor (gross profit / gross loss)

### 19. Anomaly Detection System

**File:** `lib/anomaly-detector.ts`

**Detections:**
- Unusual trade frequency (>2 std dev from mean)
- Unexpected position sizes
- Rapid P&L changes
- All LLMs making same decision (groupthink)
- Decision quality degradation over time
- Market regime changes (volatility spikes)

### 20. Enhanced Logging & Debugging

**Features:**
- Structured JSON logging
- Log levels (DEBUG, INFO, WARN, ERROR)
- Performance metrics (execution time per function)
- Request/response logging for all API calls
- Debug mode toggle (verbose output)
- Log rotation and archival

---

## Testing Strategy Summary

### Phase 0: Binance Validation (Critical)
1. Run integration test suite
2. Execute 2-3 small real trades
3. Verify data reconciliation
4. Document any issues

### Phase 1: System Validation
1. Run pre-flight checks
2. Verify all APIs working
3. Test risk management
4. Test emergency controls

### Phase 2: 24-Hour Dry Run
1. Paper mode for 24 hours
2. Monitor all cycles
3. Validate data quality
4. Review decision quality
5. Check cost projections

### Phase 3: Small Live Test
1. Live mode with $5-10 per LLM
2. Run for 2-3 cycles
3. Verify real trades work
4. Check data accuracy
5. Confirm no surprises

### Phase 4: Full Launch
1. Clear test data
2. Reset to $100 per LLM
3. Start experiment
4. Monitor closely for first 24h
5. Transition to daily checks

---

## Success Criteria

### Before Launch (All Must Pass)
- ✅ Binance integration tests: 100% pass rate
- ✅ Pre-flight checks: All green
- ✅ 24-hour dry run: No critical errors
- ✅ Small live test: Trades execute correctly
- ✅ Data reconciliation: 100% match
- ✅ Cost projections: Reasonable (<$50 total)

### During Experiment
- Health status: Green or Yellow (not Red)
- Error rate: <5% of cycles
- Data quality: >95% valid
- API availability: >98% uptime
- Decision rate: All LLMs making decisions

### Abort Criteria
- 🛑 Total loss >50% of capital
- 🛑 Multiple API complete failures
- 🛑 Data quality critical for >24 hours
- 🛑 Circuit breaker triggers 3+ times
- 🛑 Detected system compromise

---

## Estimated Timeline

### Development & Testing
- Phase 0 (Binance Testing): 4-6 hours
- Phase 1 (Risk & Safety): 6-8 hours
- Phase 2 (Monitoring): 4-6 hours
- Phase 3 (Documentation): 2-3 hours
- **Total Development: 16-23 hours**

### Validation & Testing
- Binance integration testing: 2 hours
- Pre-flight validation: 1 hour
- 24-hour dry run: 24 hours
- Small live test: 2-3 hours
- **Total Testing: ~30 hours**

### Ready to Launch: ~3-4 days from start

---

## Risk Assessment

### High Risk Areas (Must Address)
1. ❌ Binance API integration untested with real trades
2. ❌ No position size limits (could invest 100% in one trade)
3. ❌ No circuit breaker (could lose all capital)
4. ❌ Server restart loses trading state
5. ❌ No emergency stop mechanism

### Medium Risk Areas (Should Address)
6. ⚠️ No automated alerts for failures
7. ⚠️ No data quality validation
8. ⚠️ Limited error recovery
9. ⚠️ No cost projections
10. ⚠️ Incomplete testing procedures

### Low Risk Areas (Nice to Have)
11. ℹ️ No performance attribution
12. ℹ️ No anomaly detection
13. ℹ️ Basic logging only

---

## Next Steps

1. **Review this plan** - Confirm scope and priorities
2. **Adjust timeline** - Based on available development time
3. **Begin Phase 0** - Start with Binance integration testing
4. **Proceed sequentially** - Complete each phase before next
5. **Document findings** - Track issues and resolutions
6. **Sign off on validation** - Before starting real experiment

---

## Questions to Resolve

- [ ] What is acceptable total cost for 1-2 week experiment?
- [ ] Should we implement email alerts or start with console logging?
- [ ] What should circuit breaker threshold be? ($20 loss? 40% loss?)
- [ ] How many small test trades are sufficient? (2? 5? 10?)
- [ ] Should system auto-resume after server restart or require manual start?

---

**Document Status:** Draft
**Last Updated:** November 2, 2025
**Next Review:** After completing Phase 0
