# Cortex Development Directory

⚠️ **This is your PRIVATE development directory** ⚠️

## What is this directory?

This is where you develop Cortex. It contains:
- ✅ Your source code
- ✅ Your `.env` and `.env.local` files with API keys
- ✅ Your `node_modules/`
- ✅ Development scripts and tools
- ❌ **NOT connected to GitHub** (safe for API keys)

## Public Repository

The public GitHub repository is at:
**https://github.com/sahalkaabi2/cortex**

That repository is synced from:
**~/Desktop/Projects/cortex-release/**

## Simple Workflow

```bash
# 1. Develop here
cd ~/Desktop/Projects/cryptollmtrader
npm run dev
# ... make changes ...

# 2. Test
npm run build
npm run lint

# 3. Release to GitHub
./release.sh
```

## Files in This Directory

### Development Files (PRIVATE - Never commit to public repo)
- `.env` and `.env.local` - Your API keys
- `node_modules/` - Dependencies
- `.next/` - Build output

### Workflow Files (Local only)
- `release.sh` - Automated release script
- `DEVELOPMENT_WORKFLOW.md` - Full workflow documentation
- `QUICK_REFERENCE.md` - Quick command reference
- `DEV_README.md` - This file

### Source Code (Will be synced to public repo)
- `app/`, `components/`, `lib/` - Your code
- `README.md`, `LICENSE`, etc. - Documentation
- `.gitignore` - Ensures .env files are never committed

## Quick Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Check for errors

# Release
./release.sh         # Sync and push to GitHub

# Help
cat QUICK_REFERENCE.md          # Quick commands
cat DEVELOPMENT_WORKFLOW.md     # Full workflow
```

## Safety Features

The release script automatically:
- ✅ Excludes `.env` and `.env.local` files
- ✅ Excludes `node_modules/`
- ✅ Excludes `.git/` history
- ✅ Verifies .gitignore is correct
- ✅ Only syncs source code and documentation

## Directory Structure

```
~/Desktop/Projects/
├── cryptollmtrader/          👈 YOU ARE HERE (Development)
│   ├── .env.local           (Your API keys - PRIVATE)
│   ├── release.sh           (Release automation)
│   ├── app/                 (Source code)
│   └── ...
│
└── cortex-release/           👈 Public Release
    ├── app/                 (Same source code)
    ├── .git/                (Connected to GitHub)
    └── ...                  (NO .env files!)
```

## Need Help?

1. **Quick commands**: `cat QUICK_REFERENCE.md`
2. **Full workflow**: `cat DEVELOPMENT_WORKFLOW.md`
3. **Release script**: `./release.sh --help` (or just run it)
4. **GitHub repo**: https://github.com/sahalkaabi2/cortex

## Important Notes

- 🔒 This directory is NOT connected to GitHub (safe for secrets)
- 🚀 Use `./release.sh` to sync code to public repo
- 🔑 Never commit `.env` or `.env.local` files
- ✅ Always test before releasing (`npm run build && npm run lint`)

---

**Happy coding!** When you're ready to share your changes, just run `./release.sh` 🎉
