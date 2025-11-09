import Binance from 'binance-api-node';
import { MarketData } from './types';
import { calculateEMA, calculateRSI, calculateMACD } from './indicators';

const client = Binance({
  apiKey: process.env.BINANCE_API_KEY || '',
  apiSecret: process.env.BINANCE_API_SECRET || '',
});

/**
 * Get current market data for a coin with technical indicators
 * Includes multi-timeframe analysis (1H base, 3-min intraday, 4H longer-term)
 */
export async function getMarketData(coin: string): Promise<MarketData> {
  const symbol = `${coin}USDT`;

  try {
    // Get 24hr ticker
    const tickerData = await client.dailyStats({ symbol });
    const ticker = Array.isArray(tickerData) ? tickerData[0] : tickerData;

    // Fetch multiple timeframes in parallel for efficiency
    const [candles1h, candles3m, candles4h] = await Promise.all([
      // 1H candles for base indicators (100 candles = ~4 days)
      client.candles({
        symbol,
        interval: '1h',
        limit: 100,
      }),
      // 3-minute candles for intraday context (100 candles = 5 hours)
      client.candles({
        symbol,
        interval: '3m',
        limit: 100,
      }),
      // 4H candles for longer-term context (100 candles = ~16 days)
      client.candles({
        symbol,
        interval: '4h',
        limit: 100,
      }),
    ]);

    // === BASE INDICATORS (1H timeframe) ===
    const closePrices1h = candles1h.map(c => parseFloat(c.close));
    const ema12 = calculateEMA(closePrices1h, 12);
    const ema26 = calculateEMA(closePrices1h, 26);
    const ema20 = calculateEMA(closePrices1h, 20);
    const ema50 = calculateEMA(closePrices1h, 50);
    const rsi14 = calculateRSI(closePrices1h, 14);
    const rsi7 = calculateRSI(closePrices1h, 7);
    const { macd, signal } = calculateMACD(closePrices1h);

    // === INTRADAY CONTEXT (3-minute timeframe) ===
    const closePrices3m = candles3m.map(c => parseFloat(c.close));

    // Last 10 prices (30 minutes of price action)
    const priceHistory3m = closePrices3m.slice(-10);

    // Calculate RSI-7 for last 10 periods
    const rsiHistory3m: number[] = [];
    for (let i = closePrices3m.length - 10; i < closePrices3m.length; i++) {
      const rsi = calculateRSI(closePrices3m.slice(0, i + 1), 7);
      rsiHistory3m.push(rsi);
    }

    // Calculate EMA-20 for last 10 periods
    const emaHistory3m: number[] = [];
    for (let i = closePrices3m.length - 10; i < closePrices3m.length; i++) {
      const ema = calculateEMA(closePrices3m.slice(0, i + 1), 20);
      emaHistory3m.push(ema);
    }

    // === LONGER-TERM CONTEXT (4H timeframe) ===
    const closePrices4h = candles4h.map(c => parseFloat(c.close));
    const latest4h = candles4h[candles4h.length - 1];
    const rsi4h = calculateRSI(closePrices4h, 14);
    const { macd: macd4h } = calculateMACD(closePrices4h);

    return {
      coin,
      price: parseFloat(ticker.lastPrice),
      volume_24h: parseFloat(ticker.volume),
      price_change_24h: parseFloat(ticker.priceChangePercent),
      // Base indicators (1H timeframe)
      ema_12: ema12,
      ema_26: ema26,
      ema_20: ema20,
      ema_50: ema50,
      rsi_14: rsi14,
      rsi_7: rsi7,
      macd,
      macd_signal: signal,
      // Intraday multi-timeframe data (3-min intervals)
      price_history_3m: priceHistory3m,
      rsi_history_3m: rsiHistory3m,
      ema_history_3m: emaHistory3m,
      // Longer-term context (4H timeframe)
      price_4h: parseFloat(latest4h.close),
      volume_4h: parseFloat(latest4h.volume),
      rsi_4h: rsi4h,
      macd_4h: macd4h,
    };
  } catch (error) {
    console.error(`Error fetching market data for ${coin}:`, error);
    throw error;
  }
}

/**
 * Get market data for all tracked coins
 */
export async function getAllMarketData(coins: string[]): Promise<MarketData[]> {
  const promises = coins.map(coin => getMarketData(coin));
  return Promise.all(promises);
}

/**
 * Get current price for a coin
 */
export async function getCurrentPrice(coin: string): Promise<number> {
  const symbol = `${coin}USDT`;

  try {
    const pricesData = await client.prices({ symbol });
    return parseFloat(pricesData[symbol]);
  } catch (error) {
    console.error(`Error fetching price for ${coin}:`, error);
    throw error;
  }
}

/**
 * Execute a market order (Buy/Sell)
 */
export async function executeMarketOrder(
  coin: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  isPaperTrade: boolean = true
): Promise<{ price: number; quantity: number; total: number }> {
  const symbol = `${coin}USDT`;

  if (isPaperTrade) {
    // Paper trading - simulate order execution
    const currentPrice = await getCurrentPrice(coin);
    return {
      price: currentPrice,
      quantity,
      total: currentPrice * quantity,
    };
  }

  try {
    // Live trading - execute real order
    const order = await client.order({
      symbol,
      side,
      type: 'MARKET' as any, // Type assertion for binance API
      quantity: quantity.toString(),
    });

    return {
      price: parseFloat(order.price),
      quantity: parseFloat(order.executedQty),
      total: parseFloat(order.cummulativeQuoteQty),
    };
  } catch (error) {
    console.error(`Error executing ${side} order for ${coin}:`, error);
    throw error;
  }
}

/**
 * Get account balance for USDT
 */
export async function getUSDTBalance(): Promise<number> {
  try {
    const accountInfo = await client.accountInfo();
    const usdtBalance = accountInfo.balances.find(b => b.asset === 'USDT');
    return parseFloat(usdtBalance?.free || '0');
  } catch (error) {
    console.error('Error fetching USDT balance:', error);
    throw error;
  }
}
