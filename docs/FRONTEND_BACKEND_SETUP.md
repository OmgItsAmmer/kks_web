# Frontend Backend Setup Guide

This guide explains how to set up and run the React frontend with the Rust backend.

## Architecture

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Rust + Axum web framework
- **Database**: PostgreSQL (via Supabase)

## Prerequisites

1. **Node.js** (v18 or higher) - for frontend
2. **Rust** (latest stable) - for backend
3. **PostgreSQL/Supabase** - for database

## Backend Setup (Rust)

### 1. Navigate to backend directory
```bash
cd kks_online_backend
```

### 2. Configure environment variables
Create a `.env` file in the `kks_online_backend` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Server Configuration
PORT=3000
HOST=0.0.0.0

# AI Configuration (Optional - only for AI features)
GEMINI_API_KEY=your_gemini_api_key_here
```

**Note**: The `GEMINI_API_KEY` is only required if you plan to use AI features. For basic e-commerce functionality, you can leave it empty or remove it.

### 3. Install dependencies and run
```bash
cargo build --release
cargo run
```

The Rust backend will start on `http://localhost:3000`

### Backend API Endpoints

#### Express-Compatible Endpoints (for frontend)
- `GET /api/v1/products` - Get products with filters
- `GET /api/v1/products/popular` - Get popular products
- `GET /api/v1/products/search/suggestions` - Get search suggestions
- `GET /api/v1/products/category/:id` - Get products by category
- `GET /api/v1/products/brand/:id` - Get products by brand
- `GET /api/v1/products/:id` - Get product details
- `GET /api/v1/products/:id/variants` - Get product variants

#### Additional Features (not connected to frontend)
- Cart management endpoints
- Checkout endpoints
- Category endpoints
- AI command endpoints (optional)

## Frontend Setup (React)

### 1. Navigate to frontend directory
```bash
cd react-frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables (optional)
Create a `.env` file in the `react-frontend` directory if you want to customize the API URL:

```env
VITE_API_BASE_URL=http://localhost:3000
```

By default, the frontend is configured to connect to `http://localhost:3000` (Rust backend).

### 4. Run the development server
```bash
npm run dev
```

The React frontend will start on `http://localhost:5173`

## Running Both Services

### Option 1: Using Concurrently (Recommended) ⭐

Run both services from the root directory with a single command:

```bash
# From root directory
npm run dev
```

This will start:
- **RUST** backend on `http://localhost:3000` (cyan output)
- **REACT** frontend on `http://localhost:5173` (magenta output)

**For production build:**
```bash
npm run dev:release
```

**Available scripts:**
```bash
npm run dev              # Run both (debug mode)
npm run dev:release      # Run both (release/optimized mode)
npm run backend           # Run Rust backend only
npm run backend:release   # Run Rust backend (optimized)
npm run frontend          # Run React frontend only
npm run build             # Build both for production
npm run build:backend     # Build Rust backend only
npm run build:frontend    # Build React frontend only
npm run install:all       # Install all dependencies
```

### Option 2: Separate terminals

**Terminal 1 - Backend:**
```bash
cd kks_online_backend
cargo run
```

**Terminal 2 - Frontend:**
```bash
cd react-frontend
npm run dev
```

### Option 3: Using PowerShell (Windows)
```powershell
# Start backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd kks_online_backend; cargo run"

# Start frontend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd react-frontend; npm run dev"
```

## Features Connected

The following features from the Express backend have been implemented in Rust and connected to the frontend:

### ✅ Products
- Product listing with filters (search, category, brand, price range, popularity)
- Popular products
- Product details with variants
- Search suggestions
- Category-based filtering
- Brand-based filtering

### ✅ Categories
- Category listing
- Category details

### ⚠️ Not Connected (Available but not used by frontend yet)
- Cart management
- Checkout
- AI-powered features

## API Response Format

The Rust backend uses the same response format as the Express backend for compatibility:

**Single Item Response:**
```json
{
  "success": true,
  "data": { /* item data */ }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Troubleshooting

### Backend Issues

**Database Connection Error:**
- Verify your `DATABASE_URL` is correct
- Ensure your PostgreSQL/Supabase database is accessible
- Check if the database schema is properly set up

**Port Already in Use:**
- Change the `PORT` in `.env` file
- Kill the process using port 3000: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`

**GEMINI_API_KEY Error:**
- If you're not using AI features, you can provide a dummy value or modify the config to make it optional
- The error occurs because the config requires this key by default

### Frontend Issues

**Cannot Connect to Backend:**
- Ensure the Rust backend is running on port 3000
- Check the `VITE_API_BASE_URL` in frontend `.env`
- Verify CORS is properly configured (already set to allow all origins in development)

**Products Not Loading:**
- Check browser console for errors
- Verify the backend API is responding: `curl http://localhost:3000/api/v1/products/popular`
- Check that products exist in your database

## Development Tips

1. **Hot Reload**: 
   - Frontend: Vite provides instant HMR
   - Backend: Use `cargo watch -x run` for auto-reload (install with `cargo install cargo-watch`)

2. **Debugging**:
   - Backend logs are printed to console
   - Frontend: Use browser DevTools
   - API testing: Use Postman or `curl`

3. **Database Changes**:
   - If you modify the database schema, restart the Rust backend
   - Ensure the Product and ProductVariation models match your schema

## Migration from Express

If you were previously using the Express backend (`kksonline-backend`), here are the key changes:

1. **Port**: Changed from 5000 to 3000
2. **API Prefix**: Same `/api/v1` prefix maintained for compatibility
3. **Response Format**: Maintained the same structure
4. **Features**: All frontend-facing product features implemented

## Next Steps

To extend the integration:

1. **Cart Integration**: Connect frontend cart to Rust cart endpoints
2. **Checkout**: Implement checkout flow in frontend
3. **Authentication**: Add user authentication (not yet implemented in either backend)
4. **Reviews**: Add reviews functionality
5. **Images**: Implement image management

## Support

For issues or questions:
- Check the backend logs in the terminal running `cargo run`
- Check frontend console in browser DevTools
- Verify database connectivity
- Ensure all environment variables are set correctly
