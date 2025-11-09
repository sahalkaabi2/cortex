import { supabase, LLMTrader, Position, Trade, LLMDecision } from './supabase';
import { getLLMProvider } from './llm';
import { getAllMarketData, getCurrentPrice, executeMarketOrder } from './binance';
import { CRYPTO_PAIRS, LLMProvider, MarketData, PortfolioState } from './types';
import { getCostSettings, calculateNetBuyAmount, calculateNetSellValue, CostConfig } from './costs';

export class TradingEngine {
  private isRunning: boolean = false;
  private isPaperMode: boolean = true;
  private enabledLLMs: string[] = ['OpenAI', 'Claude', 'DeepSeek', 'Qwen'];
  private selectedModels: Record<string, string> = {
    'OpenAI': 'gpt-4o',
    'Claude': 'claude-3-5-sonnet-20241022',
    'DeepSeek': 'deepseek-chat',
    'Qwen': 'qwen-plus'
  };
  private intervalId: NodeJS.Timeout | null = null;
  private snapshotIntervalId: NodeJS.Timeout | null = null;
  private currentIntervalMinutes: number = 60;
  private isExecutingTrade: boolean = false; // Lock to prevent snapshot race conditions

  constructor(isPaperMode: boolean = true) {
    this.isPaperMode = isPaperMode;
  }

  /**
   * Set which LLMs are enabled for trading
   */
  setEnabledLLMs(llms: string[]): void {
    this.enabledLLMs = llms;
    console.log(`Enabled LLMs: ${llms.join(', ')}`);
  }

  /**
   * Get current enabled LLMs
   */
  getEnabledLLMs(): string[] {
    return this.enabledLLMs;
  }

  /**
   * Set selected models for LLM providers
   */
  setSelectedModels(models: Record<string, string>): void {
    this.selectedModels = models;
    console.log(`Selected models updated:`, models);
  }

  /**
   * Get current selected models
   */
  getSelectedModels(): Record<string, string> {
    return this.selectedModels;
  }

  /**
   * Get portfolio state for a trader
   */
  async getPortfolioState(traderId: string): Promise<PortfolioState> {
    // Get trader balance
    const { data: trader } = await supabase
      .from('llm_traders')
      .select('current_balance')
      .eq('id', traderId)
      .single();

    // Get active positions (filter out dust positions)
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('llm_trader_id', traderId)
      .eq('is_active', true)
      .gt('amount', 0.00000001);

    const positionStates = await Promise.all(
      (positions || []).map(async (pos: Position) => {
        const currentPrice = await getCurrentPrice(pos.coin);
        return {
          coin: pos.coin,
          amount: pos.amount,
          entry_price: pos.entry_price,
          current_price: currentPrice,
          pnl: (currentPrice - pos.entry_price) * pos.amount,
        };
      })
    );

    return {
      balance: trader?.current_balance || 100,
      positions: positionStates,
    };
  }

  /**
   * Check if trader already has a position in a coin
   */
  async hasPosition(traderId: string, coin: string): Promise<boolean> {
    const { data } = await supabase
      .from('positions')
      .select('id')
      .eq('llm_trader_id', traderId)
      .eq('coin', coin)
      .eq('is_active', true)
      .gt('amount', 0.00000001)
      .limit(1);

    return !!(data && data.length > 0);
  }

