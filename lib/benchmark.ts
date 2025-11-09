import { supabase, Benchmark } from './supabase';
import { getCurrentPrice } from './binance';
import { CRYPTO_PAIRS } from './types';

export class BuyAndHoldBenchmark {
  private initialBalance: number = 100;
  private holdings: Record<string, number> = {};

  constructor() {}

  /**
   * PHASE 1: Prepare benchmark for trading (called during initialization)
   * Creates database entry but does NOT buy BTC yet
   */
  async prepareForStart(): Promise<void> {
    // Check if already exists
    const { data: existing } = await supabase
      .from('benchmark')
      .select('*')
      .eq('strategy', 'buy_and_hold')
      .single();

    if (existing) {
      console.log('[BENCHMARK] Already prepared');
      return;
    }

    // Create empty benchmark entry (no BTC purchased yet)
    await supabase.from('benchmark').insert({
      strategy: 'buy_and_hold',
      initial_balance: this.initialBalance,
      current_value: this.initialBalance,
      holdings: {}, // Empty - will buy BTC when start() is called
      total_pnl: 0,
      pnl_percentage: 0,
    });

    console.log('[BENCHMARK] ✓ Prepared (will start when user clicks START)');
  }

  /**
   * PHASE 2: Start benchmark tracking (called when user clicks START)
   * Buys $100 worth of BTC at current price
   */
  async start(): Promise<void> {
    const { data: benchmark } = await supabase
      .from('benchmark')
      .select('*')
      .eq('strategy', 'buy_and_hold')
      .single();

    if (!benchmark) {
      console.error('[BENCHMARK] ERROR: Not prepared! Call prepareForStart() first.');
      throw new Error('Benchmark not prepared');
    }

    // Check if already started (has holdings)
    const currentHoldings = benchmark.holdings as Record<string, number>;
    if (currentHoldings && Object.keys(currentHoldings).length > 0) {
      console.log('[BENCHMARK] Already started');
      return;
    }

    // Buy BTC with full $100 at CURRENT price
    const btcPrice = await getCurrentPrice('BTC');
    const btcAmount = this.initialBalance / btcPrice;
    this.holdings['BTC'] = btcAmount;

    // Update database with BTC purchase
    await supabase
      .from('benchmark')
      .update({
        holdings: this.holdings,
        current_value: this.initialBalance, // Starts at $100
        updated_at: new Date().toISOString(),
      })
      .eq('id', benchmark.id);

    console.log(`[BENCHMARK] ✓ Started at BTC price $${btcPrice.toFixed(2)}`);
    console.log(`[BENCHMARK] ✓ Purchased ${btcAmount.toFixed(8)} BTC`);
  }

  /**
   * DEPRECATED: Legacy method for backward compatibility
   * Use prepareForStart() + start() instead
   */
  async initialize(): Promise<void> {
    console.warn('[BENCHMARK] DEPRECATED: initialize() called. Use prepareForStart() + start() instead.');
    await this.prepareForStart();
    await this.start();
  }

  /**
   * Update the current value of buy & hold portfolio (BTC only)
   */
  async updateValue(): Promise<number> {
    const { data: benchmark } = await supabase
      .from('benchmark')
      .select('*')
      .eq('strategy', 'buy_and_hold')
      .single();

    if (!benchmark) {
      console.error('Buy & hold benchmark not initialized');
      return 0;
    }

    const holdings = benchmark.holdings as Record<string, number>;

    // Calculate current value of BTC holdings only
    const btcAmount = holdings['BTC'] || 0;
    const btcPrice = await getCurrentPrice('BTC');
    const totalValue = btcAmount * btcPrice;

    const pnl = totalValue - benchmark.initial_balance;
    const pnlPercentage = (pnl / benchmark.initial_balance) * 100;

    // Update in database
    await supabase
      .from('benchmark')
      .update({
        current_value: totalValue,
        total_pnl: pnl,
        pnl_percentage: pnlPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', benchmark.id);

    return totalValue;
  }

  /**
   * Get current benchmark performance
   */
  async getPerformance(): Promise<{
    currentValue: number;
    pnl: number;
    pnlPercentage: number;
  }> {
    const { data: benchmark } = await supabase
      .from('benchmark')
      .select('*')
      .eq('strategy', 'buy_and_hold')
      .single();

    if (!benchmark) {
      return {
        currentValue: 100,
        pnl: 0,
        pnlPercentage: 0,
      };
    }

    return {
      currentValue: benchmark.current_value,
      pnl: benchmark.total_pnl,
      pnlPercentage: benchmark.pnl_percentage,
    };
  }
}
