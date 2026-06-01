# Quick Reference - React + Rust Setup

## 🚀 Quick Start

### 1. Install Rust
```bash
# Download and install from: https://rustup.rs/
# Verify:
rustc --version
```

### 2. Configure Backend
```bash
cd kks_online_backend

# Create .env file with:
DATABASE_URL=your_supabase_connection_string
PORT=3000
GEMINI_API_KEY=dummy_key
```

### 3. Install Dependencies
```bash
# From root directory
npm run install:all
```

### 4. Start Both Services (Easiest Way) ⭐
```bash
# From root directory - runs both Rust backend and React frontend
npm run dev
```

**Output will show:**
- `[RUST]` - Rust backend logs (cyan)
- `[REACT]` - React frontend logs (magenta)

**Or start separately:**

**Terminal 1 - Backend:**
```bash
npm run backend
```

**Terminal 2 - Frontend:**
```bash
npm run frontend
```

## 📋 What Changed

| Item | Before | After |
|------|--------|-------|
| Backend | Express.js (port 5000) | Rust (port 3000) |
| API URL | localhost:5000 | localhost:3000 |
| Frontend Code | No changes | No changes |
| Features | All working | All working |

## ✅ Features Working

- ✅ Product listing
- ✅ Search with suggestions
- ✅ Category filtering
- ✅ Brand filtering
- ✅ Product details
- ✅ Product variants
- ✅ Popular products
- ✅ Sorting & pagination

## 🎯 Test Checklist

Open http://localhost:5173 and verify:

- [ ] Home page loads with products
- [ ] Search bar shows suggestions
- [ ] Products can be filtered
- [ ] Product details page works
- [ ] Variants display correctly

## 🔧 Common Issues

**Backend won't start:**
```bash
# Check .env file exists
ls .env

# Verify DATABASE_URL is set
cat .env | grep DATABASE_URL
```

**Frontend can't connect:**
```bash
# Ensure backend is on port 3000
curl http://localhost:3000/api/v1/products/popular

# Check frontend config
cat react-frontend/src/services/api.config.ts | grep 3000
```

**Port already in use:**
```bash
# Change port in .env
PORT=3001

# Or kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

## 📁 Key Files

```
kks_web/
├── kks_online_backend/
│   ├── .env                    ← CREATE THIS (your config)
│   ├── src/main.rs             ← Routes defined here
│   └── Cargo.toml              ← Dependencies
│
├── react-frontend/
│   ├── src/services/
│   │   └── api.config.ts       ← Changed: port 3000
│   └── package.json
│
└── Documentation:
    ├── IMPLEMENTATION_COMPLETE.md   ← Start here
    ├── MIGRATION_SUMMARY.md         ← Full details
    ├── FRONTEND_BACKEND_SETUP.md    ← Setup guide
    └── QUICK_REFERENCE.md           ← This file
```

## 🔗 API Endpoints

### Test with curl:
```bash
# Popular products
curl http://localhost:3000/api/v1/products/popular

# Search suggestions  
curl "http://localhost:3000/api/v1/products/search/suggestions?q=mat"

# Products with filters
curl "http://localhost:3000/api/v1/products?categoryId=1&page=1"

# Product details
curl http://localhost:3000/api/v1/products/1
```

## 📚 Documentation

| File | Purpose |
|------|---------|
| IMPLEMENTATION_COMPLETE.md | What was done, what to do next |
| MIGRATION_SUMMARY.md | Complete migration details |
| FRONTEND_BACKEND_SETUP.md | Detailed setup instructions |
| kks_online_backend/SETUP_INSTRUCTIONS.md | Backend-specific guide |

## 🆘 Getting Help

1. **Check logs:**
   - Backend: Terminal running `cargo run`
   - Frontend: Browser console (F12)

2. **Verify services:**
   ```bash
   # Backend health check
   curl http://localhost:3000/
   
   # Frontend
   # Should see Vite dev server message
   ```

3. **Database issues:**
   - Check Supabase dashboard
   - Verify DATABASE_URL format
   - Ensure IP is whitelisted

## ⚡ Development Commands

### Backend
```bash
cd kks_online_backend

cargo run              # Debug mode
cargo run --release    # Optimized
cargo watch -x run     # Auto-reload
cargo check           # Quick validation
cargo test            # Run tests
```

### Frontend
```bash
cd react-frontend

npm run dev           # Dev server
npm run build         # Production build
npm run preview       # Preview build
npm run lint          # Lint code
```

## 🔄 Rollback to Express

If needed:
```typescript
// react-frontend/src/services/api.config.ts
const API_BASE_URL = 'http://localhost:5000';
```

Then:
```bash
cd kksonline-backend
npm start
```

## 🎉 Success Indicators

You know it's working when:
- ✅ Backend shows "🚀 Server starting"
- ✅ Frontend opens at localhost:5173
- ✅ Products load on home page
- ✅ Search suggestions appear
- ✅ No console errors

---

**Need more details?** See `IMPLEMENTATION_COMPLETE.md`
