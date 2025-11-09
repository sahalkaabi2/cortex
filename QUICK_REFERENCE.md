# Quick Reference - Cortex Development

## Daily Workflow

```bash
# 1. Develop in cryptollmtrader/
cd ~/Desktop/Projects/cryptollmtrader
npm run dev

# 2. Make changes, test, etc.

# 3. When ready to release:
./release.sh
```

That's it! The script handles everything else.

---

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Install new dependency
npm install package-name
```

### Release
```bash
# Automated release (recommended)
./release.sh

# Manual sync only (no git commit)
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' \
  --exclude='.env' --exclude='.env.local' --exclude='.DS_Store' \
  ~/Desktop/Projects/cryptollmtrader/ ~/Desktop/Projects/cortex-release/
```

---

## Directory Map

```
Development:  ~/Desktop/Projects/cryptollmtrader/
Release:      ~/Desktop/Projects/cortex-release/
GitHub:       https://github.com/sahalkaabi2/cortex
```

---

## Version Numbers

- **Patch** (0.1.1): Bug fixes
- **Minor** (0.2.0): New features
- **Major** (1.0.0): Breaking changes

---

## Release Checklist

Before running `./release.sh`:

- [ ] Code works (`npm run dev`)
- [ ] Build succeeds (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] CHANGELOG.md updated
- [ ] Tested in paper mode

---

## Troubleshooting

**Script won't run:**
```bash
chmod +x release.sh
```

**Wrong directory:**
```bash
cd ~/Desktop/Projects/cryptollmtrader
```

**Git credentials:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## File Locations

| File | Purpose |
|------|---------|
| `DEVELOPMENT_WORKFLOW.md` | Full workflow documentation |
| `release.sh` | Automated release script |
| `QUICK_REFERENCE.md` | This file - quick commands |
| `.env.local` | Your API keys (NEVER commit!) |
| `package.json` | Project configuration |
| `CHANGELOG.md` | Version history |

---

## Need Help?

1. Read: `DEVELOPMENT_WORKFLOW.md`
2. Check: Script output messages
3. Run: `git status` in both directories
4. Visit: https://github.com/sahalkaabi2/cortex

---

**Remember:** Develop → Test → `./release.sh` → Done! 🚀
