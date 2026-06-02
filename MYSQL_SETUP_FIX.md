# 🔧 MySQL Setup & Migration Guide

## Step 1: Start MySQL Container

```bash
# From d:\SIMS directory
docker-compose up -d
```

**Expected Output:**
```
Creating sims-mysql ... done
Creating sims-phpmyadmin ... done
```

**Verify it's running:**
```bash
docker ps
```

You should see:
- `sims-mysql` container running on port 3306
- `sims-phpmyadmin` running on port 8080

## Step 2: Wait for MySQL to Initialize

The MySQL container takes 10-30 seconds to fully initialize. The health check will verify when it's ready:

```bash
docker logs sims-mysql
```

Wait until you see:
```
[Entrypoint] MySQL init process done. Ready for start up.
```

## Step 3: Run Database Migrations

Once MySQL is ready, run:

```bash
cd d:\SIMS\sims-backend
npx sequelize-cli db:migrate
```

**Expected Output:**
```
Sequelize CLI [Node: 23.3.0, CLI: 6.6.5, ORM: 6.37.8]
Loaded configuration file "src\config\database.js".
Using environment "development".
migrating storage table ... done
migrating table "users" ... done
migrating table "warehouses" ... done
migrating table "products" ... done
migrating table "inventory" ... done
migrating table "suppliers" ... done
migrating table "purchase_orders" ... done
migrating table "sales_orders" ... done
migrating table "audit_logs" ... done
```

## Step 4: Seed Demo Users

```bash
npx sequelize-cli db:seed:all
```

**Expected Output:**
```
Sequelize CLI [Node: 23.3.0, CLI: 6.6.5, ORM: 6.37.8]
Loaded configuration file "src\config\database.js".
Using environment "development".
Seeding ... 001-seed-users.js
Seeding ... 002-seed-warehouses.js
Seeding ... 003-seed-products.js
Seeding ... 004-seed-inventory.js
Seeding ... 005-seed-suppliers.js
```

---

## ✅ What I Fixed

### 1. **database.js Credentials** (Updated)
```javascript
// BEFORE (WRONG):
username: process.env.DB_USER || 'admin@sims.com'
password: process.env.DB_PASSWORD || 'password123'

// AFTER (CORRECT):
username: process.env.DB_USER || 'sims_user'
password: process.env.DB_PASSWORD || 'sims_password_123'
```

### 2. **.env File** (Created with correct credentials)
```env
DB_USER=sims_user
DB_PASSWORD=sims_password_123
DB_NAME=sims_db
DB_HOST=localhost
DB_PORT=3306
```

These now match **docker-compose.yml**:
```yaml
MYSQL_USER: sims_user
MYSQL_PASSWORD: sims_password_123
```

---

## 🐛 Troubleshooting

### MySQL Container Won't Start

**Problem:** `docker-compose up` shows errors

**Solution:**
```bash
# Check Docker is running
docker info

# Check container logs
docker logs sims-mysql

# Remove and restart
docker-compose down
docker-compose up -d
```

### Still Getting "Access Denied"

**Problem:** Migration still shows access denied

**Solutions:**
```bash
# 1. Check .env file exists and has correct credentials
cat .env | findstr DB_

# 2. Check MySQL container is healthy
docker ps
# Look for "healthy" status

# 3. Wait longer and check logs
docker logs sims-mysql

# 4. Try connecting manually
mysql -h localhost -u sims_user -p sims_password_123 -e "SELECT 1"
```

### Cannot Find mysql Command

**Problem:** `mysql: The term 'mysql' is not recognized`

**Solution:** Use Docker to connect instead
```bash
docker exec -it sims-mysql mysql -u sims_user -psims_password_123 sims_db -e "SELECT 1"
```

---

## 📊 Verify Database

Once migrations complete, verify tables were created:

```bash
docker exec sims-mysql mysql -u sims_user -psims_password_123 sims_db -e "SHOW TABLES;"
```

**Expected Output:**
```
Tables_in_sims_db
audit_logs
inventory
products
purchase_orders
sales_orders
sequelizemeta
suppliers
users
warehouses
```

---

## 🚀 Next Steps

After migrations and seeding complete:

```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Start frontend
cd ..\sims-frontend
npm run dev

# Open http://localhost:5173 in browser
# Login with: admin@sims.com / password123
```

---

## 📝 Credentials Reference

### Database User (Docker)
- **Username:** `sims_user`
- **Password:** `sims_password_123`
- **Database:** `sims_db`
- **Host:** `localhost`
- **Port:** `3306`

### Root User (Docker)
- **Username:** `root`
- **Password:** `root_password_123`

### Demo Login User
- **Email:** `admin@sims.com`
- **Password:** `password123`

---

## ✅ Complete Checklist

- [ ] Docker Desktop running
- [ ] `.env` file created with correct credentials
- [ ] `docker-compose up -d` executed
- [ ] MySQL container is healthy (`docker ps` shows healthy)
- [ ] `npx sequelize-cli db:migrate` completed successfully
- [ ] `npx sequelize-cli db:seed:all` completed successfully
- [ ] Can see 9 tables: `SHOW TABLES;`
- [ ] Can login with `admin@sims.com` / `password123`

---

**You're now ready to migrate! 🎉**
