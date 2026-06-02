# 🚀 SIMS Authentication System - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Docker Desktop running
- MySQL 5.7+ (via Docker)
- npm package manager

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Start Backend (Terminal 1)

```bash
# Navigate to backend
cd d:\SIMS\sims-backend

# Start MySQL container
docker-compose up -d

# Run migrations (creates tables)
npx sequelize-cli db:migrate

# Seed demo users into database
npx sequelize-cli db:seed:all

# Start backend server on port 5000
npm start
```

**Expected Output:**
```
✅ Server running at http://localhost:5000
🏥 Health check at http://localhost:5000/health
🔐 Auth endpoints at http://localhost:5000/api/auth
```

### Step 2: Start Frontend (Terminal 2)

```bash
# Navigate to frontend
cd d:\SIMS\sims-frontend

# Start dev server on port 5173
npm run dev
```

**Expected Output:**
```
➜  Local:   http://localhost:5173/
```

### Step 3: Test in Browser

Open http://localhost:5173 in your browser

---

## 📝 Demo Credentials to Test

Use these pre-seeded accounts to login:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@sims.com | password123 |
| **Manager** | manager@sims.com | password123 |
| **Staff** | staff1@sims.com | password123 |

---

## 🧪 Test Scenarios

### Test 1: Login with Demo Account

1. Click **Login** button on landing page (or go to `/login`)
2. Enter: `admin@sims.com` / `password123`
3. Click **Login**
4. ✅ Should redirect to `/dashboard` with success toast

### Test 2: Create New Account

1. Click **Register** button (or go to `/register`)
2. Fill in form:
   ```
   Full Name: John Doe
   Email: john@example.com
   Department: Warehouse (optional)
   Password: Test@1234
   Confirm Password: Test@1234
   ```
3. Click **Create Account**
4. ✅ Should auto-login and redirect to `/dashboard`

### Test 3: Protected Routes

1. Login to get into dashboard
2. Copy the URL and note your token in localStorage
3. Open DevTools → Application → LocalStorage → `token`
4. Logout (clears token from localStorage)
5. Try accessing `/dashboard` directly
6. ✅ Should redirect to `/login`

### Test 4: Invalid Credentials

1. Go to `/login`
2. Enter: `admin@sims.com` / `wrongpassword`
3. Click **Login**
4. ✅ Should show error toast: "Invalid email or password"

### Test 5: Network Error Handling

1. Stop backend server (Ctrl+C)
2. Try to login
3. ✅ Should show error: "Cannot connect to backend"

---

## 🔍 Verification Endpoints

### Check Backend Health

```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "message": "Server is running",
  "timestamp": "2024-05-31T10:30:00.000Z",
  "database": "checking..."
}
```

### Test Login Endpoint

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sims.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
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

### Test Protected Endpoint (with token)

```bash
# Replace TOKEN with actual accessToken from login response
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer {TOKEN}"
```

---

## 📱 Frontend Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Public | Landing page |
| `/login` | Public | Login form |
| `/register` | Public | Registration form |
| `/dashboard` | Protected | Main dashboard |
| `/products` | Protected | Products page |
| `/inventory` | Protected | Inventory page |
| `/warehouses` | Protected | Warehouses page |

---

## 🗄️ Database Check

### Connect to MySQL

```bash
# Open new terminal
mysql -u sims_user -p sims_db

# When prompted, enter password: sims_password
```

### Check Users Table

```sql
SELECT user_id, email, full_name, role FROM users;
```

**Expected Output:**
```
user_id | email            | full_name     | role
--------|------------------|---------------|--------
1       | admin@sims.com   | Admin User    | admin
2       | manager@sims.com | Manager User  | manager
3       | staff1@sims.com  | Staff User One| staff
4       | staff2@sims.com  | Staff User Two| staff
```

### Check Audit Logs

```sql
SELECT user_id, action, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🐛 Troubleshooting

### Backend won't start

**Problem:** `Error: Cannot find module 'express'`

**Solution:**
```bash
cd sims-backend
npm install
npm start
```

### Database connection error

**Problem:** `Access denied for user 'sims_user'@'localhost'`

**Solution:**
```bash
# Ensure MySQL container is running
docker ps | grep mysql

# If not running:
docker-compose up -d

# Wait 10 seconds for MySQL to initialize
# Then run migrations again:
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

### Frontend can't connect to backend

**Problem:** Network error toast: "Cannot connect to backend"

**Solution:**
1. Check backend is running: `http://localhost:5000/health`
2. Check VITE_API_BASE_URL in `.env` file: Should be `http://localhost:5000/api`
3. Check CORS in backend is enabled for `http://localhost:5173`

### Cannot login even with correct credentials

**Problem:** "Invalid email or password" error

**Solutions:**
- Ensure demo users were seeded: `npx sequelize-cli db:seed:all`
- Check password is exactly: `password123` (case-sensitive)
- Check email is exactly: `admin@sims.com` (case-sensitive)

### Port already in use

**Problem:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual number)
taskkill /PID {PID} /F
```

---

## 📊 File Structure

```
sims-backend/
├── src/
│   ├── routes/
│   │   └── authRoutes.js (5 endpoints)
│   ├── controllers/
│   │   └── authController.js
│   ├── services/
│   │   └── authService.js
│   ├── middlewares/
│   │   └── authMiddleware.js
│   ├── models/
│   │   └── user.js
│   └── server.js

sims-frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── store/
│   │   └── authSlice.js
│   ├── services/
│   │   └── api.js
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   ├── hooks/
│   │   └── useToast.js
│   ├── styles/
│   │   ├── Login.css
│   │   └── Register.css
│   └── App.jsx
```

---

## ✅ Verification Checklist

- [ ] Backend server running on port 5000
- [ ] Frontend dev server running on port 5173
- [ ] MySQL container running
- [ ] Demo users appear in database
- [ ] Can login with `admin@sims.com` / `password123`
- [ ] Can register new account
- [ ] Can logout
- [ ] Protected routes redirect to login when not authenticated
- [ ] Tokens stored in localStorage
- [ ] Redux state updates on login/logout

---

## 🎯 Next Steps

1. **Test all authentication flows** using the scenarios above
2. **Review security** implementation in `AUTHENTICATION_SYSTEM_COMPLETE.md`
3. **Implement additional features:**
   - Password reset flow
   - Email verification
   - Social login
   - Two-factor authentication
4. **Deploy to production** (update JWT_SECRET, use HTTPS, etc.)

---

## 📚 Documentation

- Full technical docs: `AUTHENTICATION_SYSTEM_COMPLETE.md`
- Backend API docs: `sims-backend/API_DOCUMENTATION.md`
- Setup guide: `sims-backend/SETUP_GUIDE.md`

---

## 💬 Support

If you encounter any issues:

1. Check terminal output for error messages
2. Review `AUTHENTICATION_SYSTEM_COMPLETE.md` for detailed docs
3. Check Docker container logs: `docker logs mysql`
4. Check backend logs: Check console output from `npm start`
5. Check browser console for frontend errors: DevTools → Console

---

**Happy testing! 🎉**
