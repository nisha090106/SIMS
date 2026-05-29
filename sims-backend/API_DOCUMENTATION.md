# SIMS Backend API Documentation

## 📋 Base URL
```
http://localhost:5000/api
```

## 🔐 Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 🔑 Auth Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "department": "Sales"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user_id": 5,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "staff"
  }
}
```

---

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@sims.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": 1,
      "email": "admin@sims.com",
      "full_name": "Admin User",
      "role": "admin",
      "department": "Management"
    }
  }
}
```

---

### Get Profile
```http
GET /auth/profile
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "admin@sims.com",
    "full_name": "Admin User",
    "role": "admin",
    "department": "Management",
    "status": "active",
    "last_login": "2026-05-29T14:30:00Z",
    "created_at": "2026-01-01T08:00:00Z",
    "updated_at": "2026-05-29T14:30:00Z"
  }
}
```

---

### Refresh Access Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📦 Product Endpoints

### Get All Products
```http
GET /products
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "product_id": 1,
      "sku": "PROD-001",
      "name": "Laptop Computer",
      "description": "High performance laptop for office use",
      "category": "Electronics",
      "unit": "piece",
      "reorder_level": 5,
      "reorder_qty": 20,
      "unit_price": "899.99",
      "created_at": "2026-05-29T12:00:00Z",
      "updated_at": "2026-05-29T12:00:00Z"
    }
  ],
  "count": 8
}
```

---

### Get Product by ID
```http
GET /products/:id
```

---

### Create Product (Admin/Manager only)
```http
POST /products
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "sku": "PROD-009",
  "name": "New Product",
  "description": "Product description",
  "category": "Electronics",
  "unit": "piece",
  "reorder_level": 10,
  "reorder_qty": 50,
  "unit_price": 99.99
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "product_id": 9,
    "sku": "PROD-009",
    "name": "New Product",
    ...
  }
}
```

---

### Update Product (Admin/Manager only)
```http
PUT /products/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "unit_price": 129.99,
  "reorder_level": 15
}
```

---

### Delete Product (Admin/Manager only)
```http
DELETE /products/:id
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## 🏭 Warehouse Endpoints

### Get All Warehouses
```http
GET /warehouses
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "warehouse_id": 1,
      "name": "Main Warehouse",
      "location": "Building A",
      "address": "123 Industrial Street, City, Country",
      "capacity": "10000.00",
      "current_usage": "4500.00",
      "manager": {
        "user_id": 2,
        "full_name": "Manager User",
        "email": "manager@sims.com"
      },
      "created_at": "2026-05-29T12:00:00Z",
      "updated_at": "2026-05-29T12:00:00Z"
    }
  ],
  "count": 3
}
```

---

### Get Warehouse Capacity Usage
```http
GET /warehouses/:id/capacity
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "warehouse_id": 1,
    "name": "Main Warehouse",
    "capacity": 10000,
    "current_usage": 4500,
    "available_space": 5500,
    "usage_percentage": "45.00"
  }
}
```

---

### Create Warehouse (Admin/Manager only)
```http
POST /warehouses
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "New Warehouse",
  "location": "Building D",
  "address": "999 New Street, City, Country",
  "capacity": 5000,
  "manager_id": 2
}
```

---

### Update Warehouse (Admin/Manager only)
```http
PUT /warehouses/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "capacity": 7000,
  "current_usage": 3500
}
```

---

### Delete Warehouse (Admin only)
```http
DELETE /warehouses/:id
Authorization: Bearer <access_token>
```

---

## 📊 Inventory Endpoints

### Get All Inventory Items
```http
GET /inventory
Authorization: Bearer <access_token>