  /**
   * Execute a buy order
   */
  async executeBuy(
    traderId: string,
    coin: string,
    investmentAmount: number,
    reasoning: string,
    exitPlan?: {
      profit_target?: number;
      stop_loss?: number;
      invalidation_condition?: string;
      confidence?: number;
    }
  ): Promise<void> {
    // Set lock to prevent snapshot race condition
    this.isExecutingTrade = true;

    try {
      // Check if already has position
      if (await this.hasPosition(traderId, coin)) {
        const error = `Already has position in ${coin}, cannot open another`;
        console.log(`[BUY] ${error}`);
        throw new Error(error);
      }

    // Get trader info
    const { data: trader } = await supabase
      .from('llm_traders')
      .select('*')
      .eq('id', traderId)
      .single();

    if (!trader) {
      throw new Error(`Trader not found: ${traderId}`);
    }

    if (trader.current_balance < investmentAmount) {
      const error = `Insufficient balance: has $${trader.current_balance.toFixed(2)}, needs $${investmentAmount.toFixed(2)}`;
      console.log(`[BUY] ${trader.name} - ${error}`);
      throw new Error(error);
    }

    // Get cost settings
    const costSettings = await getCostSettings();

    // Execute order
    const currentPrice = await getCurrentPrice(coin);

    // Calculate net amount after fees and slippage
    const costCalc = calculateNetBuyAmount(investmentAmount, currentPrice, costSettings);

    console.log(`\n[BUY DEBUG] ===== POSITION CREATION =====`);
    console.log(`[BUY DEBUG] Coin: ${coin}`);
    console.log(`[BUY DEBUG] Investment Amount: $${investmentAmount.toFixed(2)}`);
    console.log(`[BUY DEBUG] Current Price: $${currentPrice.toFixed(2)}`);
    console.log(`[BUY DEBUG] Cost Calculation:`);
    console.log(`[BUY DEBUG]   - Gross Amount: ${costCalc.grossAmount.toFixed(8)} ${coin}`);
    console.log(`[BUY DEBUG]   - Trading Fee: ${costCalc.tradingFee.toFixed(8)} ${coin}`);
    console.log(`[BUY DEBUG]   - Slippage: ${costCalc.slippage.toFixed(8)} ${coin}`);
    console.log(`[BUY DEBUG]   - Net Amount: ${costCalc.netAmount.toFixed(8)} ${coin}`);
    console.log(`[BUY DEBUG]   - Effective Price: $${costCalc.effectivePrice.toFixed(2)}`);
    console.log(`[BUY DEBUG]   - Current Value: $${(costCalc.netAmount * currentPrice).toFixed(2)}`);

    // Determine stop loss: use agent's stop loss if provided, otherwise default to 5%
    const stopLossPrice = exitPlan?.stop_loss || currentPrice * 0.95;

    // Create position with net amount and exit plan details
    const { data: position, error: positionError } = await supabase
      .from('positions')
      .insert({
        llm_trader_id: traderId,
        coin,
        entry_price: costCalc.effectivePrice,
        current_price: currentPrice,
        amount: costCalc.netAmount,
        investment_value: investmentAmount,
        current_value: costCalc.netAmount * currentPrice,
        pnl: 0,
        pnl_percentage: 0,
        stop_loss_price: stopLossPrice,
        profit_target_price: exitPlan?.profit_target,
        invalidation_condition: exitPlan?.invalidation_condition,
        confidence: exitPlan?.confidence,
      })
      .select()
      .single();

    if (positionError) {
      console.error(`[BUY DEBUG] ❌ ERROR inserting position:`, positionError);
      throw positionError;
    }

    console.log(`[BUY DEBUG] ✅ Position created with ID: ${position?.id}`);
    console.log(`[BUY DEBUG] ✅ Position amount stored: ${position?.amount} ${coin}`);
    console.log(`[BUY DEBUG] ===============================\n`);

    // Calculate costs in dollars
    const tradingFeeCost = costCalc.tradingFee * currentPrice;
    const slippageCost = costCalc.slippage * currentPrice;

    // Record trade with cost details
    await supabase.from('trades').insert({
      llm_trader_id: traderId,
      position_id: position?.id,
      action: 'BUY',
      coin,
      price: currentPrice,
      amount: costCalc.netAmount,
      total_value: investmentAmount,
      gross_amount: costCalc.grossAmount,
      net_amount: costCalc.netAmount,
      trading_fee: tradingFeeCost,
      slippage: slippageCost,
      reasoning,
      is_paper_trade: this.isPaperMode,
    });

    // Update trader balance and cost stats
    await supabase
      .from('llm_traders')
      .update({
        current_balance: trader.current_balance - investmentAmount,
        total_trading_fees: (trader.total_trading_fees || 0) + tradingFeeCost,
        total_slippage_cost: (trader.total_slippage_cost || 0) + slippageCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', traderId);

      console.log(
        `${trader.name} bought ${costCalc.netAmount.toFixed(6)} ${coin} for $${investmentAmount} ` +
        `(fee: $${tradingFeeCost.toFixed(4)}, slippage: $${slippageCost.toFixed(4)})`
      );
    } finally {
      // Always release the lock, even if an error occurred
      this.isExecutingTrade = false;
    }
  }

  /**
   * Execute a sell order
   */
  async executeSell(
    traderId: string,
    coin: string,
    amount: number,
    reasoning: string
  ): Promise<void> {
    // Set lock to prevent snapshot race condition
    this.isExecutingTrade = true;

    try {
      // Get position (filter out dust positions)
      const { data: position } = await supabase
        .from('positions')
        .select('*')
        .eq('llm_trader_id', traderId)
        .eq('coin', coin)
        .eq('is_active', true)
        .gt('amount', 0.00000001)
        .single();

      if (!position) {
        const error = `No position found in ${coin}, cannot sell`;
        console.log(`[SELL] ${error}`);
        throw new Error(error);
      }

    // Get cost settings
    const costSettings = await getCostSettings();

    // Execute sell order
    const sellAmount = Math.min(amount, position.amount);
    const currentPrice = await getCurrentPrice(coin);

    // Calculate net value after fees and slippage
    const costCalc = calculateNetSellValue(sellAmount, currentPrice, costSettings);

    // Calculate P&L (including costs)
    const investmentPortionSold = (sellAmount / position.amount) * position.investment_value;
    const grossPnl = costCalc.grossValue - investmentPortionSold;
    const netPnl = costCalc.netValue - investmentPortionSold;
    const pnlPercentage = (netPnl / investmentPortionSold) * 100;

    // Record trade with cost details
    await supabase.from('trades').insert({
      llm_trader_id: traderId,
      position_id: position.id,
      action: 'SELL',
      coin,
      price: currentPrice,
      amount: sellAmount,
      total_value: costCalc.netValue,
      gross_amount: sellAmount,
      net_amount: sellAmount,
      trading_fee: costCalc.tradingFee,
      slippage: costCalc.slippage,
      pnl: netPnl,
      pnl_percentage: pnlPercentage,
      reasoning,
      is_paper_trade: this.isPaperMode,
    });

    // Update position or close it
    // Use epsilon tolerance to handle floating-point precision issues
    const remainingAmount = position.amount - sellAmount;
    const EPSILON = 0.00000001; // Threshold for considering amount as zero

    if (remainingAmount <= EPSILON) {
      // Close position (fully sold or remaining amount is negligible)
      console.log(`[SELL] Closing position ${position.id} - remaining: ${remainingAmount.toFixed(10)}`);
      await supabase
        .from('positions')
        .update({ is_active: false })
        .eq('id', position.id);
    } else {
      // Partial sell
      console.log(`[SELL] Partial sell - remaining: ${remainingAmount.toFixed(8)} ${coin}`);
      await supabase
        .from('positions')
        .update({ amount: remainingAmount })
        .eq('id', position.id);
    }

    // Update trader balance and stats
    const { data: trader } = await supabase
      .from('llm_traders')
      .select('*')
      .eq('id', traderId)
      .single();

    if (trader) {
      await supabase
        .from('llm_traders')
        .update({
          current_balance: trader.current_balance + costCalc.netValue,
          total_pnl: trader.total_pnl + netPnl,
          total_trades: trader.total_trades + 1,
          winning_trades: netPnl > 0 ? trader.winning_trades + 1 : trader.winning_trades,
          losing_trades: netPnl < 0 ? trader.losing_trades + 1 : trader.losing_trades,
          total_trading_fees: (trader.total_trading_fees || 0) + costCalc.tradingFee,
          total_slippage_cost: (trader.total_slippage_cost || 0) + costCalc.slippage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', traderId);
    }

      console.log(
        `${trader?.name} sold ${sellAmount.toFixed(6)} ${coin} for $${costCalc.netValue.toFixed(2)} ` +
        `(fee: $${costCalc.tradingFee.toFixed(4)}, slippage: $${costCalc.slippage.toFixed(4)}, P&L: $${netPnl.toFixed(2)})`
      );
    } finally {
      // Always release the lock, even if an error occurred
      this.isExecutingTrade = false;
    }
  }

  /**
   * Process decision from an LLM
   */
  async processDecision(
    traderId: string,
    provider: LLMProvider,
    marketData: MarketData[]
  ): Promise<void> {
    try {
      // Get cost settings
      const costSettings = await getCostSettings();

      // Get trader info
      const { data: trader } = await supabase
        .from('llm_traders')
        .select('*')
        .eq('id', traderId)
        .single();

      if (!trader) return;

      // Get portfolio state
      const portfolioState = await this.getPortfolioState(traderId);

      // Get selected model for this provider
      const selectedModel = this.selectedModels[provider];
      console.log(`[${provider}] Using model: ${selectedModel || 'default'}`);

      // Get LLM decision (pass traderId for performance metrics and selected model)
      const llmProvider = getLLMProvider(provider, selectedModel);
      const decision = await llmProvider.makeDecision(marketData, portfolioState, traderId);

      // Use actual calculated cost from API response
      const apiCost = decision.calculated_cost || 0;

      // Calculate total tokens for storage
      const totalTokens = decision.usage
        ? (decision.usage.total_tokens || (decision.usage.input_tokens || 0) + (decision.usage.output_tokens || 0))
        : 0;

      // Deduct API cost from balance if enabled
      if (costSettings.deduct_costs_from_balance && apiCost > 0) {
        // Check if trader has enough balance for API cost
        if (trader.current_balance < apiCost) {
          console.log(`${provider} has insufficient balance for API call ($${apiCost.toFixed(4)})`);
          // Still save the decision but mark that it couldn't be afforded
        }

        // Deduct API cost from balance and track total tokens
        await supabase
          .from('llm_traders')
          .update({
            current_balance: Math.max(0, trader.current_balance - apiCost),
            total_llm_api_cost: (trader.total_llm_api_cost || 0) + apiCost,
            llm_call_count: (trader.llm_call_count || 0) + 1,
            total_tokens_used: (trader.total_tokens_used || 0) + totalTokens,
            updated_at: new Date().toISOString(),
          })
          .eq('id', traderId);
      }

      // Save decision to database with actual API cost, token count, and full prompt/response
      const { data: decisionRecord } = await supabase
        .from('llm_decisions')
        .insert({
          llm_trader_id: traderId,
          decision_type: decision.action,
          coin: decision.coin,
          suggested_amount: decision.amount,
          reasoning: decision.reasoning,
          market_data: { coins: marketData },
          portfolio_state: portfolioState,
          api_cost: apiCost,
          token_count: totalTokens,
          confidence: decision.confidence,
          profit_target: decision.profit_target,
          stop_loss_price: decision.stop_loss,
          invalidation_condition: decision.invalidation_condition,
          risk_usd: decision.risk_usd,
          prompt_text: decision.prompt_text,
          raw_response: decision.raw_response,
        })
        .select()
        .single();

      // Execute decision with proper error handling
      if (decision.action === 'BUY' && decision.coin && decision.amount) {
        try {
          await this.executeBuy(traderId, decision.coin, decision.amount, decision.reasoning, {
            profit_target: decision.profit_target,
            stop_loss: decision.stop_loss,
            invalidation_condition: decision.invalidation_condition,
            confidence: decision.confidence,
          });

          // Only mark as executed if executeBuy succeeded
          if (decisionRecord) {
            await supabase
              .from('llm_decisions')
              .update({ was_executed: true })
              .eq('id', decisionRecord.id);
          }
        } catch (error) {
          console.error(`[TRADING] Failed to execute BUY ${decision.coin} for ${provider}:`, error);
          // Decision remains with was_executed = false
        }
      } else if (decision.action === 'SELL' && decision.coin && decision.amount) {
        try {
          await this.executeSell(traderId, decision.coin, decision.amount, decision.reasoning);

          // Only mark as executed if executeSell succeeded
          if (decisionRecord) {
            await supabase
              .from('llm_decisions')
              .update({ was_executed: true })
              .eq('id', decisionRecord.id);
          }
        } catch (error) {
          console.error(`[TRADING] Failed to execute SELL ${decision.coin} for ${provider}:`, error);
          // Decision remains with was_executed = false
        }
      }
    } catch (error) {
      console.error(`Error processing decision for ${provider}:`, error);
    }
  }

  /**
   * Check and execute stop losses and profit targets (Alpha Arena-style exit plan monitoring)
   */
  async checkStopLosses(): Promise<void> {
    const { data: positions } = await supabase
      .from('positions')
      .select('*, llm_traders(name)')
      .eq('is_active', true)
      .gt('amount', 0.00000001);

    if (!positions) return;

    for (const position of positions) {
      const currentPrice = await getCurrentPrice(position.coin);

      // Check if profit target hit (take profit)
      if (position.profit_target_price && currentPrice >= position.profit_target_price) {
        console.log(
          `✓ Profit target hit for ${position.coin} at $${currentPrice.toFixed(2)} (target: $${position.profit_target_price.toFixed(2)})`
        );

        await this.executeSell(
          position.llm_trader_id,
          position.coin,
          position.amount,
          `Profit target reached at $${currentPrice.toFixed(2)}`
        );
        continue; // Skip to next position since this one is now closed
      }

      // Check if stop loss triggered
      if (position.stop_loss_price && currentPrice <= position.stop_loss_price) {
        console.log(
          `✗ Stop loss triggered for ${position.coin} at $${currentPrice.toFixed(2)} (stop: $${position.stop_loss_price.toFixed(2)})`
        );

        await this.executeSell(
          position.llm_trader_id,
          position.coin,
          position.amount,
          `Stop loss triggered at $${currentPrice.toFixed(2)}`
        );
        continue; // Skip to next position since this one is now closed
      }

      // Update current price and P&L
      const pnl = (currentPrice - position.entry_price) * position.amount;
      const pnlPercentage = (pnl / position.investment_value) * 100;

      await supabase
        .from('positions')
        .update({
          current_price: currentPrice,
          current_value: currentPrice * position.amount,
          pnl,
          pnl_percentage: pnlPercentage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);
    }
  }

  /**
   * Save market snapshot to database
   */
  async saveMarketSnapshot(marketData: MarketData[]): Promise<void> {
    const snapshots = marketData.map((m) => ({
      coin: m.coin,
      price: m.price,
      volume_24h: m.volume_24h,
      price_change_24h: m.price_change_24h,
      ema_12: m.ema_12,
      ema_26: m.ema_26,
      rsi_14: m.rsi_14,
      macd: m.macd,
      macd_signal: m.macd_signal,
    }));

    await supabase.from('market_snapshots').insert(snapshots);
  }

  /**
   * Save performance snapshot to database (only runs when trading is active)
   */
  async savePerformanceSnapshot(): Promise<void> {
    // Skip snapshot if a trade is currently being executed to prevent race conditions
    if (this.isExecutingTrade) {
      console.log('[SNAPSHOT] Skipping snapshot - trade execution in progress');
      return;
    }

    try {
      // Get all traders
      const { data: traders } = await supabase
        .from('llm_traders')
        .select('*')
        .order('name');

      if (!traders) return;

      // Get all active positions (filter out dust positions)
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('is_active', true)
        .gt('amount', 0.00000001);

      // Calculate portfolio value for each trader
      const calculatePortfolioValue = (traderName: string) => {
        const trader = traders.find((t) => t.name === traderName);
        if (!trader) return 100;

        const traderPositions = (positions || []).filter(
          (p: any) => p.llm_trader_id === trader.id
        );
        const positionsValue = traderPositions.reduce(
          (sum: number, p: any) => sum + (p.current_price * p.amount),
          0
        );

        return trader.current_balance + positionsValue;
      };

      // Get benchmark value
      const { data: benchmark } = await supabase
        .from('benchmark')
        .select('current_value')
        .eq('strategy', 'buy_and_hold')
        .single();

      // Insert performance snapshot
      await supabase
        .from('performance_history')
        .insert({
          timestamp: new Date().toISOString(),
          openai_value: calculatePortfolioValue('OpenAI'),
          claude_value: calculatePortfolioValue('Claude'),
          deepseek_value: calculatePortfolioValue('DeepSeek'),
          qwen_value: calculatePortfolioValue('Qwen'),
          buy_and_hold_value: benchmark?.current_value || 100,
        });
    } catch (error) {
      // Ignore duplicate timestamp errors (constraint violation)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return;
      }
      console.error('Error saving performance snapshot:', error);
    }
  }

  /**
   * Main trading loop
   */
  async runTradingCycle(): Promise<void> {
    const cycleStartTime = new Date();
    try {
      // Check database status before proceeding with the trading cycle
      const { data: status, error: statusError } = await supabase
        .from('trading_status')
        .select('is_running')
        .eq('id', 1)
        .single();

      if (statusError) {
        console.error('[TRADING] Error checking database status:', statusError);
      }

      if (!status?.is_running) {
        console.log('[TRADING] ⚠️  Database shows trading is stopped, halting engine...');
        this.stop();
        return;
      }

      console.log('\n\n╔═══════════════════════════════════════════════════╗');
      console.log('║           TRADING CYCLE STARTING                  ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log(`⏰ Time: ${cycleStartTime.toLocaleString()}`);
      console.log(`📊 Mode: ${this.isPaperMode ? 'PAPER TRADING' : 'LIVE TRADING'}`);
      console.log(`⏱️  Interval: ${this.currentIntervalMinutes} minute(s)`);
      console.log(`🤖 Enabled LLMs: ${this.enabledLLMs.join(', ')}`);
      console.log('═══════════════════════════════════════════════════\n');

      // Get market data
      console.log('📡 Fetching market data from Binance...');
      const marketData = await getAllMarketData(Array.from(CRYPTO_PAIRS));
      console.log(`✓ Fetched data for ${marketData.length} coins\n`);

      // Save market snapshot
      await this.saveMarketSnapshot(marketData);

      // Check stop losses
      console.log('🎯 Checking stop losses and profit targets...');
      await this.checkStopLosses();
      console.log('✓ Stop loss check completed\n');

      // Get all traders
      const { data: traders } = await supabase
        .from('llm_traders')
        .select('*');

      if (!traders) return;

      // Process decisions only for enabled traders
      console.log('🧠 Processing LLM decisions...\n');
      for (const trader of traders) {
        if (this.enabledLLMs.includes(trader.provider)) {
          console.log(`━━━ Processing ${trader.provider} ━━━`);
          await this.processDecision(trader.id, trader.provider as LLMProvider, marketData);
        } else {
          console.log(`⊘ Skipping ${trader.provider} - disabled in settings`);
        }
      }

      const cycleEndTime = new Date();
      const cycleDuration = (cycleEndTime.getTime() - cycleStartTime.getTime()) / 1000;
      const nextCycleTime = new Date(cycleEndTime.getTime() + this.currentIntervalMinutes * 60 * 1000);

      console.log('\n╔═══════════════════════════════════════════════════╗');
      console.log('║           TRADING CYCLE COMPLETED                 ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log(`✓ Cycle duration: ${cycleDuration.toFixed(2)} seconds`);
      console.log(`⏭️  Next cycle at: ${nextCycleTime.toLocaleTimeString()}`);
      console.log(`⏳ Next decision in: ${this.currentIntervalMinutes} minute(s)`);
      console.log('═══════════════════════════════════════════════════\n\n');
    } catch (error) {
      console.error('\n❌ ERROR in trading cycle:', error);
      console.error('═══════════════════════════════════════════════════\n');
    }
  }

  /**
   * Start the trading engine
   */
  start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      console.log('Trading engine is already running');
      return;
    }

    this.isRunning = true;
    this.currentIntervalMinutes = intervalMinutes;
    console.log(`\n╔════════════════════════════════════════════════════╗`);
    console.log(`║          TRADING ENGINE CONFIGURATION             ║`);
    console.log(`╚════════════════════════════════════════════════════╝`);
    console.log(`📊 Mode: ${this.isPaperMode ? 'PAPER TRADING' : 'LIVE TRADING'}`);
    console.log(`⏱️  Trading cycle interval: ${intervalMinutes} minute(s)`);
    console.log(`📈 Performance snapshots: Every 30 seconds`);
    console.log(`🤖 Enabled LLMs: ${this.enabledLLMs.join(', ')}`);
    console.log(`\n🎯 SELECTED MODELS (from Settings):`);
    Object.entries(this.selectedModels).forEach(([provider, model]) => {
      const isEnabled = this.enabledLLMs.includes(provider);
      console.log(`   ${isEnabled ? '✓' : '✗'} ${provider.padEnd(10)} → ${model}`);
    });
    console.log(`════════════════════════════════════════════════════\n`);

    // Run immediately
    this.runTradingCycle();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.runTradingCycle();
      }
    }, intervalMinutes * 60 * 1000);

    // Start performance snapshot interval (every 30 seconds)
    this.snapshotIntervalId = setInterval(() => {
      if (this.isRunning) {
        this.savePerformanceSnapshot();
      }
    }, 30 * 1000);
  }

  /**
   * Stop the trading engine
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.snapshotIntervalId) {
      clearInterval(this.snapshotIntervalId);
      this.snapshotIntervalId = null;
    }
    console.log('Trading engine stopped');
  }

  /**
   * Restart the trading engine with new interval
   */
  restart(intervalMinutes: number): void {
    const wasRunning = this.isRunning;
    this.stop();
    if (wasRunning) {
      this.start(intervalMinutes);
    }
  }

  /**
   * Set trading mode
   */
  setMode(isPaperMode: boolean): void {
    this.isPaperMode = isPaperMode;
    console.log(`Trading mode set to ${isPaperMode ? 'PAPER' : 'LIVE'}`);
  }
}
