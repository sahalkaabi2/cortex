-- ============================================================
-- Alpha Arena Enhancements - Database Migration
-- ============================================================
-- This migration adds columns to support exit plans, confidence
-- scores, and enhanced performance tracking inspired by
-- Nof1's Alpha Arena research.
--
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Update llm_decisions table
-- ============================================================
-- Add columns for structured exit plan data

ALTER TABLE llm_decisions
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS profit_target DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS stop_loss_price DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS invalidation_condition TEXT,
ADD COLUMN IF NOT EXISTS risk_usd DECIMAL(20,2);

-- Add comments for documentation
COMMENT ON COLUMN llm_decisions.confidence IS 'Agent self-reported confidence in decision (0-1 scale)';
COMMENT ON COLUMN llm_decisions.profit_target IS 'Price level where agent plans to take profit';
COMMENT ON COLUMN llm_decisions.stop_loss_price IS 'Price level where agent plans to cut losses';
COMMENT ON COLUMN llm_decisions.invalidation_condition IS 'Market signal that would invalidate the trade thesis';
COMMENT ON COLUMN llm_decisions.risk_usd IS 'Dollar amount at risk in this trade';

-- ============================================================
-- 2. Update positions table
-- ============================================================
-- Add columns for exit plan monitoring

ALTER TABLE positions
ADD COLUMN IF NOT EXISTS profit_target_price DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS invalidation_condition TEXT,
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2);

-- Add comments for documentation
COMMENT ON COLUMN positions.profit_target_price IS 'Price level for automatic profit taking';
COMMENT ON COLUMN positions.invalidation_condition IS 'Market condition that invalidates this position';
COMMENT ON COLUMN positions.confidence IS 'Agent confidence at time of entry (0-1 scale)';

-- ============================================================
-- 3. Create index for performance queries
-- ============================================================
-- Speed up queries for performance metrics calculations

CREATE INDEX IF NOT EXISTS idx_llm_decisions_trader_created
ON llm_decisions(llm_trader_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_positions_trader_active
ON positions(llm_trader_id, is_active, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_trader_executed
ON trades(llm_trader_id, executed_at DESC);

-- ============================================================
-- 4. Verify the migration
-- ============================================================
-- Run this query to confirm columns were added successfully

SELECT
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('llm_decisions', 'positions')
  AND column_name IN (
      'confidence',
      'profit_target',
      'stop_loss_price',
      'invalidation_condition',
      'risk_usd',
      'profit_target_price'
  )
ORDER BY table_name, column_name;

-- ============================================================
-- 5. (Optional) Backfill existing data
-- ============================================================
-- If you have existing positions without exit plans,
-- you can set default values:

-- Set default confidence to 0.5 (medium) for existing records
UPDATE llm_decisions
SET confidence = 0.5
WHERE confidence IS NULL
  AND decision_type IN ('BUY', 'SELL');

-- Set default stop loss for existing active positions (5% below entry)
UPDATE positions
SET stop_loss_price = entry_price * 0.95
WHERE stop_loss_price IS NULL
  AND is_active = true;

-- ============================================================
-- 6. Create view for performance analytics
-- ============================================================
-- Materialized view for quick access to performance metrics

CREATE OR REPLACE VIEW llm_trader_performance AS
SELECT
    t.id AS trader_id,
    t.name AS trader_name,
    t.provider,
    t.initial_balance,
    t.current_balance,
    t.total_pnl,

    -- Return metrics
    ROUND(((t.current_balance - t.initial_balance) / t.initial_balance * 100)::numeric, 2) AS total_return_pct,

    -- Trade statistics
    t.total_trades,
    t.winning_trades,
    t.losing_trades,
    CASE
        WHEN (t.winning_trades + t.losing_trades) > 0
        THEN ROUND((t.winning_trades::numeric / (t.winning_trades + t.losing_trades) * 100)::numeric, 2)
        ELSE 0
    END AS win_rate_pct,

    -- Cost tracking
    t.total_llm_api_cost,
    t.total_trading_fees,
    t.total_slippage_cost,
    t.total_llm_api_cost + t.total_trading_fees + t.total_slippage_cost AS total_costs,
    t.llm_call_count,

    -- Average confidence from decisions
    ROUND(AVG(d.confidence)::numeric, 3) AS avg_confidence,

    -- Position metrics
    COUNT(DISTINCT p.id) AS total_positions_opened,
    COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) AS current_open_positions,

    -- Time tracking
    t.created_at,
    t.updated_at,
    EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600 AS hours_active

FROM llm_traders t
LEFT JOIN llm_decisions d ON t.id = d.llm_trader_id
LEFT JOIN positions p ON t.id = p.llm_trader_id
GROUP BY
    t.id, t.name, t.provider, t.initial_balance,
    t.current_balance, t.total_pnl, t.total_trades,
    t.winning_trades, t.losing_trades,
    t.total_llm_api_cost, t.total_trading_fees,
    t.total_slippage_cost, t.llm_call_count,
    t.created_at, t.updated_at;

-- ============================================================
-- 7. Create view for exit plan adherence tracking
-- ============================================================
-- Track how well agents stick to their exit plans

CREATE OR REPLACE VIEW exit_plan_adherence AS
SELECT
    p.llm_trader_id,
    lt.name AS trader_name,
    p.coin,
    p.entry_price,
    p.profit_target_price,
    p.stop_loss_price,
    p.confidence,
    p.invalidation_condition,

    -- Exit analysis
    CASE
        WHEN p.is_active = false AND t.action = 'SELL' THEN
            CASE
                WHEN t.price >= p.profit_target_price THEN 'PROFIT_TARGET_HIT'
                WHEN t.price <= p.stop_loss_price THEN 'STOP_LOSS_HIT'
                ELSE 'MANUAL_EXIT'
            END
        ELSE 'STILL_OPEN'
    END AS exit_type,

    -- P&L
    p.pnl,
    p.pnl_percentage,

    -- Timing
    p.opened_at,
    p.updated_at,
    EXTRACT(EPOCH FROM (p.updated_at - p.opened_at)) / 3600 AS holding_period_hours,

    -- Related trade
    t.price AS exit_price,
    t.reasoning AS exit_reasoning

FROM positions p
LEFT JOIN llm_traders lt ON p.llm_trader_id = lt.id
LEFT JOIN trades t ON p.id = t.position_id AND t.action = 'SELL'
WHERE p.profit_target_price IS NOT NULL OR p.stop_loss_price IS NOT NULL
ORDER BY p.opened_at DESC;

-- ============================================================
-- 8. Success message
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Alpha Arena migration completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Added columns:';
    RAISE NOTICE '  - llm_decisions: confidence, profit_target, stop_loss_price, invalidation_condition, risk_usd';
    RAISE NOTICE '  - positions: profit_target_price, invalidation_condition, confidence';
    RAISE NOTICE '';
    RAISE NOTICE 'Created views:';
    RAISE NOTICE '  - llm_trader_performance (performance metrics summary)';
    RAISE NOTICE '  - exit_plan_adherence (track exit plan execution)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Clear existing data (Settings → DELETE ALL DATA)';
    RAISE NOTICE '  2. Click START to begin trading with enhanced prompts';
    RAISE NOTICE '  3. Monitor console for profit target / stop loss executions';
END $$;
