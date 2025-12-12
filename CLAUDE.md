# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an e-commerce backend API for an Allbirds-style shopping platform, built with Node.js, Express, and MySQL. The API supports product browsing, user authentication, shopping cart management, reviews, and checkout functionality.

## Development Commands

### Running the Server
```bash
cd back
node server.js
```
Server runs on `http://localhost:3000` by default.

### Database Setup
1. Create the database:
```bash
mysql -u root -p
CREATE DATABASE allbirds;
```

2. Run table creation scripts (if available):
```bash
mysql -u root -p allbirds < create_tables.sql
```

3. Insert sample data:
```bash
mysql -u root -p allbirds < sample_data.sql
```

### Environment Configuration
Create/update `.env` file in the root directory:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=allbirds
DB_PORT=3306
JWT_SECRET=your_super_secret_key_for_jwt_signing
```

## Architecture

### Dependency Injection Pattern
This codebase uses a dependency injection pattern where route modules export factory functions that receive dependencies (pool, middleware, etc.) from the main server file.

**Pattern:**
```javascript
// In route file (e.g., product/product.js)
module.exports = ({ pool, authMiddleware, adminAuth }) => {
    const router = express.Router();
    // ... routes
    return router;
};

// In back/server.js
const productRoutes = require('../product/product')({ pool, authMiddleware, adminAuth });
app.use('/api', productRoutes);
```

### Directory Structure
- `back/server.js` - Main server entry point, middleware setup, route registration
- `middleware/` - Authentication and authorization middleware
  - `auth.js` - JWT token validation (factory function taking JWT_SECRET)
  - `adminAuth.js` - Admin role verification (requires authMiddleware to run first)
- `product/` - Product-related routes (listing, detail, admin operations)
- `user/` - User authentication routes (currently dev login only)
- `cart/` - Shopping cart CRUD operations
- `review/` - Product review functionality
- `checkout/` - Order processing with transaction handling
- `public/images/` - Static image serving

### Database Connection
Uses MySQL connection pooling (`mysql2/promise` API):
```javascript
const pool = mysql.createPool({...}).promise();
```

All route files receive the `pool` instance via dependency injection and use async/await for queries.

### Authentication Flow

1. **JWT Token Generation**: User logs in via `/user/dev/login` (dev mode)
   - Request body: `{ "role": "user" | "admin" }`
   - Returns JWT token with 1-hour expiry
   - Token payload: `{ userId, email, role }`

2. **Token Validation**: `authMiddleware` extracts and verifies JWT from Authorization header
   - Header format: `Authorization: Bearer <token>`
   - Decoded user info attached to `req.user`

3. **Role Authorization**: `adminAuth` checks if `req.user.role === 'admin'`
   - Must run after `authMiddleware`
   - Returns 403 if non-admin attempts admin routes

### API Route Patterns

**Product Routes** (`/api` prefix):
- `GET /api/products/popular-list` - All products with variants and options (public)
- `GET /api/products/:productId` - Product detail with reviews (public)
- `POST /api/products` - Add product (admin only)

**Cart Routes** (`/api` prefix):
- `GET /api/cart` - User's cart items (authenticated)
- `POST /api/cart/add` - Add/update cart item (authenticated)
- `PUT /api/cart/update` - Update quantity (authenticated)
- `DELETE /api/cart/remove/:cartId` - Remove cart item (authenticated)

**Review Routes** (`/api` prefix):
- `GET /api/reviews?productId={id}` - Get product reviews (public)
- `POST /api/reviews` - Create review (authenticated, one per user per product)

**Checkout Routes** (`/api` prefix):
- `POST /api/checkout` - Process order with transaction (authenticated)

### Database Schema Key Points

**Product Hierarchy**:
- `products` (base product info)
  - `product_variants` (color variations)
    - `product_options` (size/stock for each color)

**Cart & Orders**:
- `cart` references `product_options.option_id`
- `orders` → `order_items` (one-to-many)
- `order_items` references `product_options.option_id`

**Key Fields**:
- Products use `base_price` (DECIMAL)
- Variants have `discount_rate` (INT, percentage) and `representative_image_url`
- Options track `stock_quantity`
- Orders use transaction isolation for stock deduction

### Product Query Pattern
Products are queried with nested JSON aggregation for variants and options:
```sql
SELECT
    p.product_id AS groupId,
    p.name AS groupName,
    (SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'variantId', pv.variant_id,
            'colorName', pv.color_name,
            'options', (SELECT JSON_ARRAYAGG(...) FROM product_options)
        )
    ) FROM product_variants WHERE pv.product_id = p.product_id) AS variants
FROM products p;
```

### Image Management
- Static images served from `public/images/` via Express static middleware
- Sample data uses Unsplash external URLs
- Local images should be placed in `public/images/products/`
- Accessible at `http://localhost:3000/images/products/filename.jpg`
- See `README_IMAGES.md` for detailed image setup instructions

### Transaction Handling (Checkout)
Checkout uses MySQL transactions for atomic operations:
1. Get connection from pool
2. `BEGIN TRANSACTION`
3. Verify cart items and stock
4. Create order and order_items
5. Deduct stock from product_options
6. Delete cart items
7. `COMMIT` or `ROLLBACK` on error
8. Always release connection in `finally` block

### CORS Configuration
Frontend runs on port 5173, CORS configured in server.js:
```javascript
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
```

## Important Notes

- The `authMiddleware` and `adminAuth` must be passed to routes requiring authentication
- `adminAuth` MUST be used after `authMiddleware` (never alone)
- Always validate user ownership for cart/review operations (check `user_id` matches `req.user.userId`)
- Use parameterized queries to prevent SQL injection
- Stock validation happens before any mutation in cart/checkout operations
- The server requires `dotenv` loaded first in `back/server.js`
- All route files use `module.exports = (dependencies) => router` pattern
