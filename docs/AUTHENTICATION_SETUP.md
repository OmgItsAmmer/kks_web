# Authentication Setup Guide

This guide explains how to set up and use Google OAuth authentication with JWT session management in the KKS Online application.

## Overview

The application uses:
- **Google OAuth 2.0** for user authentication (Sign in with Google)
- **JWT tokens** with 45-minute session duration
- **Automatic session expiration** with proper cleanup
- **Protected routes** that require authentication (Cart, Checkout, Wishlist)
- **Login modal** that appears when users try to access protected features

## Backend Setup

### 1. Install Dependencies

The backend already has these packages installed:
```bash
npm install google-auth-library jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### 2. Configure Environment Variables

Create a `.env` file in `kksonline-backend-express/` directory:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com

# JWT Secret (use a strong random string)
JWT_SECRET=your_jwt_secret_here_min_32_characters_long

# Other required variables...
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

### 3. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. For **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (development)
   - Your production domain
7. For **Authorized redirect URIs**, add:
   - `http://localhost:5173` (development)
   - Your production domain
8. Copy the **Client ID**

### 4. Backend Authentication Flow

The backend handles:
- Verifying Google ID tokens
- Creating or updating user records
- Generating JWT tokens (45-minute expiration)
- Protecting routes with authentication middleware

**Key Files:**
- `src/services/auth.service.ts` - Authentication logic
- `src/routes/auth.routes.ts` - Auth endpoints
- `src/middleware/auth.middleware.ts` - JWT verification
- `src/utils/jwt.utils.ts` - JWT generation/validation

**API Endpoints:**
- `POST /api/v1/auth/google` - Authenticate with Google
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/logout` - Logout user

## Frontend Setup

### 1. Install Dependencies

The frontend already has these packages installed:
```bash
npm install @react-oauth/google
```

### 2. Configure Environment Variables

Create a `.env` file in `react-frontend/` directory:

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5000

# Google OAuth Client ID (same as backend)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

### 3. Frontend Architecture

#### AuthContext (`src/contexts/AuthContext.tsx`)
- Manages authentication state globally
- Handles login/logout operations
- Manages session timeout
- Controls login modal visibility

#### LoginModal (`src/components/auth/LoginModal.tsx`)
- Modal dialog with Google Sign-In button
- Appears when users access protected features
- Handles authentication errors

#### ProtectedRoute (`src/components/auth/ProtectedRoute.tsx`)
- Wrapper component for protected pages
- Shows login modal if user is not authenticated
- Allows browsing but requires login for actions

#### useProtectedAction Hook (`src/hooks/useProtectedAction.ts`)
- Protects individual actions (Add to Cart, Add to Wishlist)
- Shows login modal if user tries protected action without authentication

### 4. Usage Examples

#### Protecting Pages

```tsx
import ProtectedRoute from './components/auth/ProtectedRoute';

<Route 
  path="/cart" 
  element={
    <ProtectedRoute>
      <Cart />
    </ProtectedRoute>
  } 
/>
```

#### Protecting Actions

```tsx
import { useProtectedAction } from '../hooks/useProtectedAction';

function ProductCard({ product }) {
  const { protectedAction } = useProtectedAction();

  const handleAddToCart = protectedAction(() => {
    // This code only runs if user is authenticated
    addToCart(product.id);
  });

  return (
    <button onClick={handleAddToCart}>
      Add to Cart
    </button>
  );
}
```

#### Using Auth Context

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout, showLoginModal } = useAuth();

  if (isAuthenticated) {
    return <div>Welcome, {user.firstName}!</div>;
  }

  return <button onClick={showLoginModal}>Login</button>;
}
```

## Session Management

### JWT Token Expiration
- Tokens expire after **45 minutes**
- Tokens are stored in `localStorage`
- Frontend automatically clears expired tokens

### Session Timeout Handling
- AuthContext sets up a timer when user logs in
- Timer automatically logs out user when token expires
- User is notified via console (can be enhanced with UI notification)

### Token Refresh
- Currently, users must re-login after 45 minutes
- Token refresh can be implemented in the future if needed

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use HTTPS in production** for all API calls
3. **Validate tokens on every protected API call**
4. **Keep JWT secrets secure** and rotate them periodically
5. **Set appropriate CORS policies** in backend
6. **Sanitize user inputs** before storing in database
7. **Use secure cookie flags** if implementing cookie-based auth

## Testing the Authentication Flow

### 1. Start Backend
```bash
cd kksonline-backend-express
npm run dev
```

### 2. Start Frontend
```bash
cd react-frontend
npm run dev
```

### 3. Test Scenarios

**Scenario 1: Browse without login**
- Open http://localhost:5173
- Browse products
- View product details
- ✅ Should work without authentication

**Scenario 2: Protected page access**
- Click on "Cart" or "Wishlist" in header
- ✅ Login modal should appear

**Scenario 3: Google Sign-In**
- Click "Sign in with Google" button
- Complete Google authentication
- ✅ Should redirect back and close modal
- ✅ Header should show user name

**Scenario 4: Protected actions**
- While logged in, add item to cart
- ✅ Should work normally
- Logout
- Try to add item to cart
- ✅ Login modal should appear

**Scenario 5: Session expiration**
- Login successfully
- Wait 45 minutes (or modify JWT expiration for testing)
- Try to access protected resource
- ✅ Should prompt for re-login

## Troubleshooting

### "Invalid Google Client ID"
- Verify VITE_GOOGLE_CLIENT_ID matches GOOGLE_CLIENT_ID in backend
- Check that domain is added to authorized origins in Google Console

### "Network Error"
- Ensure backend is running on correct port
- Check VITE_API_BASE_URL in frontend .env
- Verify CORS settings in backend

### "Token Expired"
- Normal behavior after 45 minutes
- User should re-login

### "Google Sign-In button not showing"
- Check browser console for errors
- Verify @react-oauth/google is installed
- Ensure GoogleOAuthProvider wraps the app

### Login modal not appearing
- Check that AuthProvider wraps the entire app
- Verify ProtectedRoute is used correctly
- Check browser console for errors

## Future Enhancements

- [ ] Implement refresh token functionality
- [ ] Add "Remember Me" option for longer sessions
- [ ] Social login with Facebook, Apple, etc.
- [ ] Email/password authentication option
- [ ] Two-factor authentication (2FA)
- [ ] User profile picture upload
- [ ] Activity logging and session management
- [ ] Admin panel for user management

## API Reference

### POST /api/v1/auth/google
Authenticate with Google ID token

**Request:**
```json
{
  "idToken": "google_id_token_here",
  "fcmToken": "optional_fcm_token_for_notifications"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": "https://..."
    }
  },
  "message": "Authentication successful"
}
```

### GET /api/v1/auth/me
Get current user information

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "customerId": 1,
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": null,
    "gender": null,
    "dob": null,
    "profilePicture": null
  }
}
```

### POST /api/v1/auth/logout
Logout user (client-side token clearing is primary method)

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

## Contributing

When adding new protected features:
1. Use `authenticate` middleware on backend routes
2. Use `ProtectedRoute` for protected pages
3. Use `useProtectedAction` hook for protected actions
4. Always handle authentication errors gracefully
5. Provide clear feedback to users about authentication requirements
