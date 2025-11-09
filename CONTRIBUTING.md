# Contributing to Cortex

Thank you for your interest in contributing to Cortex! We welcome contributions from the community to help make this AI trading platform better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Node version, etc.)
- **Error messages or logs**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When suggesting an enhancement:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed feature
- **Explain why this enhancement would be useful**
- **Include mockups or examples** if applicable

### Contributing Code

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm package manager
- Git

### Local Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cortex.git
   cd cortex
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Add your API keys to .env.local
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Access the app:**
   Open [http://localhost:3000](http://localhost:3000)

### Project Structure

```
cortex/
├── app/              # Next.js app directory
│   ├── api/         # API routes
│   └── page.tsx     # Main dashboard
├── components/      # React components
├── lib/             # Core business logic
│   ├── llm/        # LLM provider integrations
│   ├── binance.ts  # Market data integration
│   └── trading-engine.ts  # Trading logic
└── public/         # Static assets
```

## Pull Request Process

### Before Submitting

1. **Run the linter:**
   ```bash
   npm run lint
   ```

2. **Test your changes:**
   - Test in both paper and live modes (with minimal amounts)
   - Verify all LLM providers work
   - Check for console errors
   - Test on different browsers if UI changes

3. **Update documentation:**
   - Update README.md if needed
   - Add comments for complex code
   - Update relevant docs in `/docs` folder

### PR Guidelines

- **Keep PRs focused** - one feature or fix per PR
- **Write clear descriptions** - explain what and why
- **Reference issues** - link to related issues
- **Add screenshots** for UI changes
- **Be responsive** to review feedback

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Tested with paper trading
- [ ] Tested with live trading (minimal amounts)
- [ ] All LLMs work correctly

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings or errors
```

## Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Define proper types** - avoid `any`
- **Use interfaces** for object shapes
- **Enable strict mode** in tsconfig.json

### Code Style

- **Use 2 spaces** for indentation
- **Use single quotes** for strings
- **Add semicolons** at line endings
- **Use meaningful variable names**
- **Keep functions small** and focused
- **Add comments** for complex logic

### React/Next.js

- **Use functional components** with hooks
- **Follow React best practices**
- **Use async/await** instead of promises
- **Handle errors** appropriately
- **Clean up effects** (return cleanup functions)

### Example

```typescript
// Good
interface TraderConfig {
  llmProvider: LLMProvider;
  balance: number;
  enabled: boolean;
}

async function createTrader(config: TraderConfig): Promise<Trader> {
  try {
    // Implementation
    return trader;
  } catch (error) {
    console.error('Failed to create trader:', error);
    throw error;
  }
}

// Avoid
function createTrader(config: any) {
  // Missing error handling
  // Missing return type
  return trader;
}
```

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```
feat(llm): add support for GPT-4 Turbo

Added GPT-4 Turbo as a new LLM provider option with improved
performance and lower costs.

Closes #123
```

```
fix(trading): prevent duplicate position entries

Fixed race condition where multiple positions could be opened
for the same coin by the same trader.

Fixes #456
```

```
docs(readme): update installation instructions

Added troubleshooting section for common API key issues.
```

## Areas for Contribution

We welcome contributions in these areas:

### High Priority

- **Bug fixes** - especially critical issues
- **Performance improvements** - faster data fetching, optimized calculations
- **Test coverage** - unit tests, integration tests
- **Documentation** - improve guides, add examples
- **Error handling** - better error messages, recovery mechanisms

### Feature Ideas

- **Additional LLM providers** (Gemini, Mistral, etc.)
- **More trading pairs** beyond the current 5
- **Advanced indicators** (Bollinger Bands, Fibonacci, etc.)
- **Backtesting mode** using historical data
- **Portfolio optimization** algorithms
- **Risk management** improvements
- **Performance analytics** dashboard
- **Mobile responsiveness** improvements
- **Notification system** (email, webhook, SMS)
- **Multi-exchange support** (Coinbase, Kraken, etc.)

### Not Accepting

- Changes that enable commercial use without permission
- Features that violate exchange ToS
- Removal of safety features (stop-loss, risk management)
- Changes that expose API keys or sensitive data

## Questions?

- **Check existing issues** and discussions
- **Read the documentation** in `/docs`
- **Ask in Discussions** tab on GitHub
- **Contact maintainers** via GitHub issues

## License

By contributing to Cortex, you agree that your contributions will be licensed under the Apache 2.0 License with Commons Clause.

---

**Thank you for contributing to Cortex!** Your help makes this project better for everyone.
