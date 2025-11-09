import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { BuyAndHoldBenchmark } from '@/lib/benchmark';
import { getCurrentPrice } from '@/lib/binance';

export async function GET() {
  try {
    // Update benchmark with real-time prices first
    const benchmarkTracker = new BuyAndHoldBenchmark();
    await benchmarkTracker.updateValue();

    // Get all traders
    const { data: traders } = await supabase
      .from('llm_traders')
      .select('*')
      .order('name');

    // Get benchmark (now with updated values)
    const { data: benchmark } = await supabase
      .from('benchmark')
      .select('*')
      .eq('strategy', 'buy_and_hold')
      .single();

    // Get recent decisions with trader names
    const { data: decisions } = await supabase
      .from('llm_decisions')
      .select(`
        *,
        llm_traders(name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get active positions with trader names
    // Filter out dust positions (amount < 0.00000001) to prevent display issues
    const { data: positions } = await supabase
      .from('positions')
      .select(`
        *,
        llm_traders(name)
      `)
      .eq('is_active', true)
      .gt('amount', 0.00000001);

    // Update positions with current prices
    if (positions && positions.length > 0) {
      // Get unique coins from positions
      const uniqueCoins = [...new Set(positions.map((p: any) => p.coin))];

      // Fetch current prices for all coins
      const pricePromises = uniqueCoins.map(async (coin) => {
        try {
          const price = await getCurrentPrice(coin);
          return { coin, price };
        } catch (error) {
          console.error(`Error fetching price for ${coin}:`, error);
          return { coin, price: 0 };
        }
      });

      const currentPrices = await Promise.all(pricePromises);
      const priceMap = Object.fromEntries(
        currentPrices.map(({ coin, price }) => [coin, price])
      );

      // Update all positions concurrently to minimize race condition window
      // NOTE: P&L is calculated ONLY by the trading engine to avoid conflicts and race conditions
      await Promise.all(
        positions.map(async (position) => {
          const currentPrice = priceMap[position.coin] || position.current_price;
          const currentValue = position.amount * currentPrice;

          // Update ONLY price and value in database - trading engine handles P&L
          await supabase
            .from('positions')
            .update({
              current_price: currentPrice,
              current_value: currentValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', position.id);

          // Update the position object for response (P&L read from database, not recalculated)
          position.current_price = currentPrice;
          position.current_value = currentValue;
          // position.pnl and position.pnl_percentage remain as-is from database (set by trading engine)
        })
      );
    }

    // Format decisions
    const formattedDecisions = (decisions || []).map((d: any) => ({
      id: d.id,
      llm_name: d.llm_traders?.name || 'Unknown',
      decision_type: d.decision_type,
      coin: d.coin,
      suggested_amount: d.suggested_amount,
      reasoning: d.reasoning,
      was_executed: d.was_executed,
      created_at: d.created_at,
      market_data: d.market_data,
      portfolio_state: d.portfolio_state,
      api_cost: d.api_cost || 0,
      prompt_text: d.prompt_text,
      raw_response: d.raw_response,
      confidence: d.confidence,
      profit_target: d.profit_target,
      stop_loss_price: d.stop_loss_price,
      invalidation_condition: d.invalidation_condition,
      risk_usd: d.risk_usd,
    }));

    // Get trades for positions to calculate total fees/slippage
    const positionIds = (positions || []).map((p: any) => p.id);
    let tradesByPosition: Record<string, any[]> = {};

    if (positionIds.length > 0) {
      const { data: trades } = await supabase
        .from('trades')
        .select('position_id, trading_fee, slippage')
        .in('position_id', positionIds);

      // Group trades by position_id
      if (trades) {
        trades.forEach((trade: any) => {
          if (!tradesByPosition[trade.position_id]) {
            tradesByPosition[trade.position_id] = [];
          }
          tradesByPosition[trade.position_id].push(trade);
        });
      }
    }

    // Format positions with cost data
    const formattedPositions = (positions || []).map((p: any) => {
      // Calculate total fees and slippage for this position
      const positionTrades = tradesByPosition[p.id] || [];
      const totalTradingFees = positionTrades.reduce((sum: number, t: any) => sum + (t.trading_fee || 0), 0);
      const totalSlippage = positionTrades.reduce((sum: number, t: any) => sum + (t.slippage || 0), 0);

      return {
        id: p.id,
        llm_name: p.llm_traders?.name || 'Unknown',
        coin: p.coin,
        amount: p.amount,
        entry_price: p.entry_price,
        current_price: p.current_price,
        investment_value: p.investment_value,
        current_value: p.current_value,
        pnl: p.pnl,
        pnl_percentage: p.pnl_percentage,
        trading_fees: totalTradingFees,
        slippage: totalSlippage,
      };
    });

    // Calculate total portfolio value for each trader (balance + positions)
    const calculatePortfolioValue = (traderName: string) => {
      const trader = traders?.find((t) => t.name === traderName);
      if (!trader) return 100;

      const traderPositions = formattedPositions.filter(
        (p: any) => p.llm_name === traderName
      );
      const positionsValue = traderPositions.reduce(
        (sum: number, p: any) => sum + (p.current_price * p.amount),
        0
      );

      return trader.current_balance + positionsValue;
    };

    // Get closed positions (completed trades)
    const { data: closedPositions } = await supabase
      .from('positions')
      .select(`
        *,
        llm_traders(name)
      `)
      .eq('is_active', false)
      .order('updated_at', { ascending: false })
      .limit(100);

    // Fetch related trades for each closed position
    const closedPositionIds = (closedPositions || []).map((p: any) => p.id);
    let tradesByClosedPosition: Record<string, any> = {};

    if (closedPositionIds.length > 0) {
      const { data: closedTrades } = await supabase
        .from('trades')
        .select('*')
        .in('position_id', closedPositionIds);

      // Group by position_id and action
      if (closedTrades) {
        closedTrades.forEach((trade: any) => {
          if (!tradesByClosedPosition[trade.position_id]) {
            tradesByClosedPosition[trade.position_id] = { buy: null, sell: null };
          }
          if (trade.action === 'BUY') {
            tradesByClosedPosition[trade.position_id].buy = trade;
          } else if (trade.action === 'SELL') {
            tradesByClosedPosition[trade.position_id].sell = trade;
          }
        });
      }
    }

    // Format completed trades
    const formattedCompletedTrades = (closedPositions || []).map((p: any) => {
      const trades = tradesByClosedPosition[p.id] || { buy: null, sell: null };
      const buyTrade = trades.buy;
      const sellTrade = trades.sell;

      // Calculate duration
      const openedAt = new Date(p.opened_at);
      const closedAt = new Date(p.updated_at);
      const durationHours = (closedAt.getTime() - openedAt.getTime()) / (1000 * 60 * 60);

      // Determine exit reason
      let exitReason = 'MANUAL_EXIT';
      if (sellTrade && p.profit_target_price && sellTrade.price >= p.profit_target_price) {
        exitReason = 'PROFIT_TARGET_HIT';
      } else if (sellTrade && p.stop_loss_price && sellTrade.price <= p.stop_loss_price) {
        exitReason = 'STOP_LOSS_HIT';
      }

      // Calculate total costs
      const buyFee = buyTrade?.trading_fee || 0;
      const buySlippage = buyTrade?.slippage || 0;
      const sellFee = sellTrade?.trading_fee || 0;
      const sellSlippage = sellTrade?.slippage || 0;
      const totalCosts = buyFee + buySlippage + sellFee + sellSlippage;

      return {
        id: p.id,
        llm_name: p.llm_traders?.name || 'Unknown',
        coin: p.coin,
        entry_price: p.entry_price,
        exit_price: p.current_price,
        opened_at: p.opened_at,
        closed_at: p.updated_at,
        duration_hours: durationHours,
        amount: p.amount,
        investment_value: p.investment_value,
        final_value: p.current_value,
        pnl: p.pnl,
        pnl_percentage: p.pnl_percentage,
        profit_target_price: p.profit_target_price,
        stop_loss_price: p.stop_loss_price,
        exit_reason: exitReason,
        confidence: p.confidence,
        trading_fees: buyFee + sellFee,
        slippage: buySlippage + sellSlippage,
        total_costs: totalCosts,
        entry_reasoning: buyTrade?.reasoning,
        exit_reasoning: sellTrade?.reasoning,
      };
    });

    // Format performance data
    const performanceData = {
      OpenAI: calculatePortfolioValue('OpenAI'),
      Claude: calculatePortfolioValue('Claude'),
      DeepSeek: calculatePortfolioValue('DeepSeek'),
      Qwen: calculatePortfolioValue('Qwen'),
      BuyAndHold: benchmark?.current_value || 100,
    };

    return NextResponse.json({
      traders,
      benchmark,
      decisions: formattedDecisions,
      positions: formattedPositions,
      completedTrades: formattedCompletedTrades,
      performanceData,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
