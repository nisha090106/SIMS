# SIMS Backend

Smart Inventory Management System - Backend API

## 📋 Overview

RESTful API built with Express and Sequelize ORM for managing inventory operations.

## 🛠 Tech Stack

- **Node.js 16+**
- **Express 4**
- **Sequelize ORM**
- **MySQL 5.7+**
- **JWT Authentication**
- **Multer** for file uploads
- **Winston** for logging
- **Nodemailer** for emails

## 📁 Project Structure

```
src/
├── config/
│   ├── database.js        # Sequelize configuration
│   ├── logger.js          # Winston logger setup
│   └── constants.js       # App constants
├── models/
│   ├── User.js
│   ├── Category.js
│   ├── Inventory.js
│   ├── Transaction.js
│   └── Alert.js
├── routes/
│   ├── auth.js
│   ├── inventory.js
│   ├── users.js
│   └── categories.js
├── controllers/
│   ├── authController.js
│   ├── inventoryController.js
│   ├── userController.js
│   └── categoryController.js
├── services/
│   ├── authService.js
│   ├── inventoryService.js
│   ├── emailService.js
│   └── fileService.js
├── middlewares/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── validateRequest.js
│   └── uploadMiddleware.js
├── validators/
│   ├── authValidator.js
│   ├── inventoryValidator.js
│   └── userValidator.js
├── utils/
│   ├── helpers.js
│   ├── dateUtils.js
│   └── apiResponse.js
└── server.js              # Entry point
```

## 🚀 Installation

```bash
npm install
```

### Environment Variables

Create `.env` file:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sims_db
DB_USER=sims_user
DB_PASSWORD=sims_password_123
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🏃 Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Testing
```bash
npm test
```

### Code Quality
```bash
npm run lint      # ESLint
npm run format    # Prettier
```

## 📡 API Structure

All endpoints require `Content-Type: application/json`

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "code": 200
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": 400
}
```

## 🔐 Authentication

JWT tokens are sent in Authorization header:
```
Authorization: Bearer <token>
```

## 📝 Database Models

### User
- id (PK)
- email (unique)
- password (hashed)
- first_name
- last_name
- role (admin, manager, staff)
- status (active, inactive)

### Category
- id (PK)
- name (unique)
- description

### Inventory
- id (PK)
- sku (unique)
- name
- description
- category_id (FK)
- quantity
- reorder_level
- price
- status

### Transaction
- id (PK)
- inventory_id (FK)
- type (in, out)
- quantity
- reference
- created_by (FK)

### Alert
- id (PK)
- inventory_id (FK)
- alert_type
- message
- status

## 🐛 Troubleshooting

### Cannot connect to MySQL
1. Check Docker containers: `docker ps`
2. Verify credentials in .env
3. Check MySQL port 3306 is accessible

### JWT errors
- Ensure JWT_SECRET is set in .env
- Check token expiration with JWT_EXPIRE

### Port 5000 already in use
```bash
# Find and kill process
lsof -ti:5000 | xargs kill -9
```

## 📚 Resources

- [Express Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [JWT Documentation](https://jwt.io/)

## 🤝 Contributing

Follow ESLint and Prettier rules. All code must be formatted:
```bash
npm run lint
npm run format
```

## 📄 License

MIT License
