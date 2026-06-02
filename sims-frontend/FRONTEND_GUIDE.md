# SIMS Frontend - React Application

A modern, responsive React 18 frontend for the Smart Inventory Management System (SIMS) with Redux Toolkit, Formik, Recharts, and Tailwind CSS.

## Features

### ✅ Completed Features

1. **Authentication System**
   - Login page with Formik + Yup validation
   - Redux-based auth state management
   - JWT token storage and retrieval
   - Protected routes with automatic redirect to login
   - Automatic token injection in API requests via interceptors

2. **Axios API Integration**
   - Base URL configuration from `.env`
   - Request interceptor for JWT token attachment
   - Response interceptor for 401 error handling
   - Automatic error toast notifications
   - Organized API methods by resource (auth, products, inventory, etc.)

3. **Main Layout**
   - Responsive sidebar with collapsible navigation
   - Sticky topbar with user profile dropdown
   - Mobile-friendly toggle for sidebar
   - User avatar with initials
   - Logout functionality

4. **Dashboard Page**
   - 4 metric cards (Total Products, Stock Value, Low Stock, Pending Orders)
   - Bar chart for warehouse stock levels (Recharts)
   - Pie chart for category distribution
   - Table showing top 5 low-stock items with reorder buttons
   - Refresh functionality
   - Loading states and error handling

5. **Products Management**
   - Table with columns: SKU, Name, Category, Unit Price, Reorder Level, Actions
   - Search functionality by name/SKU
   - Category filter dropdown
   - Add Product modal with Formik form
   - Edit/Delete actions per row
   - Form validation with Yup
   - Responsive design

6. **Toast Notifications**
   - Context-based toast system
   - Success, error, warning, info types
   - Auto-dismiss functionality
   - Manual dismiss option

7. **Placeholder Pages**
   - Inventory Management
   - Warehouses Management
   - Suppliers Management
   - Purchase Orders
   - Sales Orders
   - Reports
   - Settings

## Project Structure

```
src/
├── components/
│   ├── ProtectedRoute.jsx      # Route wrapper for auth check
│   ├── Sidebar.jsx             # Navigation sidebar
│   ├── Toast.jsx               # Toast notifications
│   ├── Topbar.jsx              # Top navigation bar
│   └── PlaceholderPage.jsx      # Reusable placeholder component
├── context/
│   └── ToastContext.jsx         # Toast context provider
├── hooks/
│   └── useToast.js              # Custom hook for toast usage
├── layouts/
│   └── MainLayout.jsx           # Main app layout wrapper
├── pages/
│   ├── Login.jsx                # Login page
│   ├── Dashboard.jsx            # Dashboard page
│   ├── Products.jsx             # Products management page
│   ├── Inventory.jsx            # Inventory page (placeholder)
│   ├── Warehouses.jsx           # Warehouses page (placeholder)
│   ├── Suppliers.jsx            # Suppliers page (placeholder)
│   ├── PurchaseOrders.jsx       # Purchase Orders page (placeholder)
│   ├── SalesOrders.jsx          # Sales Orders page (placeholder)
│   ├── Reports.jsx              # Reports page (placeholder)
│   └── Settings.jsx             # Settings page (placeholder)
├── services/
│   └── api.js                   # Axios instance and API methods
├── store/
│   ├── index.js                 # Redux store configuration
│   └── authSlice.js             # Auth Redux slice
├── styles/
│   ├── Dashboard.css            # Dashboard styles
│   ├── Login.css                # Login page styles
│   ├── MainLayout.css           # Main layout styles
│   ├── PlaceholderPage.css      # Placeholder page styles
│   ├── Products.css             # Products page styles
│   ├── Sidebar.css              # Sidebar styles
│   ├── Toast.css                # Toast styles
│   └── Topbar.css               # Topbar styles
├── App.jsx                      # Main app component with routes
├── App.css                      # Global app styles
├── main.jsx                     # Entry point
└── index.css                    # Base styles
```

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   # The .env file is already configured
   cat .env
   # Output:
   # VITE_API_BASE_URL=http://localhost:5000/api
   # VITE_APP_NAME=SIMS
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint and fix code
npm run lint