Query Parameters:
  - warehouseId: Filter by warehouse
  - productId: Filter by product
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "inventory_id": 1,
      "product_id": 1,
      "warehouse_id": 1,
      "quantity": 50,
      "batch_no": "BATCH-001-2026",
      "expiry_date": null,
      "location": "Rack A1",
      "product": {
        "product_id": 1,
        "sku": "PROD-001",
        "name": "Laptop Computer",
        "unit_price": "899.99",
        "reorder_level": 5
      },
      "warehouse": {
        "warehouse_id": 1,
        "name": "Main Warehouse",
        "location": "Building A"
      },
      "created_at": "2026-05-29T12:00:00Z",
      "updated_at": "2026-05-29T12:00:00Z"
    }
  ],
  "count": 8
}
```

---

### Get Inventory Item by ID
```http
GET /inventory/:id
Authorization: Bearer <access_token>
```

---

### Get Inventory Summary
```http
GET /inventory/summary/overview
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_items": 8,
    "unique_products": 8,
    "total_quantity": 1700,
    "total_value": "45678.50",
    "warehouses_used": 3
  }
}
```

---

### Get Low Stock Items
```http
GET /inventory/alerts/low-stock
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "inventory_id": 6,
      "product_id": 6,
      "sku": "PROD-006",
      "name": "Storage Cabinet",
      "reorder_level": 3,
      "reorder_qty": 15,
      "quantity": 2,
      "warehouse_name": "Regional Warehouse"
    }
  ],
  "count": 1
}
```

---

### Create Inventory Item (All authenticated users)
```http
POST /inventory
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "product_id": 1,
  "warehouse_id": 1,
  "quantity": 100,
  "batch_no": "BATCH-NEW-2026",
  "expiry_date": null,
  "location": "Rack A5"
}
```

---

### Update Inventory Item (All authenticated users)
```http
PUT /inventory/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "quantity": 75,
  "location": "Rack A6"
}
```

---

## 🧪 Test Credentials

```
Admin User:
Email: admin@sims.com
Password: password123
Role: admin

Manager User:
Email: manager@sims.com
Password: password123
Role: manager

Staff User:
Email: staff1@sims.com
Password: password123
Role: staff
```

---

## 📊 Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "error": "You do not have permission to access this resource"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

### 409 - Conflict (Duplicate)
```json
{
  "success": false,
  "error": "Duplicate Entry",
  "errors": [
    {
      "field": "sku",
      "message": "sku must be unique"
    }
  ]
}
```

### 500 - Server Error
```json
{
  "success": false,
  "error": "Internal Server Error"
}
```

---

## 📝 Role-Based Access Control

| Endpoint | Admin | Manager | Staff | Public |
|----------|-------|---------|-------|--------|
| POST /auth/register | ✅ | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ | ✅ |
| GET /auth/profile | ✅ | ✅ | ✅ | ❌ |
| GET /products | ✅ | ✅ | ✅ | ✅ |
| POST /products | ✅ | ✅ | ❌ | ❌ |
| PUT /products/:id | ✅ | ✅ | ❌ | ❌ |
| DELETE /products/:id | ✅ | ✅ | ❌ | ❌ |
| GET /warehouses | ✅ | ✅ | ✅ | ❌ |
| POST /warehouses | ✅ | ✅ | ❌ | ❌ |
| PUT /warehouses/:id | ✅ | ✅ | ❌ | ❌ |
| DELETE /warehouses/:id | ✅ | ❌ | ❌ | ❌ |
| GET /inventory | ✅ | ✅ | ✅ | ❌ |
| POST /inventory | ✅ | ✅ | ✅ | ❌ |
| PUT /inventory/:id | ✅ | ✅ | ✅ | ❌ |

---

## 🔍 Pagination

For endpoints that return lists, use query parameters:
```
?page=1&limit=10
```

Example:
```http
GET /products?page=1&limit=20
```

---

## 🛠 Development Commands

```bash
# Start server (development)
npm run dev

# Start server (production)
npm start

# Run database migrations
npx sequelize-cli db:migrate

# Run seeders
npx sequelize-cli db:seed:all

# Undo migrations
npx sequelize-cli db:migrate:undo:all

# Lint code
npm run lint

# Format code
npm run format
```

---

## 📚 Additional Resources

- [Sequelize Documentation](https://sequelize.org/)
- [Express Documentation](https://expressjs.com/)
- [JWT Documentation](https://jwt.io/)
- [MySQL Documentation](https://dev.mysql.com/)

