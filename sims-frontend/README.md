# SIMS Frontend

Smart Inventory Management System - Frontend UI

## 📋 Overview

React-based single-page application for inventory management with modern UI/UX.

## 🛠 Tech Stack

- **React 18**
- **Vite** - Build tool
- **React Router DOM** - Navigation
- **Redux Toolkit** - State management
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Material-UI** - UI components
- **Formik & Yup** - Form management
- **Recharts** - Data visualization
- **date-fns** - Date utilities

## 📁 Project Structure

```
src/
├── components/
│   ├── Common/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Footer.jsx
│   │   └── Loading.jsx
│   ├── Forms/
│   │   ├── LoginForm.jsx
│   │   ├── InventoryForm.jsx
│   │   └── CategoryForm.jsx
│   ├── Tables/
│   │   ├── InventoryTable.jsx
│   │   └── TransactionTable.jsx
│   └── Charts/
│       ├── StockChart.jsx
│       └── SalesChart.jsx
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Inventory.jsx
│   ├── Categories.jsx
│   ├── Users.jsx
│   ├── Transactions.jsx
│   └── NotFound.jsx
├── store/
│   ├── store.js
│   ├── slices/
│   │   ├── authSlice.js
│   │   ├── inventorySlice.js
│   │   └── uiSlice.js
│   └── middleware/
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── inventoryService.js
│   └── userService.js
├── utils/
│   ├── constants.js
│   ├── validators.js
│   └── helpers.js
├── hooks/
│   ├── useAuth.js
│   ├── useFetch.js
│   └── useForm.js
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── tailwind.css
├── assets/
│   ├── images/
│   └── icons/
├── layouts/
│   ├── MainLayout.jsx
│   └── AuthLayout.jsx
├── main.jsx
└── App.jsx
```

## 🚀 Installation

```bash
npm install
```

### Environment Variables

Create `.env` file:
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=SIMS
```

## 🏃 Running

### Development
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Code Quality
```bash
npm run lint      # ESLint
npm run format    # Prettier
```

## 📱 Pages

- **Login** - User authentication
- **Dashboard** - Overview and analytics
- **Inventory** - Manage stock items
- **Categories** - Manage product categories
- **Users** - User management (Admin)
- **Transactions** - View transaction history
- **Alerts** - Stock alerts and notifications

## 🎨 Styling

Tailwind CSS with custom configuration:
- Primary color: Blue
- Secondary color: Green
- Responsive design
- Dark mode support (optional)

## 🔐 Authentication

- JWT-based authentication
- Token stored in localStorage
- Auto-logout on token expiration
- Protected routes with PrivateRoute component

## 🔄 State Management

Redux Toolkit for:
- User authentication state
- Inventory data
- UI state (modals, notifications)
- Loading states

## 🌐 API Integration

Axios instance with:
- Base URL configuration
- Request/response interceptors
- Error handling
- Token injection in headers

## 🐛 Troubleshooting

### Cannot connect to backend
1. Check backend is running on port 5000
2. Verify VITE_API_BASE_URL in .env
3. Check CORS configuration on backend

### Build fails
```bash
npm cache clean --force
rm -rf node_modules
npm install
npm run build
```

### Port 5173 already in use
Vite will automatically use next available port

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🤝 Contributing

Follow ESLint and Prettier rules:
```bash
npm run lint
npm run format
```

## 📄 License

MIT License
