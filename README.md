# Smart Inventory Management System (SIMS)

A full-stack web application for managing inventory efficiently. Built with modern tech stack including React, Node.js, Express, and MySQL.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## ✨ Features

- User authentication and authorization
- Inventory management with stock tracking
- Category management
- Real-time inventory alerts
- Transaction history
- Dashboard with analytics
- Role-based access control (Admin, Manager, Staff)
- File upload support
- Email notifications

## 🛠 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router DOM** - Navigation
- **Redux Toolkit** - State management
- **Axios** - HTTP client
- **Tailwind CSS** / **Material-UI** - Styling
- **Formik & Yup** - Form validation
- **Recharts** - Data visualization
- **date-fns** - Date utilities

### Backend
- **Node.js 16+** - Runtime
- **Express 4** - Web framework
- **Sequelize** - ORM
- **MySQL 5.7+** - Database
- **JWT** - Authentication
- **Multer** - File uploads
- **Nodemailer** - Email service
- **Winston** - Logging
- **Express Rate Limit** - API protection

## 📁 Project Structure

```
SIMS/
├── sims-backend/              # Backend application
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   ├── controllers/       # Request handlers
│   │   ├── middlewares/       # Custom middlewares
│   │   ├── models/           # Sequelize models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   ├── validators/       # Data validators
│   │   ├── uploads/          # Upload storage
│   │   └── server.js         # Entry point
│   ├── migrations/            # Database migrations
│   ├── seeders/              # Database seeders
│   ├── .env                  # Environment variables
│   ├── .env.example          # Example env file
│   ├── package.json          # Dependencies
│   └── README.md             # Backend docs
│
├── sims-frontend/             # Frontend application
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── store/            # Redux store
│   │   ├── services/         # API services
│   │   ├── utils/            # Utility functions
│   │   ├── hooks/            # Custom hooks
│   │   ├── styles/           # Global styles
│   │   ├── assets/           # Static assets
│   │   ├── layouts/          # Layout components
│   │   ├── main.jsx          # Entry point
│   │   └── App.jsx           # Root component
│   ├── public/               # Static files
│   ├── index.html            # HTML template
│   ├── vite.config.js        # Vite configuration
│   ├── package.json          # Dependencies
│   ├── .env                  # Environment variables
│   └── README.md             # Frontend docs
│
├── scripts/                   # Database scripts
│   └── init.sql              # Database initialization
├── docker-compose.yml        # Docker services
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16 or higher
- npm or yarn
- Docker and Docker Compose (for MySQL)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd SIMS
```

2. **Backend Setup**
```bash
cd sims-backend
npm install
```

3. **Frontend Setup**
```bash
cd ../sims-frontend
npm install
```

## 🏃 Running the Application

### 1. Start MySQL Database
```bash
docker-compose up -d
```

Check the database:
- **PhpMyAdmin**: http://localhost:8080
- **User**: sims_user
- **Password**: sims_password_123

### 2. Start Backend Server
```bash
cd sims-backend
cp .env.example .env  # Create .env file if needed
npm run dev           # Start with nodemon
```

The backend will run on: **http://localhost:5000**

Health check: **http://localhost:5000/health**

### 3. Start Frontend Development Server
```bash
cd sims-frontend
npm run dev
```

The frontend will run on: **http://localhost:5173**

## 📊 Database Setup

The database is automatically initialized when Docker starts. The `init.sql` file creates:
- `users` table
- `categories` table
- `inventory` table
- `transactions` table
- `alerts` table

Sample data includes:
- Admin user: `admin@sims.com`
- Manager user: `manager@sims.com`

## 🔒 Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sims_db
DB_USER=sims_user
DB_PASSWORD=sims_password_123
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=SIMS
```

## 📝 Available Scripts

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm test` - Run tests

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code
- `npm run format` - Format code

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Inventory
- `GET /api/inventory` - Get all items
- `POST /api/inventory` - Create new item
- `GET /api/inventory/:id` - Get item details
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

### Users
- `GET /api/users` - Get all users (Admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure Docker containers are running: `docker ps`
- Check database credentials in `.env`
- Verify MySQL is listening on port 3306

### Port Already in Use
- Backend: Kill process on port 5000 or change PORT in .env
- Frontend: Kill process on port 5173 or Vite will use next available port

### Dependencies Installation Issues
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install`

## 📚 Documentation

- [Backend README](./sims-backend/README.md)
- [Frontend README](./sims-frontend/README.md)

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- React team for Vite and React
- Express.js community
- Sequelize ORM documentation
