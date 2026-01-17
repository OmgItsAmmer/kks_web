# Vite Proxy Setup for Backend API

## Problem

When running the React frontend with Vite dev server (typically on `http://localhost:5173`) and trying to connect to the Rust backend (`http://localhost:3000`), cross-origin requests were failing even though CORS was enabled on the backend.

## Solution

Configure Vite to proxy API requests to the backend server. This eliminates CORS issues in development.

## Configuration

### 1. Vite Config (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

**How it works:**
- Frontend runs on `http://localhost:5173`
- Any request to `/api/*` is forwarded to `http://localhost:3000/api/*`
- The browser sees it as same-origin (no CORS issues)
- Proxy includes logging for debugging

### 2. API Config (`src/services/api.config.ts`)

```typescript
// In development: Uses relative URL (Vite proxy handles it)
// In production: Set VITE_API_BASE_URL environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
```

**Development mode:**
- `API_BASE_URL = ''` (empty string)
- URLs become: `/api/v1/products`
- Vite proxy forwards to: `http://localhost:3000/api/v1/products`

**Production mode:**
- Set `VITE_API_BASE_URL=https://api.yoursite.com`
- URLs become: `https://api.yoursite.com/api/v1/products`
- Direct requests to production server

## Usage

### Starting the Development Environment

1. **Start the Rust Backend** (Terminal 1):
   ```bash
   cd kks_online_backend
   cargo run
   ```
   Server runs on `http://localhost:3000`

2. **Start the React Frontend** (Terminal 2):
   ```bash
   cd react-frontend
   npm run dev
   ```
   Dev server runs on `http://localhost:5173`

3. **Open Browser**:
   Navigate to `http://localhost:5173`

### Verifying the Setup

Check the browser console (F12) for logs:

```
[API Config] Initializing API configuration
[API Config] Using API_BASE_URL: 
[API Config] Full BASE_URL will be: /api/v1
[API Config] Mode: development
```

When fetching products:
```
[ProductService] Fetching popular products
[ProductService] Full URL: /api/v1/products/popular?page=1&pageSize=8
```

Check the Vite terminal for proxy logs:
```
Sending Request to the Target: GET /api/v1/products/popular?page=1&pageSize=8
Received Response from the Target: 200 /api/v1/products/popular?page=1&pageSize=8
```

## Troubleshooting

### Issue: "Failed to fetch" or Network Error

**Cause**: Backend is not running

**Solution**:
```bash
cd kks_online_backend
cargo run
```

### Issue: Proxy not forwarding requests

**Cause**: Vite dev server not restarted after config change

**Solution**:
1. Stop Vite dev server (Ctrl+C)
2. Restart: `npm run dev`

### Issue: 404 Not Found

**Check**:
1. Backend is running on port 3000
2. Backend routes are registered correctly
3. URL in browser console matches backend routes

**Test with curl**:
```bash
# Test backend directly
curl http://localhost:3000/api/v1/products/popular?page=1&pageSize=8
```

### Issue: CORS errors in production

**Cause**: Production build doesn't use proxy

**Solution**: Set environment variable:
```bash
# .env.production
VITE_API_BASE_URL=https://your-backend-api.com
```

### Issue: Empty response or timeout

**Check**:
1. Database connection in backend
2. Backend logs for errors
3. Network tab in browser dev tools

## Production Deployment

### Option 1: Separate Deployments

**Frontend** (e.g., Vercel, Netlify):
```bash
# Set environment variable
VITE_API_BASE_URL=https://api.yoursite.com

# Build
npm run build
```

**Backend** (e.g., dedicated server):
```bash
cargo build --release
./target/release/kks_online_backend
```

### Option 2: Same Server

If serving frontend and backend from same server:
```bash
# .env.production
VITE_API_BASE_URL=
```

Configure your server (nginx, etc.) to:
- Serve static files from `/` (React build)
- Proxy `/api/*` to backend

Example nginx config:
```nginx
server {
    listen 80;
    
    # Serve React app
    location / {
        root /var/www/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Key Points

1. **Development**: Vite proxy handles `/api` → `http://localhost:3000`
2. **Production**: Set `VITE_API_BASE_URL` to your actual API URL
3. **No CORS issues in dev**: Proxy makes it same-origin
4. **Debugging**: Check browser console and Vite terminal logs
5. **Both servers must run**: Backend (3000) + Frontend (5173)

## Related Files

- `vite.config.ts` - Proxy configuration
- `src/services/api.config.ts` - API base URL configuration
- `src/services/product.service.ts` - API service with logging
- Backend: `kks_online_backend/src/routes/products.rs` - API routes

## Testing

### Test Backend Directly (Postman or curl)
```bash
# Popular products
curl http://localhost:3000/api/v1/products/popular?page=1&pageSize=8

# Filtered products
curl "http://localhost:3000/api/v1/products?isPopular=true&page=1&pageSize=20"

# Product by ID
curl http://localhost:3000/api/v1/products/1
```

### Test Through Frontend
1. Open `http://localhost:5173`
2. Open browser console (F12)
3. Check logs for successful requests
4. Network tab should show 200 OK responses

## Additional Notes

- Vite proxy only works in development mode (`npm run dev`)
- Production builds need proper environment variables
- Backend CORS is still configured (for direct API access)
- Proxy includes error logging for debugging
