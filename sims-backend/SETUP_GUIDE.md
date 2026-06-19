# SIMS Backend - Complete Setup & Structure Guide

## 📁 Project Structure

```
sims-backend/
├── src/
│   ├── config/
│   │   ├── database.js           # Sequelize database configuration
│   │   └── logger.js             # Winston logger setup
│   ├── models/
│   │   ├── User.js               # User model with password hashing
│   │   ├── Warehouse.js          # Warehouse model
│   │   ├── Product.js            # Product model
│   │   ├── Inventory.js          # Inventory model
│   │   ├── Supplier.js           # Supplier model
│   │   ├── PurchaseOrder.js      # Purchase Order model
│   │   ├── SalesOrder.js         # Sales Order model
│   │   ├── AuditLog.js           # Audit logging model
│   │   └── index.js              # Model initialization & associations
│   ├── routes/
│   │   ├── authRoutes.js         # Authentication endpoints
│   │   ├── productRoutes.js      # Product CRUD endpoints
│   │   ├── warehouseRoutes.js    # Warehouse CRUD endpoints
│   │   └── inventoryRoutes.js    # Inventory management endpoints
│   ├── controllers/
│   │   ├── authController.js     # Auth logic
│   │   ├── productController.js  # Product logic
│   │   ├── warehouseController.js# Warehouse logic
│   │   └── inventoryController.js# Inventory logic
│   ├── services/
│   │   ├── authService.js        # JWT & authentication logic
│   │   └── auditService.js       # Audit logging service
│   ├── middlewares/
│   │   ├── authMiddleware.js     # JWT verification & role-based access
│   │   ├── errorHandler.js       # Global error handling
│   │   └── loggingMiddleware.js  # Request/response logging
│   ├── validators/
│   │   └── schemas.js            # Input validation schemas
│   ├── utils/
│   │   └── helpers.js            # Utility functions
│   ├── uploads/                  # File upload directory
│   └── server.js                 # Express app initialization
├── migrations/
│   ├── 001-create-users.js
│   ├── 002-create-warehouses.js
│   ├── 003-create-products.js
│   ├── 004-create-inventory.js
│   ├── 005-create-suppliers.js
│   ├── 006-create-purchase-orders.js
│   ├── 007-create-sales-orders.js
│   └── 008-create-audit-logs.js
├── seeders/
│   ├── 001-seed-users.js
│   ├── 002-seed-warehouses.js
│   ├── 003-seed-products.js
│   ├── 004-seed-inventory.js
│   └── 005-seed-suppliers.js
├── .sequelizerc               # Sequelize CLI configuration
├── .env                       # Environment variables
├── .env.example              # Example env file
├── package.json              # Dependencies & scripts
└── README.md                 # Backend documentation
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd sims-backend
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sims_db
DB_USER=sims_user
DB_PASSWORD=sims_password_123
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
```

### 3. Start MySQL Database
From the project root:
```bash
docker-compose up -d
```

Verify database is running:
```bash
docker ps
# Look for sims-mysql container
```

### 4. Run Database Migrations
```bash
npx sequelize-cli db:migrate
```

### 5. Run Database Seeders
```bash
npx sequelize-cli db:seed:all
```

### 6. Start the Server
```bash
npm run dev
```

You should see:
```
✅ Server running at http://localhost:5000
🏥 Health check at http://localhost:5000/health
🔐 Auth endpoints at http://localhost:5000/api/auth
```

## 📊 Database Models & Relationships

### User
- **Fields**: user_id, email, password, first_name, last_name, role, department, status, last_login
- **Relationships**: 
  - ➡️ Has many Warehouses (as manager)
  - ➡️ Has many PurchaseOrders (as creator)
  - ➡️ Has many SalesOrders (as creator)
  - ➡️ Has many AuditLogs

### Warehouse
- **Fields**: warehouse_id, name, location, address, capacity, current_usage, manager_id
- **Relationships**:
  - ⬅️ Belongs to User (manager)
  - ➡️ Has many Inventory items

### Product
- **Fields**: product_id, sku, name, description, category, unit, reorder_level, reorder_qty, unit_price
- **Relationships**:
  - ➡️ Has many Inventory items

### Inventory
- **Fields**: inventory_id, product_id, warehouse_id, quantity, batch_no, expiry_date, location
- **Relationships**:
  - ⬅️ Belongs to Product
  - ⬅️ Belongs to Warehouse

### Supplier
- **Fields**: supplier_id, name, contact_person, email, phone, address, payment_terms, lead_time, rating, status
- **Relationships**:
  - ➡️ Has many PurchaseOrders

### PurchaseOrder
- **Fields**: po_id, po_number, supplier_id, order_date, expected_delivery, status, total_amount, created_by
- **Relationships**:
  - ⬅️ Belongs to Supplier
  - ⬅️ Belongs to User (creator)

