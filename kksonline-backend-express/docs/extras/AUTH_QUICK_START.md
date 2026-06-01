# Authentication Quick Start Guide

## Prerequisites

1. Node.js 18+ installed
2. Google OAuth Client ID (see setup instructions below)
3. PostgreSQL database (via Supabase)

## Setup Steps

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Add authorized origins:
   - `http://localhost:5173`
   - `http://localhost:3000`
6. Copy the **Client ID**

### 2. Backend Configuration

1. Navigate to backend directory:
```bash
cd kksonline-backend-express
```

2. Install dependencies (if not already done):
```bash
npm install
```

3. Create `.env` file (copy from env.example.txt):
```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=your_supabase_database_url

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Authentication
JWT_SECRET=your_secret_key_min_32_characters_long
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

4. Start backend server:
```bash
npm run dev
```

Backend should run on http://localhost:5000

### 3. Frontend Configuration

1. Navigate to frontend directory:
```bash
cd react-frontend
```

2. Install dependencies (if not already done):
```bash
npm install
```

3. Create `.env` file (copy from env.example.txt):
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

**IMPORTANT:** Use the **same** Google Client ID in both backend and frontend!

4. Start frontend server:
```bash
npm run dev
```

Frontend should run on http://localhost:5173

## Testing the Authentication

### Test Scenario 1: Browse Without Login
1. Open http://localhost:5173
2. Browse products ✅ Should work
3. View product details ✅ Should work

### Test Scenario 2: Protected Routes
1. Click "Cart" or "Wishlist" in header
2. ✅ Login modal should appear

### Test Scenario 3: Google Sign-In
1. Click "Sign in with Google"
2. Select your Google account
3. ✅ Modal closes, user name appears in header

### Test Scenario 4: Logout
1. Click on your name in header
2. Click "Logout"
3. ✅ User menu closes, "Login" button reappears

### Test Scenario 5: Session Expiration
The session expires after 45 minutes. Token is automatically removed from localStorage when expired.

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is correct
- Verify all environment variables are set
- Check if port 5000 is available

### Frontend won't start
- Check VITE_GOOGLE_CLIENT_ID is set
- Verify VITE_API_BASE_URL points to backend
- Check if port 5173 is available

### Google Sign-In button not showing
- Verify VITE_GOOGLE_CLIENT_ID is correct
- Check browser console for errors
- Ensure domain is authorized in Google Console

### "Invalid Google Client ID" error
- Ensure frontend and backend use the SAME Client ID
- Verify Client ID is added to authorized origins in Google Console
- Check for typos in .env files

### Login modal not appearing
- Check browser console for errors
- Verify AuthProvider wraps entire app
- Ensure ProtectedRoute is used on Cart/Checkout/Wishlist

### CORS errors
- Verify ALLOWED_ORIGINS includes frontend URL
- Check frontend .env has correct backend URL
- Restart backend after changing CORS settings

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ GoogleOAuth    │  │ AuthProvider │  │  LoginModal     │ │
│  │ Provider       │─→│  (Context)   │─→│  (Google Btn)   │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│           │                    │                    │         │
│           └────────────────────┼────────────────────┘         │
│                                │                              │
│                       ┌────────▼────────┐                    │
│                       │ Protected Routes│                     │
│                       │ Cart/Checkout   │                     │
│                       └─────────────────┘                    │
└───────────────────────────────┬──────────────────────────────┘
                                │
                         HTTP Request
                         (Bearer Token)
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                      Backend (Express)                        │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│  │ Auth Routes  │─→│  Auth Service  │─→│ Google Auth Lib │ │
│  │ /auth/google │  │  (Verify Token)│  │ (Verify ID)     │ │
│  └──────────────┘  └────────────────┘  └─────────────────┘ │
│          │                    │                              │
│          │         ┌──────────▼──────────┐                  │
│          │         │   JWT Utils         │                  │
│          │         │ (Generate/Verify    │                  │
│          │         │  45min expiry)      │                  │
│          │         └─────────────────────┘                  │
│          │                                                    │
│  ┌───────▼────────────────────────────────────────────────┐ │
│  │           Protected API Routes                         │ │
│  │  Cart / Orders / Wishlist / Checkout                  │ │
│  │  (Require auth middleware)                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Features Implemented

✅ Google OAuth authentication
✅ JWT session management (45 minutes)
✅ Automatic session expiration
✅ Login modal (appears on demand)
✅ Protected routes (Cart, Checkout, Wishlist)
✅ User menu with logout
✅ Protected actions (can be added to Add to Cart, etc.)
✅ Persistent authentication (survives page refresh)
✅ Clean UI/UX - no separate login page

## Next Steps

1. Test the complete flow
2. Add protected actions to "Add to Cart" buttons
3. Add protected actions to "Add to Wishlist" buttons
4. Implement cart count in header (from backend)
5. Implement wishlist count in header (from backend)
6. Add user profile picture display
7. Add session expiration notification (toast/alert)
8. Consider implementing refresh tokens for longer sessions

## Important Files

### Frontend
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/components/auth/LoginModal.tsx` - Login modal UI
- `src/components/auth/ProtectedRoute.tsx` - Route protection
- `src/hooks/useProtectedAction.ts` - Action protection hook
- `src/services/auth.service.ts` - Authentication API calls
- `src/services/api.config.ts` - API configuration with auth headers

### Backend
- `src/services/auth.service.ts` - Authentication logic
- `src/routes/auth.routes.ts` - Auth API endpoints
- `src/middleware/auth.middleware.ts` - JWT verification
- `src/utils/jwt.utils.ts` - JWT token management
- `src/config/env.config.ts` - Environment configuration

## Support

For detailed documentation, see:
- `docs/AUTHENTICATION_SETUP.md` - Complete authentication guide
- `docs/FRONTEND_BACKEND_SETUP.md` - General setup guide
