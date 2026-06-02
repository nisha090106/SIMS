# SIMS Frontend - Quick Start Guide

## 🚀 Start the Frontend in 3 Steps

### 1. Install Dependencies
```bash
cd d:\SIMS\sims-frontend
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```

### 3. Open in Browser
```
http://localhost:5173
```

---

## 🔐 Login Credentials

```
Email: admin@example.com
Password: password123
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `.env` | API configuration |
| `src/App.jsx` | Main app with routes |
| `src/services/api.js` | API client with interceptors |
| `src/store/authSlice.js` | Redux auth state |
| `src/pages/Dashboard.jsx` | Dashboard page |
| `src/pages/Products.jsx` | Products management |

---

## 🛠️ Development Commands

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Lint code
npm run format     # Format code with Prettier
```

---

## 🎨 Frontend Features

✅ Responsive design (mobile, tablet, desktop)
✅ JWT authentication with automatic token injection
✅ Redux state management
✅ Formik + Yup form validation
✅ Recharts data visualization
✅ Toast notifications
✅ Protected routes
✅ Products CRUD with search & filter
✅ Dashboard with metrics & charts
✅ User dropdown menu

---

## 🔌 API Integration

The backend must be running on: `http://localhost:5000`

Update `.env` if using a different backend URL:
```env
VITE_API_BASE_URL=http://your-backend:5000/api
```

---

## 📖 Documentation

- Full guide: `FRONTEND_GUIDE.md`
- Setup guide: `../SETUP_INSTRUCTIONS.md`
- Build info: `BUILD_SUMMARY.md`

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5173 in use | `npm run dev -- --port 5174` |
| API connection failed | Check backend running + `.env` URL |
| Login fails | Verify backend database + default user |
| Module not found | `rm -rf node_modules && npm install` |

---

## 📱 Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | Login | Authentication page |
| `/dashboard` | Dashboard | Main dashboard with metrics |
| `/products` | Products | Product management CRUD |
| `/inventory` | Inventory | Inventory management |
| `/warehouses` | Warehouses | Warehouse management |
| `/suppliers` | Suppliers | Supplier management |
| `/purchase-orders` | Purchase Orders | PO management |
| `/sales-orders` | Sales Orders | Sales order management |
| `/reports` | Reports | Reports section |
| `/settings` | Settings | System settings |

---

## 🎯 Next Steps

1. ✅ Start frontend: `npm run dev`
2. ✅ Login with demo credentials
3. ✅ Explore Dashboard & Products pages
4. ✅ Implement remaining pages as needed
5. ✅ Customize styling/branding
6. ✅ Deploy to production: `npm run build`

---

**Happy coding! 🚀**