### SalesOrder
- **Fields**: order_id, order_number, customer_name, order_date, delivery_date, status, total_amount, created_by
- **Relationships**:
  - ⬅️ Belongs to User (creator)

### AuditLog
- **Fields**: log_id, user_id, action, table_name, changes (JSON), timestamp, ip_address
- **Relationships**:
  - ⬅️ Belongs to User

## 🔐 Authentication Flow

1. **Register**
   - POST /api/auth/register
   - User created with hashed password
   - Default role: 'staff'

2. **Login**
   - POST /api/auth/login
   - Email & password verified
   - JWT access token generated (7 days expiry)
   - Refresh token generated (30 days expiry)
   - Last login timestamp updated

3. **Protected Routes**
   - Include JWT in Authorization header: `Bearer <token>`
   - Token verified in authMiddleware
   - User info attached to req.user

4. **Token Refresh**
   - POST /api/auth/refresh-token
   - Send refresh token to get new access token

## 🛡️ Security Features

- ✅ Password hashing with bcryptjs
- ✅ JWT token-based authentication
- ✅ Role-based access control (RBAC)
- ✅ CORS protection
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Request logging with Winston
- ✅ Audit logging for all operations
- ✅ Error handling with proper HTTP status codes

## 📝 User Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full access to all endpoints and operations |
| **manager** | Can create/update warehouses, products, view inventory |
| **staff** | Can update inventory quantities, view data |

## 🧪 Test Credentials

```
Admin:
  Email: admin@sims.com
  Password: password123
  Role: admin

Manager:
  Email: manager@sims.com
  Password: password123
  Role: manager

Staff:
  Email: staff1@sims.com
  Password: password123
  Role: staff
```

## 📊 API Overview

| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| **Auth** | Register, Login, Refresh Token, Logout, Profile | Mixed |
| **Products** | List, Get, Create, Update, Delete | Some |
| **Warehouses** | List, Get, Create, Update, Delete, Capacity | Yes |
| **Inventory** | List, Get, Create, Update, Summary, Low Stock | Yes |

## 🔍 Middleware Stack

1. **Body Parser** - Parse JSON requests
2. **Request Logger** - Log incoming requests
3. **Response Time** - Track request duration
4. **CORS** - Handle cross-origin requests
5. **Rate Limiter** - Prevent abuse
6. **Auth (conditional)** - Verify JWT
7. **Error Handler** - Handle errors globally

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check if MySQL is running
docker ps

# Check database credentials in .env
cat .env

# Test connection
mysql -h localhost -u sims_user -p
```

### Migration Failed
```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Undo last migration
npx sequelize-cli db:migrate:undo

# Redo migrations
npx sequelize-cli db:migrate:undo:all
npx sequelize-cli db:migrate
```

### Port Already in Use
```bash
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

### Clear Database & Start Fresh
```bash
# Reset database
docker-compose down
docker volume rm sims_mysql_data
docker-compose up -d

# Run migrations & seeders
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

## 📚 Development Workflow

### Add New Endpoint

1. **Create Model** (if needed)
   ```javascript
   // src/models/NewModel.js
   export default (sequelize) => {
     return sequelize.define('NewModel', {...});
   };
   ```

2. **Create Controller**
   ```javascript
   // src/controllers/newController.js
   export class NewController {
     static async getAll(req, res) {...}
   }
   ```

3. **Create Routes**
   ```javascript
   // src/routes/newRoutes.js
   router.get('/', authMiddleware, asyncHandler(NewController.getAll));
   ```

4. **Register in server.js**
   ```javascript
   import newRoutes from './routes/newRoutes.js';
   app.use('/api/new', newRoutes);
   ```

5. **Add Validation** (if needed)
   ```javascript
   // src/validators/schemas.js
   export const newValidators = {
     create: Joi.object({...})
   };
   ```

## 🔗 Useful Commands

```bash
# Development
npm run dev           # Start with hot reload

# Production
npm start            # Start server

# Database
npx sequelize-cli db:migrate              # Run migrations
npx sequelize-cli db:seed:all             # Run seeders
npx sequelize-cli db:migrate:undo         # Undo last migration
npx sequelize-cli db:seed:undo:all        # Undo all seeders

# Code Quality
npm run lint         # ESLint
npm run format       # Prettier formatting
npm test            # Run tests

# Logs
tail -f logs/combined.log    # Watch all logs
tail -f logs/error.log       # Watch error logs
```

## 📖 Additional Resources

- [Sequelize Documentation](https://sequelize.org/)
- [Express.js Guide](https://expressjs.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [Winston Logger](https://github.com/winstonjs/winston)

## ✅ Checklist for Production

- [ ] Change JWT_SECRET in .env
- [ ] Set NODE_ENV=production
- [ ] Use production database credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up monitoring & alerting
- [ ] Configure automated backups
- [ ] Review security headers
- [ ] Load test the application
- [ ] Document deployment process
