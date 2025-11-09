# Quick Setup Guide

## 🎯 What You Have

A complete LLM crypto trading experiment platform that compares:
- **OpenAI GPT-4o**
- **Claude 3.5 Sonnet**
- **DeepSeek**
- **Qwen**
- **Buy & Hold Baseline**

Each starts with $100 and trades BTC, ETH, SOL, BNB, XRP using technical analysis.

## 📋 Next Steps

### 1. Add Your API Keys

Edit `.env.local` and add your missing API keys:

\`\`\`bash
# You already have Binance and DeepSeek configured
# Add these:

OPENAI_API_KEY=sk-...                    # Get from platform.openai.com
ANTHROPIC_API_KEY=sk-ant-...             # Get from console.anthropic.com
QWEN_API_KEY=sk-...                      # Get from dashscope.console.aliyun.com
\`\`\`

### 2. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000

### 3. Initialize & Start Trading

1. Click **"Initialize System"** - sets up traders and benchmark
2. Review the dashboard (75% chart, 25% activity feed)
3. Click **"START"** to begin trading (starts in PAPER mode)
4. Watch the LLMs make decisions in real-time

## 🎛️ Controls

- **START/STOP**: Start or pause the trading experiment
- **PAPER/LIVE**: Toggle between simulation and real trading
  - ⚠️ Stop trading before switching modes
  - ⚠️ Start with PAPER mode to test
- **Export Data**: Download all experiment data as JSON

## 📊 Dashboard

### Performance Chart (75%)
- Shows portfolio value over time for all 5 strategies
- Each LLM gets a different color line
- Buy & Hold is shown as a dashed gray line
- Summary below chart shows current value and P&L %

### Activity Feed (25%)
Two tabs:
1. **Decisions**: Recent LLM decisions with reasoning
   - Green = BUY, Red = SELL, Gray = HOLD
   - ✓ indicates decision was executed
2. **Positions**: Current open positions with live P&L

## ⚙️ How It Works

1. **Every 60 minutes**, the system:
   - Fetches latest prices and calculates technical indicators
   - Checks for stop-loss triggers (5% threshold)
   - Asks each LLM to analyze and decide
   - Executes approved trades

2. **LLMs receive**:
   - Current prices for all 5 coins
   - Technical indicators (RSI, EMA, MACD, volume)
   - Their portfolio state (balance + positions)

3. **LLMs decide**:
   - BUY: Which coin, how much to invest
   - SELL: Which coin, how much to sell
   - HOLD: Do nothing

4. **Everything is logged** to Supabase:
   - All decisions + reasoning
   - All trades
   - Position history
   - Market snapshots

## 🔒 Safety Features

- Starts in **PAPER MODE** (no real money)
- **5% stop-loss** on all positions
- **1 position per coin** per LLM (prevents over-exposure)
- **Complete audit trail** of all decisions

## 🚨 Before Going LIVE

1. ✅ Test thoroughly in paper mode for at least a few days
2. ✅ Review LLM decisions - do they make sense?
3. ✅ Start with small amounts ($10-20 per LLM)
4. ✅ Enable Binance API trading permissions
5. ✅ Monitor the first few trading cycles closely
6. ✅ Be aware of API rate limits

## 📁 Project Structure

\`\`\`
cortex/
├── app/
│   ├── api/              # API routes for data & controls
│   └── page.tsx          # Main dashboard
├── components/           # React components
│   ├── performance-chart.tsx
│   └── activity-feed.tsx
├── lib/
│   ├── supabase.ts       # Database client
│   ├── binance.ts        # Market data & trading
│   ├── trading-engine.ts # Core logic
│   ├── benchmark.ts      # Buy & Hold tracker
│   └── llm/              # LLM integrations
└── .env.local            # Your API keys
\`\`\`

## 🐛 Troubleshooting

### "Initialization failed"
- Check all API keys are set correctly
- Verify Supabase connection (should work via MCP)

### "No decisions appearing"
- Make sure you clicked START
- Check browser console for errors
- Verify all LLM API keys are valid

### "Binance errors"
- Verify API key has necessary permissions
- Check if IP needs to be whitelisted

## 🎓 Tips

- **Watch the first cycle closely** - LLMs make decisions every hour
- **Compare strategies** - Which LLM performs better? Why?
- **Review reasoning** - Click decisions to see LLM explanations
- **Export data** - Download for deeper analysis in Excel/Python
- **Adjust strategy** - You can modify the prompt in `lib/llm/base.ts`

## 📈 Success Metrics

After running for 1-2 weeks, compare:
- **Total Return %**: Who made the most money?
- **Win Rate**: Which LLM has best success ratio?
- **Risk Management**: Who sized positions better?
- **vs Buy & Hold**: Did active trading beat passive?

## ⚠️ Disclaimer

This is experimental. Crypto trading involves risk. Start with paper trading, then small amounts. Not financial advice. Use at your own risk.

---

**Built with:** Next.js, Supabase, Binance API, OpenAI, Anthropic, DeepSeek, Qwen

**Questions?** Check the main README.md for detailed documentation.
