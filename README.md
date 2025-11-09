# Cortex

> **Your AI Trading Brain**

[![License](https://img.shields.io/badge/License-Apache_2.0_with_Commons_Clause-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/sahalkaabi2/cortex?style=social)](https://github.com/sahalkaabi2/cortex/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/sahalkaabi2/cortex)](https://github.com/sahalkaabi2/cortex/issues)
[![Build Status](https://img.shields.io/github/actions/workflow/status/sahalkaabi2/cortex/ci.yml?branch=main)](https://github.com/sahalkaabi2/cortex/actions)

**The intelligent layer between you and the markets.** Cortex is an advanced AI-powered cryptocurrency trading platform that compares the performance of 4 different Large Language Models (OpenAI, Claude, DeepSeek, Qwen) as autonomous traders against a Buy & Hold baseline strategy.

---

## Screenshots

*Coming soon - Add your screenshots here to showcase Cortex's dashboard, performance charts, and activity feed*

## Features

- **4 LLM Trading Agents**: OpenAI GPT-4, Claude 3.5 Sonnet, DeepSeek, and Qwen
- **5 Trading Pairs**: BTC, ETH, SOL, BNB, XRP
- **Paper & Live Trading**: Switch between simulation and real trading
- **Technical Analysis**: Uses EMA, RSI, MACD, volume data from Binance
- **Real-time Dashboard**: 75% performance chart + 25% activity feed
- **Complete History**: All decisions, trades, and reasoning stored in Supabase
- **Risk Management**: Stop-loss protection + LLM-managed exits
- **Export Functionality**: Download all experiment data as JSON

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **APIs**: Binance, OpenAI, Anthropic, DeepSeek, Qwen
- **Real-time Updates**: Auto-refresh every 10 seconds

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Binance account with API keys
- API keys for all 4 LLM providers
- Supabase project (already configured via MCP)

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment Variables

Copy the example file and add your API keys:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` and add your keys:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Binance
BINANCE_API_KEY=your-binance-api-key
BINANCE_API_SECRET=your-binance-api-secret

# LLM API Keys
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
QWEN_API_KEY=your-qwen-api-key

# Trading Mode
TRADING_MODE=paper
\`\`\`

### 4. Get API Keys

#### Binance
1. Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Create new API key
3. Enable "Enable Spot & Margin Trading" (for live trading)
4. Save API key and secret

#### OpenAI
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create new secret key

#### Anthropic (Claude)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Generate API key

#### DeepSeek
1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Create API key

#### Qwen (Alibaba Cloud)
1. Go to [Alibaba Cloud DashScope](https://dashscope.console.aliyun.com/)
2. Get API key

### 5. Run the Application

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Initialize System

Click "Initialize System" button to:
- Create 4 LLM trader accounts ($100 each)
- Initialize Buy & Hold benchmark ($100 split across 5 coins)
- Set up database tables

### 2. Start Trading

- Click **START** button to begin the experiment
- Trading cycle runs every 60 minutes
- Each LLM analyzes market data and makes decisions
- Dashboard updates every 10 seconds

### 3. Monitor Performance

- **Performance Chart (75%)**: Shows portfolio value over time for all 5 strategies
- **Activity Feed (25%)**:
  - **Decisions Tab**: Recent LLM decisions with reasoning
  - **Positions Tab**: Current open positions with P&L

### 4. Switch Modes

- **PAPER MODE** (default): Simulates trades without real money
- **LIVE MODE**: Executes real trades on Binance
- Stop trading before switching modes

### 5. Export Data

Click "Export Data" to download all experiment data as JSON:
- Performance history
- All decisions and reasoning
- Position snapshots

## How It Works

### Trading Flow

1. **Market Data Collection**: Fetches prices, volume, and calculates indicators (EMA, RSI, MACD)
2. **LLM Decision Making**: Each LLM receives:
   - Current market data for all 5 coins
   - Portfolio state (balance + positions)
   - Technical indicators
3. **Decision Execution**:
   - BUY: Opens new position (max 1 per coin per LLM)
   - SELL: Closes existing position
   - HOLD: No action
4. **Risk Management**: Automatic 5% stop-loss on all positions
5. **History Tracking**: All decisions, trades, and reasoning saved to Supabase

### Trading Rules

- Each LLM manages its own $100 portfolio
- Maximum 1 position per coin per LLM
- LLM decides position size and cash management
- Stop-loss automatically triggers at -5%
- All LLMs use identical prompts for fair comparison

## Database Schema

- `llm_traders`: Trader accounts and balances
- `positions`: Active trading positions
- `trades`: Complete trade history
- `llm_decisions`: All LLM decisions with reasoning
- `market_snapshots`: Historical market data
- `benchmark`: Buy & Hold performance tracking

## Safety Notes

### Security
- **IMPORTANT**: If you previously had API keys in `.env` or `.env.local` files, **rotate all your API keys** (Binance, OpenAI, Anthropic, DeepSeek, Qwen, Supabase) before making your repository public, even if they were never committed to git

### Trading Safety
- **Start with Paper Trading**: Test the system thoroughly before using real money
- **Use Small Amounts**: When switching to live trading, start with minimal funds
- **Monitor Closely**: Watch the first few trading cycles carefully
- **API Limits**: Be aware of Binance and LLM API rate limits
- **Stop Loss**: 5% stop-loss provides downside protection

## Troubleshooting

### "Initialization failed"
- Check that all API keys are correctly set in `.env.local`
- Verify Binance API has trading permissions enabled

### "No decisions appearing"
- Ensure trading is started (START button)
- Check browser console for errors
- Verify LLM API keys are valid

### "Binance API error"
- Check API key permissions
- Verify sufficient balance for paper trading simulation
- Check if IP is whitelisted (if restriction enabled)

## Project Structure

\`\`\`
cortex/
├── app/
│   ├── api/              # API routes
│   │   ├── init/         # Initialize system
│   │   ├── data/         # Fetch dashboard data
│   │   └── trading/      # Trading controls
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard
├── components/
│   ├── performance-chart.tsx  # Performance graph
│   └── activity-feed.tsx      # Decisions & positions
├── lib/
│   ├── supabase.ts       # Supabase client & types
│   ├── types.ts          # TypeScript types
│   ├── binance.ts        # Binance API integration
│   ├── indicators.ts     # Technical indicators
│   ├── trading-engine.ts # Core trading logic
│   ├── benchmark.ts      # Buy & Hold tracker
│   └── llm/              # LLM integrations
│       ├── base.ts       # Base interface
│       ├── openai.ts     # OpenAI provider
│       ├── claude.ts     # Claude provider
│       ├── deepseek.ts   # DeepSeek provider
│       ├── qwen.ts       # Qwen provider
│       └── index.ts      # Provider factory
└── .env.local            # Environment variables
\`\`\`

## License

This project is licensed under the Apache License 2.0 with Commons Clause - see the [LICENSE](LICENSE) file for details.

**Commons Clause**: This software is free for non-commercial use. Commercial use requires explicit permission from the copyright holder.

## Disclaimer

This is an experimental project for educational purposes. Cryptocurrency trading involves significant risk. Use at your own risk. The developers are not responsible for any financial losses.
