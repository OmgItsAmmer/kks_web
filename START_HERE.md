# 🚀 START HERE - Authentication Setup

## ⚡ Quick Start (5 Minutes)

### Step 1: Get Google OAuth Credentials (2 minutes)
1. Go to https://console.cloud.google.com/
2. Create project or select existing
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Add **Authorized JavaScript origins**: `http://localhost:5173`
5. Copy the **Client ID**

### Step 2: Configure Backend (1 minute)
1. Create `kksonline-backend-express/.env`:
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
JWT_SECRET=9fA3KxR8mQ7ZVt2WcEJH6BPyNdU4L5s0aFhM1oCgkYbIerXqSOuTnDp
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Step 3: Configure Frontend (30 seconds)
1. Create `react-frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```
**⚠️ IMPORTANT:** Use the SAME Google Client ID in both files!

### Step 4: Start Both Servers (1 minute)

**Terminal 1 - Backend:**
```bash
cd kksonline-backend-express
npm install
npm run dev
```
Wait for: `✓ Server running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd react-frontend
npm install
npm run dev
```
Wait for: `➜ Local: http://localhost:5173/`

### Step 5: Test It! (30 seconds)
1. Open http://localhost:5173
2. Click "Cart" or "Wishlist" in header
3. ✅ Login modal should appear!
4. Click "Sign in with Google"
5. ✅ Select Google account
6. ✅ Your name appears in header!

## ✅ What's Implemented

### Backend
- [x] Google OAuth verification
- [x] JWT token generation (45-minute expiration)
- [x] Authentication middleware
- [x] Protected API endpoints
- [x] User creation/linking

### Frontend
- [x] Google Sign-In button
- [x] Login modal (appears on demand)
- [x] Authentication context
- [x] Protected routes (Cart, Checkout, Wishlist)
- [x] User display in header
- [x] Logout functionality
- [x] Session timeout handling

### User Experience
- [x] Browse without login ✨
- [x] Login only when needed (cart/wishlist/checkout)
- [x] Modal-based (no separate login page) ✨
- [x] One-click Google authentication
- [x] Persistent sessions (survives page refresh)
- [x] Automatic logout after 45 minutes

## 🎯 Test Scenarios

### ✓ Scenario 1: Browse Without Login
```
1. Open http://localhost:5173
2. Browse products
3. View product details
✅ Should work without login
```

### ✓ Scenario 2: Protected Routes
```
1. Click "Cart" in header
2. Or click "Wishlist" in header
✅ Login modal appears
```

### ✓ Scenario 3: Google Sign-In
```
1. Click "Sign in with Google"
2. Select Google account
✅ Modal closes
✅ Your name appears in header (top right)
```

### ✓ Scenario 4: Logout
```
1. Click your name in header
2. Click "Logout" in dropdown
✅ Back to "Login" button
```

## 📚 Documentation

- **Quick Reference**: `docs/AUTH_QUICK_START.md`
- **Complete Guide**: `docs/AUTHENTICATION_SETUP.md`
- **Implementation Summary**: `AUTHENTICATION_IMPLEMENTATION_SUMMARY.md`

## 🐛 Troubleshooting

### "Google Sign-In button not showing"
- Check: VITE_GOOGLE_CLIENT_ID is set in frontend .env
- Check: Browser console for errors
- Fix: Verify Client ID is correct

### "Invalid Google Client ID"
- Check: Same Client ID in BOTH backend and frontend .env
- Check: Domain authorized in Google Console
- Fix: Copy Client ID exactly from Google Console

### "Network Error" or CORS error
- Check: Backend is running (http://localhost:5000)
- Check: ALLOWED_ORIGINS includes frontend URL
- Fix: Restart backend after changing .env

### Backend won't start
- Check: All environment variables in .env
- Check: DATABASE_URL is valid
- Fix: Copy from env.example.txt and fill in values

### Login modal not appearing
- Check: Browser console for errors
- Check: Frontend is running on port 5173
- Fix: Clear browser cache and reload

## 🎨 Key Features

### User Can Browse WITHOUT Login
Users can explore the entire website, view products, read descriptions - **no login required**!

### Smart Login Prompts
Login modal **only appears** when user tries to:
- Access cart
- Access wishlist
- Proceed to checkout

### Modern UX
- ✨ No separate login page
- ✨ Clean modal design
- ✨ One-click Google authentication
- ✨ Persistent sessions
- ✨ Automatic session cleanup

## 📁 Files Structure

```
kks_web/
├── kksonline-backend-express/
│   ├── .env                           ← CREATE THIS (Step 2)
│   ├── env.example.txt                ← Template
│   └── src/
│       ├── services/auth.service.ts   ← Auth logic
│       ├── routes/auth.routes.ts      ← API endpoints
│       ├── middleware/auth.middleware.ts
│       └── utils/jwt.utils.ts         ← JWT handling (45min)
│
├── react-frontend/
│   ├── .env                           ← CREATE THIS (Step 3)
│   ├── env.example.txt                ← Template
│   └── src/
│       ├── contexts/AuthContext.tsx   ← Auth state
│       ├── components/auth/
│       │   ├── LoginModal.tsx         ← Login UI
│       │   └── ProtectedRoute.tsx     ← Route protection
│       ├── hooks/useProtectedAction.ts
│       └── services/auth.service.ts   ← API calls
│
└── docs/
    ├── AUTH_QUICK_START.md            ← Quick guide
    └── AUTHENTICATION_SETUP.md        ← Complete guide
```

## 🔐 Security

- ✅ JWT tokens (45-minute expiration)
- ✅ Secure token storage (localStorage)
- ✅ Google OAuth (no password handling)
- ✅ Automatic session cleanup
- ✅ Protected API endpoints
- ✅ CORS protection

## 🎁 Bonus Features Ready to Add

Using the `useProtectedAction` hook, you can easily protect any action:

```tsx
import { useProtectedAction } from '../hooks/useProtectedAction';

function ProductCard() {
  const { protectedAction } = useProtectedAction();

  const handleAddToCart = protectedAction(() => {
    // This code only runs if user is authenticated
    addToCart(productId);
  });

  return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

This will show the login modal if user is not authenticated!

## ⏱️ Session Duration

- Session lasts: **45 minutes**
- Token stored in: **localStorage**
- Auto-logout: **Yes** (after 45 minutes)
- Re-login: **Required** after expiration

## 🆘 Need Help?

1. **Check documentation**: `docs/AUTH_QUICK_START.md`
2. **Check browser console**: Look for error messages
3. **Check environment variables**: Verify .env files
4. **Check backend logs**: Look at terminal output
5. **Restart both servers**: Sometimes helps with env changes

## 🎊 You're Done!

If you completed all 5 steps above, your authentication system is ready to use!

**Test it now:**
1. Open http://localhost:5173
2. Click "Cart" → Login modal appears
3. Sign in with Google → Your name appears
4. Perfect! 🎉

---

**Questions? Issues?**
Check the detailed documentation in `docs/` folder.

**Everything working?**
Start building protected features using the authentication system!
