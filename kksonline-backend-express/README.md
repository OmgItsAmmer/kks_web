# KKS Online Backend API

A production-ready, centralized backend API for the KKS Online E-Commerce platform. This backend serves both the Flutter mobile app and React web application.

## 🚀 Features

### Authentication
- **Google OAuth 2.0** - Direct Google sign-in without Supabase Auth
- **JWT Token Management** - Secure access and refresh tokens
- **Session Management** - Automatic token refresh

### Product Management
- Product catalog with categories and brands
- Product variants with stock management
- Product search with suggestions
- Product reviews and ratings
- Image management via Cloudinary

### Shopping Cart
- Add/update/remove cart items
- Stock validation
- Shop-level quantity limits
- Cart-to-kiosk transfer

### Orders & Checkout
- Secure checkout with idempotency
- Multiple payment methods (COD, JazzCash, etc.)
- Inventory reservation system
- Order status tracking

### Customer Management
- Profile management
- Address management
- Wishlist
- Order history

### Admin Features
- Product CRUD operations
- Category & Brand management
- Order management
- Customer management
- Shop configuration
- App version management

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Image Storage**: Cloudinary
- **Authentication**: Google OAuth + JWT
- **Validation**: Zod
- **Caching**: Node-Cache

## 📁 Project Structure

```
src/
├── config/           # Configuration files
│   ├── env.config.ts       # Environment variables
│   ├── supabase.config.ts  # Supabase client
│   └── cloudinary.config.ts # Cloudinary setup
├── middleware/       # Express middleware
│   ├── auth.middleware.ts  # JWT authentication
│   ├── error.middleware.ts # Error handling
│   └── validation.middleware.ts # Request validation
├── repositories/     # Data access layer
│   ├── customer.repository.ts
│   ├── product.repository.ts
│   ├── cart.repository.ts
│   ├── order.repository.ts
│   └── ...
├── services/         # Business logic
│   ├── auth.service.ts
│   ├── checkout.service.ts
│   └── image.service.ts
├── routes/           # API routes
│   ├── auth.routes.ts
│   ├── product.routes.ts
│   ├── cart.routes.ts
│   ├── admin/index.ts
│   └── ...
├── types/            # TypeScript types
│   ├── database.types.ts
│   └── api.types.ts
├── utils/            # Utility functions
│   ├── logger.ts
│   ├── cache.ts
│   ├── errors.ts
│   └── response.ts
└── index.ts          # Application entry point
```

## 🔧 Installation

1. **Clone the repository**
   ```bash
   cd kksonline-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example env file
   cp env.example.txt .env
   
   # Edit .env with your actual values
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment (development/production) |
| `PORT` | Server port (default: 5000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/google` | Google OAuth sign-in |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/logout` | Logout |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | Search/list products |
| GET | `/api/v1/products/popular` | Get popular products |
| GET | `/api/v1/products/:id` | Get product details |
| GET | `/api/v1/products/:id/variants` | Get product variants |
| GET | `/api/v1/products/:id/reviews` | Get product reviews |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cart` | Get cart items |
| POST | `/api/v1/cart` | Add to cart |
| PUT | `/api/v1/cart/:cartId` | Update quantity |
| DELETE | `/api/v1/cart/:cartId` | Remove item |
| DELETE | `/api/v1/cart` | Clear cart |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/orders` | Get customer orders |
| GET | `/api/v1/orders/:id` | Get order details |
| POST | `/api/v1/orders/checkout` | Process checkout |
| POST | `/api/v1/orders/:id/cancel` | Cancel order |

### Addresses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/addresses` | Get addresses |
| POST | `/api/v1/addresses` | Create address |
| PUT | `/api/v1/addresses/:id` | Update address |
| DELETE | `/api/v1/addresses/:id` | Delete address |

### Wishlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/wishlist` | Get wishlist |
| POST | `/api/v1/wishlist` | Add to wishlist |
| DELETE | `/api/v1/wishlist/:productId` | Remove from wishlist |

### Categories & Brands
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories` | Get all categories |
| GET | `/api/v1/categories/featured` | Get featured categories |
| GET | `/api/v1/brands` | Get all brands |
| GET | `/api/v1/brands/featured` | Get featured brands |

### Shop
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/shop/config` | Get shop configuration |
| GET | `/api/v1/shop/app-version` | Get latest app version |
| POST | `/api/v1/shop/check-version` | Check for app updates |

### Admin (All require admin authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/products` | List all products |
| POST | `/api/v1/admin/products` | Create product |
| PUT | `/api/v1/admin/products/:id` | Update product |
| DELETE | `/api/v1/admin/products/:id` | Delete product |
| POST | `/api/v1/admin/variants` | Create variant |
| PUT | `/api/v1/admin/variants/:id` | Update variant |
| DELETE | `/api/v1/admin/variants/:id` | Delete variant |
| POST | `/api/v1/admin/categories` | Create category |
| PUT | `/api/v1/admin/categories/:id` | Update category |
| DELETE | `/api/v1/admin/categories/:id` | Delete category |
| GET | `/api/v1/admin/orders` | List all orders |
| PUT | `/api/v1/admin/orders/:id/status` | Update order status |
| GET | `/api/v1/admin/orders/statistics` | Get order statistics |
| GET | `/api/v1/admin/customers` | List customers |
| PUT | `/api/v1/admin/shop/config` | Update shop config |

## 🔒 Security Features

- **Helmet.js** - Secure HTTP headers
- **CORS** - Cross-origin request protection
- **Rate Limiting** - Prevent abuse
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Zod schema validation
- **SQL Injection Prevention** - Parameterized queries
- **Security Audit Logging** - Track security events

## 📊 Caching Strategy

- **30-minute TTL** for products, categories, brands
- **Cache invalidation** on updates
- **Cache-aside pattern** for data fetching

## 🧪 Scripts

```bash
# Development
npm run dev           # Start with hot reload

# Production
npm run build         # Build TypeScript
npm start             # Start production server

# Code Quality
npm run lint          # Run ESLint
npm run typecheck     # TypeScript type checking
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errorCode": "ERROR_CODE"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

