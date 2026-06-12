# SIMS — Smart Inventory Management System
## Project Progress & Feature Documentation

> Last updated: June 10, 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [How It Works](#how-it-works)
4. [Features Built](#features-built)
5. [Database Models & Relationships](#database-models--relationships)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Role-Based Access Control](#role-based-access-control)
8. [Automation & Cron Jobs](#automation--cron-jobs)
9. [Frontend Pages & Routes](#frontend-pages--routes)
10. [Known Gaps & Placeholders](#known-gaps--placeholders)
11. [Running the Project](#running-the-project)

---

## Project Overview

SIMS is a full-stack **Smart Inventory Management System** built for managing products, warehouses, stock levels, suppliers, purchase orders, and user requests. It supports multiple roles (admin, manager, staff, user/requester), barcode scanning, bulk imports, automated reorder PO creation, and a real-time dashboard.

---

## Tech Stack

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js (ESM modules) | 16+ |
| Framework | Express.js | 4.18.2 |
| ORM | Sequelize | 6.34.0 |
| Database | MySQL | 5.7+ |
| Authentication | JWT (jsonwebtoken) | 9.0.0 |
| Password Hashing | bcryptjs | 2.4.3 |
| Logging | Winston | 3.11.0 |
| Validation | Joi | 17.11.0 |
| Rate Limiting | express-rate-limit | 7.1.5 |
| File Uploads | Multer | 1.4.5 |
| CSV Parsing | csv-parse | 6.2.1 |
| Excel Parsing | xlsx | 0.18.5 |
| Cron Jobs | node-cron | 4.2.1 |
| Email (configured) | nodemailer | 6.9.7 |
| Dev Server | nodemon | 3.0.2 |

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Library | React | 18.2.0 |
| Build Tool | Vite | 5.0.7 |
| Routing | React Router DOM | 6.21.1 |
| State Management | Redux Toolkit + react-redux | 1.9.7 / 8.1.3 |
| HTTP Client | Axios | 1.6.5 |
| Component Library | Material UI (@mui/material) | 5.14.13 |
| Icons | MUI Icons + Lucide React | 5.14.13 / 1.17.0 |
| Charts | Recharts | 2.10.3 |
| Forms | Formik + Yup | 2.4.5 / 1.3.3 |
| Styling | Tailwind CSS + custom CSS | 3.4.1 |
| Date Utilities | date-fns | 2.30.0 |

### Infrastructure

| Layer | Technology |
|-------|-----------|
| Database | Local MySQL (docker-compose prepared but MySQL runs locally) |
| Schema Management | Sequelize Migrations (19 migration files) |
| Seed Data | Sequelize Seeders (6 seed files) |
| Logs | Winston → `/logs/combined.log` and `/logs/error.log` |
| Upload Storage | Local filesystem → `src/uploads/imports/` |

---

## How It Works

### Architecture

```
Browser (React + Vite)
        ↓  HTTP (Axios, JWT Bearer)
Express.js REST API (Node.js, port 5000)
        ↓
Sequelize ORM
        ↓
MySQL Database (sims_db)
        ↓  (background)
node-cron (3 scheduled jobs running in the same Node process)
```

### Request Flow

1. The React frontend makes API calls via Axios to `http://localhost:5000/api`.
2. Every request automatically includes the JWT from `localStorage` via an Axios request interceptor.
3. The Express server validates the JWT using `authMiddleware` and checks the user's role using `authorize(...roles)`.
4. The relevant controller handles the business logic using Sequelize models.
5. Responses follow a consistent `{ success, data, count }` shape for lists and `{ success, data }` for single items.
6. Errors are caught globally by `errorHandler` middleware, which maps Sequelize errors (unique constraint, FK violation, validation) to proper HTTP status codes.
7. All mutations are recorded in the `audit_logs` table via `auditService`.

### Authentication Flow

1. User submits credentials → `POST /api/auth/login`.
2. Server verifies password with bcryptjs, returns an **access token** (7-day) and a **refresh token** (30-day).
3. Frontend stores both in `localStorage`; Redux `authSlice` holds the active user state.
4. On app load, `restoreAuth()` is dispatched to rehydrate Redux from `localStorage`.
5. If a request returns `401`, the Axios response interceptor clears storage and redirects to `/login`.
6. Access tokens can be renewed via `POST /api/auth/refresh-token`.

### Role-Based Routing (Frontend)

- `user` / `staff` roles → routed to `/user-dashboard` (requester portal)
- `admin` / `manager` / `staff` → routed to `/dashboard` (main admin panel)
- `ProtectedRoute` wraps every protected page and redirects unauthorized roles away.

---

## Features Built

### ✅ Authentication & User Management
- Register, login, logout with stateless JWT
- Access token (7 days) + refresh token (30 days)
- Password hashing with bcryptjs (10 salt rounds), hashed on create and update via Sequelize hooks
- Four user roles: `admin`, `manager`, `staff`, `user`
- Profile endpoint returns full user details
- Rate limiting: 100 requests per 15-minute window on all `/api/` routes
- Session expiry handling with automatic redirect to login

### ✅ Product Catalog
- Full CRUD (create, read, update, delete) for products
- Fields: SKU (unique), name, description, category, unit, reorder level, reorder quantity, unit price
- Optional unique barcode field per product
- Category-based filtering and pagination

### ✅ Warehouse Management
- Full CRUD for warehouses
- Capacity and current usage tracking with percentage calculation
- Manager assignment (linked to a user account)
- Dedicated endpoint to fetch users eligible as managers
- Delete restricted to admin only

### ✅ Inventory Management
- Multi-warehouse stock tracking (one inventory record per product per warehouse)
- Stock quantity updates
- Stock transfer between warehouses
- Manual stock adjustment
- Inventory summary stats: total items, total value, unique products, warehouse count
- Low stock alerts (items at or below reorder level)
- Automatic status flags: `available`, `low_stock`, `out_of_stock`
- Batch number, expiry date, and bin location tracking
- Calculated `stock_value` field per inventory record (quantity × unit_price)

### ✅ Supplier Management
- Full CRUD for suppliers
- Fields: name, contact person, email, phone, address, payment terms, lead time (days), rating, status
- Status options: `active`, `inactive`, `blacklisted`
- Dedicated endpoint to update supplier rating
- Referenced in reorder rules as preferred supplier

### ✅ Purchase Orders
- Full lifecycle: `draft` → `pending` → `confirmed` → `delivered` → `cancelled`
- PO number auto-generated (format: `PO-YYYYMMDD-XXXX`)
- Multi-line items stored as JSON
- Approve PO action (admin only)
- Receive goods action (increments inventory)
- Cancel PO action
- `auto_drafted` flag distinguishes manually created vs. system-generated POs
- Filtering by status and pagination

### ✅ Sales Orders
- Full lifecycle: `draft` → `pending` → `dispatched` → `delivered` → `cancelled`
- Order number auto-generation
- Customer name and total amount tracking
- Created by / updated by user tracking

### ✅ User Requests (Requester Portal)
- Separate portal for `user` and `staff` roles
- Browse a product catalog (read-only product view)
- Submit requests with multiple line items (product, quantity, purpose, department)
- Request lifecycle: `pending` → `approved` / `rejected` → `fulfilled` / `cancelled`
- Requesters can cancel their own pending requests
- Admin/manager can approve, reject (with notes), or fulfill requests
- Fulfillment action deducts actual inventory and logs the action
- Requesters see their own request history with status

### ✅ Barcode System
- Products have an optional unique `barcode` field
- **Scan endpoint**: accepts barcode + warehouse + scan type (`stock_in` / `stock_out` / `audit`) + quantity
  - Looks up product by barcode
  - Updates inventory in a database transaction
  - Creates both a `BarcodeScanLog` and an `AuditLog` record
  - Triggers low-stock notification if post-scan quantity ≤ reorder level
  - If barcode is not found: saves an "unrecognised" scan log (product_id = null, processed = false)
- **Lookup**: returns product details and all warehouse inventory locations for a barcode
- **Scan history**: paginated, filterable by warehouse, scan type, and date range
- **Unrecognised scan resolution**: view all unmatched scans; link a scan to a product (assigns barcode to product, processes inventory retroactively, marks log as processed)
- **Barcode scanner widget** in the frontend Automation Dashboard — accepts input from keyboard/USB scanners, shows live result, keeps a session-level scan log

### ✅ Request Workflow System (NEW)
- **Request lifecycle**: `pending` → `approved` → `fulfilled` (or → `rejected` / `cancelled`)
- **Auto-generated request numbers**: Format `REQ-YYYYMMDD-XXXX` (unique per day)
- **Multi-item requests**: Each request contains multiple line items with product + requested quantity
- **Partial approval**: Managers can approve less than requested quantity per item
- **Inventory deduction**: Fulfillment automatically deducts from inventory at destination warehouse (atomic transaction)
- **Rejection with reason**: Managers can reject with detailed reason stored in audit trail
- **Cancellation**: Requesters can cancel pending requests; admin can cancel any request
- **Role-based workflow**:
  - Requester/User: Create requests, view own history, cancel pending
  - Manager: Approve (partial qty), reject (with reason), fulfill, view warehouse requests
  - Admin: Full access to all requests across all warehouses
  - Staff: Can fulfill approved requests
- **Request Portal (Requester)**: Product catalog (grid view with search/filter), add to cart, create request with warehouse/priority selection
- **Request Management (Manager/Admin)**: Table with status tabs, priority badges, inline modals for approve/reject/fulfill actions
- **Request Tracking (Requester)**: Expandable rows showing items with qty progression, visual timeline of status changes, rejection reason display
- **Audit integration**: All request state changes (create, approve, reject, fulfill, cancel) logged to audit_logs

### ✅ Import Center (Bulk Import)
- Three import types: **Product Import**, **Stock Import**, **Warehouse Import**
- File formats supported: `.csv`, `.xlsx`, `.xls` (max 10 MB)
- Header normalization handles case differences and spaces in column names
- **Upsert logic**: updates existing records (by SKU/name); creates if not found
- Product import also upserts associated `ReorderRule` records
- Stock import creates `AuditLog` entries per row
- Each row is processed in its own Sequelize transaction — one failed row does not block others
- Progress tracked incrementally in the `import_jobs` table
- Row-level error logging stored as JSON in the database
- **Frontend drag-and-drop upload UI**
- Real-time progress polling (every 2 seconds while job is running)
- Downloadable CSV templates for each import type
- Import job history showing last 20 jobs with expandable error logs
- Error report download as JSON

### ✅ Automation Dashboard
- View all reorder rules (product, warehouse, threshold, quantity, preferred supplier, active state)
- Create, update, and toggle reorder rules active/inactive
- View automation execution logs (job name, status, summary, records affected, duration, timestamp)
- Manually trigger any cron job on demand (admin only)
- Barcode scanner widget for quick scanning without leaving the dashboard
- Unrecognised scan resolution panel

### ✅ Cron Jobs / Background Automation (3 jobs)
- **Low Stock Checker** — every 30 minutes — auto-drafts purchase orders when stock hits threshold
- **Nightly Inventory Sync** — every night at 2 AM — recalculates stock values and status flags
- **Temp File Cleanup** — every night at 3 AM — clears uploaded import files older than 24 hours

Full details in the [Automation & Cron Jobs](#automation--cron-jobs) section.

### ✅ Dashboard & Reporting
- KPI cards: total products, total stock value, low stock count, pending purchase orders
- Warehouse stock bar chart (total stock per warehouse, powered by Recharts)
- Product category distribution pie chart
- Recent activity feed (last 5 audit log entries with user info)
- Low stock alerts table (top 5 items below reorder level)

### ✅ Audit Trail
- Full audit logging for all major actions: `create`, `update`, `delete`, `login`, `logout`, `barcode_scan`, purchase order actions (`CREATE`, `UPDATE`, `APPROVE`, `RECEIVE`, `CANCEL`), `REQUEST_FULFILLED`
- Every log stores: user ID, action type, table name, JSON diff of changes, timestamp, IP address

### ✅ Logging & Error Handling
- Winston logger writing to `/logs/combined.log` and `/logs/error.log`
- Global error handler middleware mapping Sequelize errors to proper HTTP responses
- Stack traces hidden in production
- Request/response logging middleware with method, path, status code, and response time

---

## Database Models & Relationships

### Models (14 total)

| Model | Table | Primary Key | Key Fields |
|-------|-------|-------------|------------|
| User | users | id | email, password (bcrypt), first_name, last_name, role, status |
| Warehouse | warehouses | warehouse_id | name, location, address, capacity, current_usage, manager_id |
| Product | products | product_id | sku (unique), name, category, unit, reorder_level, reorder_qty, unit_price, barcode |
| Inventory | inventory | id | product_id, warehouse_id, quantity, status, stock_value, batch_no, expiry_date, location |
| Supplier | suppliers | supplier_id | name, contact_person, email, phone, payment_terms, lead_time, rating, status |
| PurchaseOrder | purchase_orders | po_id | po_number, supplier_id, status, total_amount, created_by, auto_drafted, items (JSON) |
| SalesOrder | sales_orders | order_id | order_number, customer_name, status, total_amount, created_by |
| AuditLog | audit_logs | log_id | user_id, action, table_name, changes (JSON), timestamp, ip_address |
| ImportJob | import_jobs | id | job_type, file_name, status, total_rows, processed_rows, failed_rows, error_log |
| ReorderRule | reorder_rules | id | product_id (unique), warehouse_id, reorder_threshold, reorder_quantity, preferred_supplier_id, is_active, last_triggered_at |
| UserRequest | user_requests | id | request_number, requested_by, department, purpose, status, reviewed_by, review_notes, fulfilled_at |
| UserRequestItem | user_request_items | id | request_id, product_id, quantity_requested, quantity_fulfilled |
| BarcodeScanLog | barcode_scan_logs | id | barcode, product_id (nullable), warehouse_id, scan_type, quantity, scanned_by, processed |
| AutomationLog | automation_logs | id | job_name, status, summary, records_affected, duration_ms, ran_at |

### Relationships

```
User
 ├── hasMany Warehouse (as manager)
 ├── hasMany PurchaseOrder (created_by)
 ├── hasMany SalesOrder (created_by)
 ├── hasMany AuditLog
 ├── hasMany ImportJob
 ├── hasMany UserRequest (as requester)
 └── hasMany BarcodeScanLog

Warehouse
 ├── belongsTo User (manager)
 └── hasMany Inventory

Product
 ├── hasMany Inventory
 ├── hasOne ReorderRule
 ├── belongsToMany PurchaseOrder (through purchase_order_items)
 └── hasMany UserRequestItem

Inventory → belongsTo Product + Warehouse
Supplier → hasMany PurchaseOrder
PurchaseOrder → belongsTo Supplier + User
ReorderRule → belongsTo Product + Warehouse + Supplier (preferred)
UserRequest → belongsTo User (requester + reviewer), hasMany UserRequestItem
UserRequestItem → belongsTo UserRequest + Product
BarcodeScanLog → belongsTo Product (nullable) + Warehouse + User
```

---

## API Endpoints Reference

**Base URL:** `http://localhost:5000/api`  
All protected endpoints require: `Authorization: Bearer <token>`

### Auth `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register new user (default role: staff) |
| POST | `/login` | Public | Login — returns access + refresh tokens |
| POST | `/refresh-token` | Public | Get new access token using refresh token |
| GET | `/profile` | Auth | Get current user profile |
| POST | `/logout` | Auth | Logout |

### Products `/api/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Auth | Get all products (paginated, filterable) |
| GET | `/:id` | Auth | Get product by ID |
| POST | `/` | Admin, Manager | Create product |
| PUT | `/:id` | Admin, Manager | Update product |
| DELETE | `/:id` | Admin | Delete product |

### Warehouses `/api/warehouses`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Auth | Get all warehouses |
| GET | `/managers` | Auth | Get users eligible as managers |
| GET | `/:id` | Auth | Get warehouse by ID |
| GET | `/:id/capacity` | Auth | Get capacity usage % |
| POST | `/` | Admin | Create warehouse |
| PUT | `/:id` | Admin, Manager | Update warehouse |
| DELETE | `/:id` | Admin | Delete warehouse |

### Inventory `/api/inventory`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Auth | Get all inventory (filterable by warehouse/product) |
| GET | `/summary` | Auth | Inventory summary stats |
| GET | `/low-stock` | Auth | Items at or below reorder level |
| PUT | `/:id` | Admin, Manager | Update stock quantity |
| POST | `/transfer` | Admin, Manager | Transfer stock between warehouses |
| POST | `/adjust` | Admin, Manager | Manual inventory adjustment |

### Suppliers `/api/suppliers`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Auth | Get all suppliers |
| GET | `/:id` | Auth | Get supplier by ID |
| POST | `/` | Admin, Manager | Create supplier |
| PUT | `/:id` | Admin, Manager | Update supplier |
| PATCH | `/:id/rating` | Admin, Manager | Update supplier rating |
| DELETE | `/:id` | Admin | Delete supplier |

### Purchase Orders `/api/purchase-orders`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Auth | Get all POs (paginated, filterable by status) |
| GET | `/:id` | Auth | Get PO by ID |
| POST | `/` | Admin, Manager | Create PO |
| PUT | `/:id` | Admin, Manager | Update PO |
| PATCH | `/:id/approve` | Admin | Approve PO |
| POST | `/:id/receive` | Admin, Manager | Receive goods (increments inventory) |
| PATCH | `/:id/cancel` | Admin | Cancel PO |

### Reports `/api/reports`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | Auth | KPI stats + chart data + activity feed |

### Imports `/api/imports`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload` | Admin, Manager | Upload file and start import job |
| GET | `/` | Admin, Manager | Get import job history (last 20) |
| GET | `/:jobId` | Admin, Manager | Get import job status and progress |
| GET | `/template/:type` | Admin, Manager | Download CSV template (products / stock / warehouses) |

### Barcodes `/api/barcodes`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/scan` | Admin, Manager, Staff | Process a barcode scan |
| GET | `/lookup` | Auth | Lookup product + inventory by barcode |
| GET | `/history` | Admin, Manager | Paginated scan history with filters |
| GET | `/unrecognised` | Admin, Manager | List unmatched scan logs |
| PATCH | `/:scanId/link` | Admin, Manager | Link unrecognised scan to a product |

### Automation `/api/automation`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/logs` | Admin | Paginated automation execution logs |
| GET | `/reorder-rules` | Admin, Manager | Get all reorder rules |
| POST | `/reorder-rules` | Admin, Manager | Create a reorder rule |
| PUT | `/reorder-rules/:id` | Admin, Manager | Update a reorder rule |
| PATCH | `/reorder-rules/:id/toggle` | Admin, Manager | Toggle rule active/inactive |
| POST | `/trigger/:jobName` | Admin | Manually trigger a cron job |

### User Requests `/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/catalog` | All Auth | Product catalog for requesters |
| POST | `/requests` | User, Staff | Submit a new request |
| GET | `/requests/my` | User, Staff | Get own request history |
| GET | `/requests` | Admin, Manager | Get all requests |
| GET | `/requests/:id` | All Auth | Get request by ID |
| PATCH | `/requests/:id/cancel` | User, Staff | Cancel own request |
| PATCH | `/requests/:id/approve` | Admin, Manager | Approve request |
| PATCH | `/requests/:id/reject` | Admin, Manager | Reject request with notes |
| PATCH | `/requests/:id/fulfill` | Admin, Manager | Fulfill request (reduces inventory) |

---

## Role-Based Access Control

| Feature | admin | manager | staff | user |
|---------|:-----:|:-------:|:-----:|:----:|
| View products / inventory / warehouses | ✅ | ✅ | ✅ | catalog only |
| Create / edit products | ✅ | ✅ | ❌ | ❌ |
| Delete products | ✅ | ❌ | ❌ | ❌ |
| Manage purchase orders | ✅ | ✅ | view | ❌ |
| Approve / cancel POs | ✅ | ❌ | ❌ | ❌ |
| Manage suppliers | ✅ | ✅ | view | ❌ |
| Manage warehouses | ✅ | ✅ | view | ❌ |
| Delete warehouses | ✅ | ❌ | ❌ | ❌ |
| Import Center | ✅ | ✅ | ❌ | ❌ |
| View automation logs / reorder rules | ✅ | ✅ | ❌ | ❌ |
| Manage reorder rules | ✅ | ✅ | ❌ | ❌ |
| Manually trigger cron jobs | ✅ | ❌ | ❌ | ❌ |
| Barcode scan | ✅ | ✅ | ✅ | ❌ |
| Link unrecognised barcodes | ✅ | ✅ | ❌ | ❌ |
| Submit requests | ❌ | ❌ | ✅ | ✅ |
| Approve / fulfill requests | ✅ | ✅ | ❌ | ❌ |
| View dashboard | ✅ | ✅ | ✅ | user dashboard |

---

## Automation & Cron Jobs

Three jobs are registered at server startup via `initCronJobs()` in `cronService.js`.

### Job 1 — Low Stock Checker
- **Schedule:** Every 30 minutes (`*/30 * * * *`)
- **What it does:**
  1. Queries all active `ReorderRule` records
  2. For each rule, checks inventory quantity vs. `reorder_threshold`
  3. If stock ≤ threshold AND no open auto-drafted PO already exists for that product:
     - Generates a new PO number (`PO-YYYYMMDD-XXXX`)
     - Creates a `PurchaseOrder` with `auto_drafted = true` and `status = pending`
     - Uses the rule's `preferred_supplier_id` (falls back to first active supplier)
     - Updates `last_triggered_at` on the rule
     - Logs a notification for all admin users
  4. Writes result to `AutomationLog`

### Job 2 — Nightly Inventory Sync
- **Schedule:** Every night at 2 AM (`0 2 * * *`)
- **What it does:**
  1. Loads all inventory records with their associated products
  2. Recalculates `stock_value` = quantity × unit_price for every record
  3. Updates status: `out_of_stock` (qty = 0), `low_stock` (0 < qty ≤ reorder_level), or `available`
  4. Computes a snapshot summary (total value, low stock count, out of stock count, warehouses)
  5. Sends a summary notification to all admin users
  6. Writes result to `AutomationLog`

### Job 3 — Cleanup Temp Files
- **Schedule:** Every night at 3 AM (`0 3 * * *`)
- **What it does:**
  1. Scans `src/uploads/imports/` directory
  2. Deletes any file older than 24 hours
  3. Writes result to `AutomationLog`

All three jobs can also be triggered manually via `POST /api/automation/trigger/:jobName` (admin only). Job names: `low_stock_checker`, `nightly_sync`, `cleanup_temp_files`.

---

## Frontend Pages & Routes

### Public Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | LandingPage | Marketing landing page |
| `/login` | Login | Login form |
| `/register` | Register | Registration form |

### Admin / Manager / Staff Routes (MainLayout with sidebar)

| Route | Page | Roles | Description |
|-------|------|-------|-------------|
| `/dashboard` | Dashboard | admin, manager, staff | KPI cards, charts, low stock table, activity feed |
| `/products` | Products | admin, manager, staff | Product CRUD table |
| `/inventory` | Inventory | admin, manager, staff | Stock management across all warehouses |
| `/warehouses` | Warehouses | admin, manager, staff | Warehouse CRUD + capacity tracking |
| `/suppliers` | Suppliers | admin, manager, staff | Supplier management |
| `/purchase-orders` | PurchaseOrders | admin, manager, staff | Full PO lifecycle management |
| `/sales-orders` | SalesOrders | admin, manager, staff | Sales order management |
| `/reports` | Reports | admin, manager, staff | **Placeholder** — not yet implemented |
| `/settings` | Settings | admin, manager, staff | **Placeholder** — not yet implemented |
| `/requests` | RequestsManagement | admin, manager | Review, approve, reject, fulfill user requests |
| `/import-center` | ImportCenter | admin, manager | Bulk import with drag-drop, templates, progress, history |
| `/automation` | AutomationDashboard | admin, manager | Cron logs, reorder rules, barcode scanner, unrecognised scans |

### User Requester Routes (UserLayout)

| Route | Page | Roles | Description |
|-------|------|-------|-------------|
| `/user-dashboard` | UserDashboard | user, staff | Overview for requester role |
| `/user/catalog` | Catalog | user, staff | Browse products and add to a request |
| `/user/my-requests` | MyRequests | user, staff | View own request history and statuses |

### Key Frontend Components

- **Sidebar** — collapsible navigation; role-aware (hides Import Center, Automation, Requests for staff); shows live pending request badge (polls every 30 seconds)
- **ProtectedRoute** — wraps every route; checks role; redirects unauthorized users
- **MainLayout / UserLayout** — layout shells for admin and user portals respectively
- **Toast / ToastContext** — global toast system; triggered by Axios interceptors and components via custom DOM events
- **Redux authSlice** — manages login/logout state; persists to and restores from localStorage

---

## Known Gaps & Placeholders

| Area | Status | Notes |
|------|--------|-------|
| Reports page | Placeholder | Dashboard API exists; dedicated sales/inventory reports not built yet |
| Settings page | Placeholder | Page exists but has no functionality |
| Email notifications | Configured, not wired | nodemailer is installed and SMTP is configured in `.env`; NotificationService currently only logs via Winston — no emails are actually sent |
| Docker | Partially ready | `docker-compose.yml` exists but MySQL service is commented out; app runs on local MySQL |
| Sales Orders backend route | Needs verification | `SalesOrder` model and frontend page exist; confirm `/api/sales-orders` route is fully wired |
| User `full_name` field | Minor bug | Report controller references `user.full_name` but User model stores `first_name` + `last_name` separately |
| Data export | Not built | No CSV/Excel export of existing data; only import templates are downloadable |
| Test suite | Scaffold only | Jest + Supertest are installed; no test files found |

---

## Running the Project

### Prerequisites
- Node.js 16+
- MySQL 5.7+ running locally
- A database named `sims_db` created in MySQL

### Backend

```bash
cd sims-backend

# Install dependencies
npm install

# Run database migrations
npx sequelize-cli db:migrate

# (Optional) Seed sample data
npx sequelize-cli db:seed:all

# Start development server (port 5000, hot reload)
npm run dev
```

### Frontend

```bash
cd sims-frontend

# Install dependencies
npm install

# Start development server (port 5173)
npm run dev
```

### Environment Variables

**`sims-backend/.env`**
```
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sims_db
DB_USER=root
DB_PASSWORD=<your_mysql_password>
JWT_SECRET=<your_jwt_secret>
JWT_REFRESH_SECRET=<your_refresh_secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your_gmail>
SMTP_PASS=<your_app_password>
EMAIL_FROM=noreply@sims.com
CORS_ORIGIN=http://localhost:5173
```

**`sims-frontend/.env`**
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### Test Credentials (from seeders)

| Email | Password | Role |
|-------|----------|------|
| admin@sims.com | password123 | admin |
| manager@sims.com | password123 | manager |
| staff1@sims.com | password123 | staff |

---

*This document was auto-generated by analyzing the full SIMS codebase on June 10, 2026.*
