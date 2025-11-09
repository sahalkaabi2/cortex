# Changelog

All notable changes to Cortex will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Mobile responsive design
- Additional LLM providers (Gemini, Mistral)
- Backtesting with historical data
- Advanced risk management features
- Performance analytics dashboard
- Email/webhook notification system

## [0.1.0] - 2025-01-09

### Added
- **Initial release of Cortex** - Your AI Trading Brain
- **Four LLM Trading Agents**: OpenAI GPT-4, Claude 3.5 Sonnet, DeepSeek, and Qwen
- **Five Trading Pairs**: BTC, ETH, SOL, BNB, XRP
- **Paper & Live Trading Modes**: Safe testing with simulated trades or real execution
- **Technical Analysis Integration**: EMA, RSI, MACD, volume data from Binance API
- **Real-time Dashboard**:
  - 75% performance comparison chart
  - 25% activity feed (Decisions, Positions, Prompts tabs)
  - Live price ticker for all 5 coins
- **Complete History Tracking**: All decisions, trades, and reasoning stored in Supabase
- **Risk Management**:
  - Automatic 5% stop-loss protection
  - Maximum 1 position per coin per LLM
  - Position sizing controls
- **Export Functionality**: Download all experiment data as JSON
- **Multi-LLM Comparison**: Fair comparison with identical prompts across all agents
- **Buy & Hold Benchmark**: Passive strategy baseline for performance comparison
- **Dark/Light Mode**: Terminal-inspired black & white design
- **Docker Support**: Production-ready containerization with docker-compose
- **Environment Configuration**: Secure API key management via environment variables
- **Database Schema**: Complete schema with migrations for Supabase
- **Comprehensive Documentation**:
  - Setup guides for all LLM providers
  - Deployment guide for Synology NAS
  - Troubleshooting documentation
  - Safety notes and best practices

### Technical Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Trading API**: Binance
- **LLM APIs**: OpenAI, Anthropic, DeepSeek, Qwen
- **Deployment**: Docker, Docker Compose

### Security
- Proper .gitignore configuration to exclude sensitive files
- Environment variable-based configuration
- No hardcoded API keys or credentials in source code
- Apache 2.0 + Commons Clause license (non-commercial use)

### Documentation
- Comprehensive README with setup and usage instructions
- CONTRIBUTING.md for community contributors
- CODE_OF_CONDUCT.md based on Contributor Covenant
- SECURITY.md for vulnerability reporting
- Detailed deployment guides

### Known Limitations
- Desktop-optimized UI (mobile responsiveness to be added)
- Limited to Binance exchange
- Basic error recovery mechanisms
- No automated testing infrastructure yet

[Unreleased]: https://github.com/sahalkaabi2/cortex/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sahalkaabi2/cortex/releases/tag/v0.1.0
