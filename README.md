# Project

Converted from Replit for local development.

## Prerequisites

- **Node.js 20.x or later** (check with `node -v`)
  - Download from [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
  - If using nvm: `nvm install 20 && nvm use 20`
  - On Windows with nvm-windows: `nvm install 20 && nvm use 20`

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Windows Users

Scripts using `NODE_ENV=...` syntax don't work on Windows natively. This project has been
patched to use `cross-env` which handles this automatically. If you see environment variable
errors, make sure `cross-env` is installed:
```bash
npm install
```

## Deployment

The server uses `process.env.PORT` so it works on any hosting platform (Railway, Render,
Heroku, Fly.io, etc.). Set the `PORT` environment variable in your hosting dashboard, or
it will default to 5000 locally.

## Troubleshooting

### "Unsupported engine" warnings
Your Node.js version is too old. Update to Node.js 20.x or later:
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download directly from https://nodejs.org/
```

### "ENOSPC: no space left on device" error
Free up disk space and try again:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
# On Windows: rd /s /q node_modules
npm install
```

### "EPERM" or permission errors on Windows
Close VS Code and any terminals, then delete the node_modules folder manually:
```powershell
# PowerShell (run as Administrator if needed)
Remove-Item -Recurse -Force node_modules
npm install
```

### "esbuild" or native module errors
Reinstall with the correct platform binaries:
```bash
rm -rf node_modules
npm install
```

## Environment Variables

Copy the `.env.example` file (if present) to `.env` and fill in your values:
```bash
cp .env.example .env
```

## Notes

- This project was converted from Replit. Replit-specific configuration files have been removed.
- Check the `.env.example` file for required environment variables.
- Database migration SQL files (if any) are in the `migrations/` folder.
