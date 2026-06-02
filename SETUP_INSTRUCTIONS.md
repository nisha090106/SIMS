# SIMS - Complete Setup & Execution Guide

This guide covers the complete setup and execution of the Smart Inventory Management System (SIMS) with both frontend and backend.

## Prerequisites

- **Node.js** 16+ (https://nodejs.org/)
- **npm** 8+ or **yarn**
- **Git**
- **Docker** (optional, for PostgreSQL)
- A code editor (VS Code recommended)

## Project Structure

```
SIMS/
├── sims-backend/          # Node.js/Express backend
├── sims-frontend/         # React frontend
├── docker-compose.yml     # Docker configuration
├── scripts/
│   └── init.sql           # Database initialization
└── README.md
```

## Quick Start (5 minutes)

### 1. Backend Setup

```bash
cd sims-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Start the server
npm start
# Server runs on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd sims-frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# App opens at http://localhost:5173
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Default Login**: 
  - Email: `admin@example.com`
  - Password: `password123`

---

## Detailed Setup Instructions

### Backend Setup

#### Step 1: Navigate to Backend Directory
```bash
cd d:\SIMS\sims-backend
```

#### Step 2: Install Dependencies
```bash
npm install
```

Expected dependencies:
- express
- sequelize
- pg (PostgreSQL)
- jsonwebtoken
- bcryptjs
- dotenv
- cors
- multer
- validation libraries

#### Step 3: Database Setup

**Option A: Using Docker Compose**
```bash
# From project root
docker-compose up -d

# This starts PostgreSQL on localhost:5432
```

**Option B: Local PostgreSQL**
1. Install PostgreSQL
2. Create a database:
   ```sql
   CREATE DATABASE sims;
   CREATE USER sims_user WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE sims TO sims_user;
   ```

#### Step 4: Configure Environment

Create/Edit `.env` in `sims-backend/`:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sims
DB_USER=sims_user
DB_PASSWORD=password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:5173

# File Upload
UPLOAD_DIR=./src/uploads
MAX_FILE_SIZE=10485760
```

#### Step 5: Run Database Migrations

```bash
# Run migrations (if using migration scripts)
npm run migrate

# Seed initial data (optional)
npm run seed
```

#### Step 6: Start Backend Server

```bash
npm start
```

Expected output:
```
Server running on port 5000
Database connected
```

#### Testing Backend

```bash
# In another terminal, test the API
curl http://localhost:5000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

---

### Frontend Setup

#### Step 1: Navigate to Frontend Directory
```bash
cd d:\SIMS\sims-frontend
```

#### Step 2: Install Dependencies
```bash
npm install
```

Expected dependencies:
- react & react-dom 18.2+
- react-router-dom 6.21+
- @reduxjs/toolkit & react-redux
- axios
- formik & yup
- recharts
- @mui/material & @mui/icons-material
- tailwindcss

#### Step 3: Configure Environment

The `.env` file is already pre-configured:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=SIMS
```

If your backend is on a different host/port, update `VITE_API_BASE_URL`.

#### Step 4: Start Development Server

```bash
npm run dev
```

Expected output:
```
  VITE v5.0.7  dev server running at:

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

#### Step 5: Access the Application

Open `http://localhost:5173` in your browser. You should see the login page.

---

## Application Usage

### Login

1. Navigate to `http://localhost:5173`
2. Enter credentials:
   - Email: `admin@example.com`
   - Password: `password123`
3. Click "Login"

### Dashboard

- View key metrics: Total Products, Stock Value, Low Stock Items, Pending Orders
- See warehouse stock levels via bar chart
- View category distribution via pie chart
- Check low-stock items in the table

### Products

1. Click "Products" in sidebar
2. **View Products**: Table displays all products
3. **Search**: Use search bar to find by name or SKU
4. **Filter**: Use category dropdown to filter
5. **Add Product**: Click "➕ Add Product" button
   - Fill in SKU, Name, Category, Unit Price, Reorder Level
   - Click "Save Product"
6. **Edit Product**: Click ✏️ icon, modify, save
7. **Delete Product**: Click 🗑️ icon, confirm deletion

### Other Pages

- **Inventory**: Track inventory across warehouses
- **Warehouses**: Manage warehouse locations
- **Suppliers**: Manage supplier information
- **Purchase Orders**: Create and track POs
- **Sales Orders**: Track sales orders
- **Reports**: Generate business reports
- **Settings**: Configure system settings

### User Menu

- Click user avatar (top right)
- Options:
  - ⚙️ Settings
  - 👤 Profile
  - 🚪 Logout

---

## Available Commands

### Backend

```bash
# Start server
npm start

# Development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/register` - Register new user

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Inventory
- `GET /api/inventory` - List inventory
- `GET /api/inventory/low-stock` - Get low stock items
- `PUT /api/inventory/:id` - Update stock

### Dashboard/Reports
- `GET /api/reports/dashboard` - Dashboard data
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/inventory` - Inventory report

---

## Troubleshooting

### Common Issues

#### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
# Linux/Mac:
pg_isready -h localhost -p 5432

# Windows:
# Check Services or use docker-compose
docker ps | grep postgres

# If using docker-compose:
docker-compose logs postgres
```

#### "Port 5000 already in use"
```bash
# Find process using port 5000
# Linux/Mac:
lsof -i :5000

# Windows:
netstat -ano | findstr :5000

# Kill process or use different port
# Edit .env and restart
```

#### "API connection failed"
- Verify backend is running: `http://localhost:5000/api`
- Check `.env` in frontend for correct `VITE_API_BASE_URL`
- Check browser console for CORS errors
- Verify backend CORS settings

#### "Login fails"
- Verify backend database has user records
- Check JWT_SECRET in backend `.env`
- Review backend logs for errors
- Ensure seed data was run: `npm run seed`

#### "npm install fails"
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

## Production Deployment

### Build Frontend
```bash
cd sims-frontend
npm run build
# Output in dist/ folder
```

### Deploy Frontend
- Upload `dist/` folder to CDN or web server
- Set `VITE_API_BASE_URL` to production backend URL

### Deploy Backend
```bash
# Build for production
NODE_ENV=production npm install --production

# Use process manager (PM2 recommended)
npm install -g pm2
pm2 start src/server.js --name "sims-backend"
```

### Environment Setup (Production)
```env
# .env (production)
PORT=5000
NODE_ENV=production

DB_HOST=your_production_db_host
DB_PORT=5432
DB_NAME=sims
DB_USER=sims_user
DB_PASSWORD=strong_password_here

JWT_SECRET=your_strong_jwt_secret_key
JWT_EXPIRY=24h

CORS_ORIGIN=https://yourdomain.com
```

---

## Development Workflow

### 1. Start Services
```bash
# Terminal 1: Backend
cd sims-backend
npm run dev

# Terminal 2: Frontend
cd sims-frontend
npm run dev

# Terminal 3 (optional): Database (Docker)
docker-compose up
```

### 2. Code Changes
- Backend changes auto-reload
- Frontend changes auto-rebuild in browser

### 3. Testing
- Open DevTools (F12) for debugging
- Check Network tab for API calls
- Review Console for errors

### 4. Commit Changes
```bash
git add .
git commit -m "feature: add new feature"
git push origin main
```

---

## Performance Tips

### Frontend
- Use React DevTools for component profiling
- Check Network tab for large bundle sizes
- Enable gzip compression
- Cache static assets

### Backend
- Add database indexes on frequently queried columns
- Implement request caching
- Use connection pooling
- Monitor query performance

---

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong database password
- [ ] Enable CORS only for your domain
- [ ] Implement rate limiting
- [ ] Use HTTPS in production
- [ ] Validate all user inputs
- [ ] Sanitize database queries
- [ ] Keep dependencies updated: `npm audit`
- [ ] Use environment variables for secrets
- [ ] Implement proper error handling (no stack traces in production)

---

## Support & Documentation

- **Backend Setup**: See `sims-backend/SETUP_GUIDE.md`
- **API Documentation**: See `sims-backend/API_DOCUMENTATION.md`
- **Frontend Guide**: See `sims-frontend/FRONTEND_GUIDE.md`
- **Build Summary**: See `sims-backend/BUILD_SUMMARY.md`

---

## Next Steps

1. ✅ Run the application
2. Test all features
3. Customize styling/branding
4. Extend with additional features
5. Set up CI/CD pipeline
6. Deploy to production

---

Happy coding! 🚀
