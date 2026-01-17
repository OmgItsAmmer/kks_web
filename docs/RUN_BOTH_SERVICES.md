# Running Both Services Together

## Quick Start

From the **root directory**, run:

```bash
npm run dev
```

This single command starts both:
- 🦀 **Rust Backend** on `http://localhost:3000`
- ⚛️ **React Frontend** on `http://localhost:5173`

## Available Scripts

### Development

```bash
npm run dev              # Run both services (debug mode)
npm run dev:release      # Run both services (optimized/release mode)
```

### Individual Services

```bash
npm run backend          # Run Rust backend only (debug)
npm run backend:release  # Run Rust backend only (optimized)
npm run frontend         # Run React frontend only
```

### Building

```bash
npm run build            # Build both for production
npm run build:backend    # Build Rust backend only
npm run build:frontend   # Build React frontend only
```

### Setup

```bash
npm run install:all      # Install all dependencies (root + frontend)
```

## Output Format

When running `npm run dev`, you'll see color-coded output:

```
[RUST] ✅ Configuration loaded successfully
[RUST] ✅ Database connected successfully
[RUST] 🚀 Server starting on 0.0.0.0:3000

[REACT] VITE v6.3.9  ready in 500 ms
[REACT] ➜  Local:   http://localhost:5173/
```

- **Cyan** = Rust backend logs
- **Magenta** = React frontend logs

## Prerequisites

1. **Rust installed** - https://rustup.rs/
2. **Node.js installed** - v18 or higher
3. **Backend configured** - `.env` file in `kks_online_backend/`

## First Time Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure backend (create .env file)
cd kks_online_backend
# Create .env with DATABASE_URL, PORT, GEMINI_API_KEY

# 3. Run both services
cd ..
npm run dev
```

## Troubleshooting

### "cargo: command not found"
**Solution**: Install Rust from https://rustup.rs/

### "npm: command not found"
**Solution**: Install Node.js from https://nodejs.org/

### Backend fails to start
**Solution**: 
- Check `.env` file exists in `kks_online_backend/`
- Verify `DATABASE_URL` is correct
- Check backend logs in the `[RUST]` output

### Frontend fails to start
**Solution**:
- Run `npm run install:all` to install dependencies
- Check frontend logs in the `[REACT]` output

### Port already in use
**Solution**:
- Backend (3000): Change `PORT=3001` in `.env`
- Frontend (5173): Vite will auto-increment to 5174

### Want to stop both services?
Press `Ctrl+C` once - concurrently will stop both services.

## Advanced Usage

### Run with specific Rust build mode

```bash
# Debug mode (faster compilation, slower runtime)
npm run dev

# Release mode (slower compilation, faster runtime)
npm run dev:release
```

### Run only one service

```bash
# Just backend
npm run backend

# Just frontend
npm run frontend
```

### Custom concurrently options

Edit `package.json` to customize:
- Colors: Change `-c "cyan,magenta"` to your preferred colors
- Names: Change `-n "RUST,REACT"` to your preferred prefixes
- Kill behavior: Add `-k` to kill all on exit

## Production Build

```bash
# Build both
npm run build

# Backend binary will be at:
# kks_online_backend/target/release/kks_online_backend

# Frontend build will be at:
# react-frontend/dist/
```

## Tips

1. **First Rust build is slow** - Subsequent builds are much faster
2. **Use release mode for testing** - Better performance, closer to production
3. **Watch for errors** - Both services log to the same terminal
4. **Separate terminals** - If you prefer, use `npm run backend` and `npm run frontend` in separate terminals

## Example Workflow

```bash
# 1. Clone/navigate to project
cd kks_web

# 2. Install dependencies (first time only)
npm run install:all

# 3. Configure backend
cd kks_online_backend
# Create .env file
cd ..

# 4. Start development
npm run dev

# 5. Open browser
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000

# 6. Make changes - both services auto-reload
# 7. Press Ctrl+C to stop
```

## Integration with IDEs

### VS Code

Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "npm",
      "script": "dev",
      "problemMatcher": []
    }
  ]
}
```

Then run from Command Palette: `Tasks: Run Task > dev`

### Other IDEs

Most IDEs can run npm scripts directly. Look for "Run Script" or "NPM Scripts" option.

---

**That's it!** One command to rule them all: `npm run dev` 🚀