# Format code with prettier
npm run format
```

## API Integration

### Base Configuration
- **Base URL**: `http://localhost:5000/api` (from `.env`)
- **Auth**: JWT tokens stored in `localStorage`
- **Headers**: Automatically includes `Authorization: Bearer <token>`

### Available API Endpoints

```javascript
// Auth
authAPI.login(credentials)          // POST /auth/login
authAPI.logout()                    // POST /auth/logout
authAPI.register(data)              // POST /auth/register

// Products
productAPI.getAll(params)           // GET /products
productAPI.getById(id)              // GET /products/:id
productAPI.create(data)             // POST /products
productAPI.update(id, data)         // PUT /products/:id
productAPI.delete(id)               // DELETE /products/:id

// Inventory
inventoryAPI.getAll(params)         // GET /inventory
inventoryAPI.getLowStock()          // GET /inventory/low-stock

// Warehouses, Suppliers, Purchase Orders, Sales Orders
// Follow the same pattern as Products

// Reports
reportAPI.getDashboard()            // GET /reports/dashboard
```

## State Management (Redux)

### Auth Slice Structure
```javascript
{
  user: { id, name, email, ...},
  token: "jwt_token_string",
  role: "admin|user|manager",
  isAuthenticated: true/false,
  isLoading: false,
  error: null
}
```

### Available Actions
- `loginStart()` - Set loading state
- `loginSuccess(payload)` - Login successful
- `loginFailure(error)` - Login failed
- `logout()` - Logout user
- `setUser(user)` - Update user info
- `setRole(role)` - Update user role
- `clearError()` - Clear error state
- `restoreAuth()` - Restore auth from localStorage

## Component Examples

### Using Toast Notifications
```javascript
import { useToast } from '../hooks/useToast';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleAction = () => {
    showToast('Action completed!', 'success');
    // Types: 'success', 'error', 'warning', 'info'
    // Optional duration in ms (default 4000)
  };
}
```

### Creating a Protected Page
```javascript
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <YourPage />
      </MainLayout>
    </ProtectedRoute>
  );
}
```

### Using Redux Auth State
```javascript
import { useSelector } from 'react-redux';

function MyComponent() {
  const { user, role, isAuthenticated } = useSelector(state => state.auth);
  
  return <div>Welcome {user?.name}!</div>;
}
```

## Authentication Flow

1. User navigates to `/login`
2. Enters email and password
3. `loginSuccess` action dispatches with user data and token
4. Token is stored in `localStorage`
5. User redirected to `/dashboard`
6. All subsequent API calls include the JWT token
7. If token expires (401), user is redirected to login

## Error Handling

- **API Errors**: Automatically caught by axios interceptor
- **401 Unauthorized**: Clear token and redirect to login
- **403 Forbidden**: Show permission error toast
- **Generic Errors**: Show error toast with message from API

## Styling

The project uses a combination of:
- **CSS Modules**: Individual `.css` files for each component
- **Tailwind CSS**: Utility classes (configured in `tailwind.config.js`)
- **MUI Material**: Icon library and optional components
- **Responsive Design**: Mobile-first approach with media queries

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Code splitting via Vite
- Lazy loading of routes (can be added)
- Memoization of expensive computations
- Efficient re-renders with React hooks
- Optimized build output with chunk splitting

## Future Enhancements

- [ ] Image upload for products
- [ ] Advanced filtering and pagination
- [ ] Data export (CSV, Excel)
- [ ] Real-time notifications via WebSockets
- [ ] User role-based access control (RBAC)
- [ ] Audit logs viewer
- [ ] Advanced reporting dashboard
- [ ] Bulk operations
- [ ] Internationalization (i18n)

## Troubleshooting

### API Connection Issues
- Ensure backend is running on `http://localhost:5000`
- Check `.env` file for correct `VITE_API_BASE_URL`
- Verify CORS is enabled on backend

### Authentication Issues
- Clear `localStorage` and refresh the page
- Check if token is being stored: `localStorage.getItem('token')`
- Verify JWT format in API responses

### Build Issues
- Clear `dist` folder and rebuild
- Delete `node_modules` and reinstall: `npm install`
- Check Node.js version (requires Node 16+)

## Support

For issues or questions, refer to:
- Backend API Documentation: `../sims-backend/API_DOCUMENTATION.md`
- Project Setup Guide: `../sims-backend/SETUP_GUIDE.md`
