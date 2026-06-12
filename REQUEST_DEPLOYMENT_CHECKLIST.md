# Request System - Implementation & Deployment Checklist

## Phase 1: Backend Setup

### Database
- [ ] Run migration for requests table
  ```bash
  npm run migrate
  ```
- [ ] Verify migration executed successfully
  ```bash
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'your_db' 
  AND TABLE_NAME IN ('requests', 'request_items');
  ```
- [ ] Verify constraints and indexes:
  ```bash
  SHOW INDEXES FROM requests;
  SHOW INDEXES FROM request_items;
  ```

### Backend Code
- [ ] Verify Request model exists: `src/models/Request.js`
  - Status ENUM: pending, approved, rejected, fulfilled, cancelled
  - Priority ENUM: low, medium, high, urgent
  - request_number unique constraint
  
- [ ] Verify RequestItem model exists: `src/models/RequestItem.js`
  - Progressive qty tracking: requested_qty, approved_qty, fulfilled_qty
  
- [ ] Verify models/index.js includes:
  ```javascript
  import RequestModel from './Request.js';
  import RequestItemModel from './RequestItem.js';
  
  // ... initialization ...
  
  // Associations
  RequestModel.belongsTo(UserModel, { as: 'requester' });
  RequestModel.belongsTo(UserModel, { as: 'approver' });
  RequestModel.belongsTo(UserModel, { as: 'fulfiller' });
  RequestModel.belongsTo(WarehouseModel);
  RequestModel.hasMany(RequestItemModel);
  ```

- [ ] Verify requestController.js has all 7 methods:
  - generateRequestNumber()
  - createRequest(req, res, next)
  - getAllRequests(req, res, next)
  - getRequestById(req, res, next)
  - approveRequest(req, res, next)
  - rejectRequest(req, res, next)
  - fulfillRequest(req, res, next)
  - cancelRequest(req, res, next)

- [ ] Verify requestRoutes.js has all 7 endpoints:
  - GET /
  - GET /:id
  - POST /
  - POST /:id/approve
  - POST /:id/reject
  - POST /:id/fulfill
  - POST /:id/cancel

- [ ] Verify server.js includes:
  ```javascript
  import requestsRoutes from './routes/requestRoutes.js';
  // ... 
  app.use('/api/requests', requestsRoutes);
  ```

### Validation Tests
- [ ] POST /api/requests - Create request
  ```bash
  curl -X POST http://localhost:3001/api/requests \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "warehouse_id": 1,
      "priority": "high",
      "items": [{"product_id": 1, "requested_qty": 5}]
    }'
  ```
  Expected: 201 with request_number in response

- [ ] GET /api/requests - List requests
  ```bash
  curl http://localhost:3001/api/requests \
    -H "Authorization: Bearer TOKEN"
  ```
  Expected: 200 with requests array

- [ ] GET /api/requests/:id - Get single request
  ```bash
  curl http://localhost:3001/api/requests/1 \
    -H "Authorization: Bearer TOKEN"
  ```
  Expected: 200 with request details

---

## Phase 2: Frontend Setup

### Directory Structure
- [ ] Verify `/src/pages/Requests/` directory exists
- [ ] Verify the following files exist:
  - [ ] `RequestManagement.jsx`
  - [ ] `ProductCatalog.jsx`
  - [ ] `MyRequests.jsx`
  - [ ] `index.js`

### Component Verification

#### RequestManagement.jsx
- [ ] Table displays requests correctly
- [ ] Status filter tabs work (All, Pending, Approved, Fulfilled, Rejected)
- [ ] Priority badges show correct colors
- [ ] Action buttons appear based on:
  - Approve button: Only for pending requests + Admin/Manager role
  - Reject button: Only for pending/approved + Admin/Manager role
  - Fulfill button: Only for approved + Admin/Manager/Staff role
- [ ] View modal shows request details
- [ ] Approve modal allows qty editing
- [ ] Reject modal requires reason
- [ ] Fulfill modal shows approved quantities
- [ ] Pagination works correctly

#### ProductCatalog.jsx
- [ ] Products load and display in grid (3 columns)
- [ ] Product cards show: image, name, SKU, category, availability badge
- [ ] Search filters by name and SKU
- [ ] Category filter works
- [ ] "Add to Cart" button functional
- [ ] Cart drawer opens/closes
- [ ] Cart shows items with qty +/- controls
- [ ] Remove from cart works
- [ ] "Create Request" button opens modal
- [ ] Request modal requires warehouse selection
- [ ] Request submission creates new request
- [ ] After submit, redirects to /requester/my-requests
- [ ] Success message displays

#### MyRequests.jsx
- [ ] Personal requests display in table
- [ ] Request numbers, items count, priority, status show correctly
- [ ] Rows expand to show:
  - Items table with requested/approved/fulfilled quantities
  - Status timeline visualization
  - Request notes (if any)
  - Rejection reason (if rejected)
- [ ] Cancel button appears only for pending requests
- [ ] Cancel button triggers confirmation modal
- [ ] Pagination works correctly

### Route Integration

- [ ] App.jsx includes routes:
  ```javascript
  import { RequestManagement, ProductCatalog, MyRequests } 
    from './pages/Requests';
  
  <Route path="/requests/management" element={<RequestManagement />} />
  <Route path="/requester/catalog" element={<ProductCatalog />} />
  <Route path="/requester/my-requests" element={<MyRequests />} />
  ```

- [ ] Protected routes check role:
  ```javascript
  // RequestManagement only for admin/manager/staff
  // ProductCatalog and MyRequests for all authenticated users
  ```

### Navigation Menu
- [ ] Navigation sidebar/menu updated with:
  - [ ] "Request Management" link → /requests/management (for admin/manager/staff)
  - [ ] "Create Request" link → /requester/catalog (for all users)
  - [ ] "My Requests" link → /requester/my-requests (for all users)

### Dependency Verification
- [ ] `package.json` has required packages:
  - [ ] "@mui/material"
  - [ ] "axios"
  - [ ] "lucide-react"
  - [ ] React 18.2.0+

---

## Phase 3: Integration Testing

### Requester Flow
- [ ] Login as requester user
- [ ] Navigate to /requester/catalog
- [ ] Browse products
- [ ] Add products to cart
- [ ] Click "Create Request"
- [ ] Select warehouse
- [ ] Set priority
- [ ] Submit request
- [ ] See success message
- [ ] Redirect to /requester/my-requests
- [ ] See newly created request in list
- [ ] Expand row and verify timeline shows "Created"
- [ ] Can cancel request if pending

### Manager Approval Flow
- [ ] Login as manager
- [ ] Navigate to /requests/management
- [ ] See pending requests for their warehouse
- [ ] Click "View" to see details
- [ ] Click "Approve" button
- [ ] Can adjust quantities per item
- [ ] Submit approval
- [ ] See success message
- [ ] Table refreshes, request status changes to "approved"
- [ ] Back as requester, view request details
- [ ] Timeline shows "Approved" event
- [ ] See approved quantities

### Staff Fulfillment Flow
- [ ] Login as staff
- [ ] Navigate to /requests/management
- [ ] See approved requests
- [ ] Click "Fulfill" button
- [ ] Enter fulfilled quantities
- [ ] Submit fulfillment
- [ ] Success message appears
- [ ] Verify inventory was deducted:
  ```bash
  SELECT quantity FROM inventory 
  WHERE warehouse_id=1 AND product_id=1
  ```
- [ ] Request status changes to "fulfilled"
- [ ] Timeline shows "Fulfilled" event

### Rejection Flow
- [ ] Login as manager
- [ ] Navigate to /requests/management
- [ ] Click "Reject" on pending request
- [ ] Enter rejection reason
- [ ] Submit
- [ ] Success message
- [ ] Request status changes to "rejected"
- [ ] As requester, view request
- [ ] See rejection reason in expanded details

### Cancellation Flow
- [ ] As requester, create new request (leave pending)
- [ ] Navigate to /requester/my-requests
- [ ] Click "Cancel" on pending request
- [ ] Confirm cancellation
- [ ] Status changes to "cancelled"
- [ ] Cannot cancel non-pending requests

### Error Handling
- [ ] Try creating request without selecting warehouse
  - Expected: Error message
- [ ] Try creating request with empty cart
  - Expected: Error message
- [ ] Try approving with qty > requested
  - Expected: Error message
- [ ] Try fulfilling with insufficient inventory
  - Expected: Error message about stock
- [ ] Try accessing another user's request as requester
  - Expected: 403 error or hidden
- [ ] Try approving as staff (unauthorized role)
  - Expected: Approve button not visible

---

## Phase 4: Documentation & Deployment

### Documentation
- [ ] REQUEST_WORKFLOW_GUIDE.md created
  - [ ] Overview of request system
  - [ ] Database schema documented
  - [ ] API endpoints documented
  - [ ] Frontend components documented
  - [ ] Workflow scenarios covered
  - [ ] Permission matrix included

- [ ] REQUEST_API_REFERENCE.md created
  - [ ] All endpoints documented
  - [ ] Request/response examples for each
  - [ ] Error codes documented
  - [ ] cURL examples provided

- [ ] DEPLOYMENT_CHECKLIST.md created (this file)
  - [ ] Backend setup steps
  - [ ] Frontend setup steps
  - [ ] Integration testing scenarios
  - [ ] Deployment instructions

### Code Review Checklist
- [ ] No hardcoded values in components
- [ ] All API calls use proper error handling
- [ ] Authorization middleware properly applied
- [ ] Database constraints properly set
- [ ] Timestamps (created_at, updated_at) on all operations
- [ ] Audit logging implemented
- [ ] No SQL injection vulnerabilities
- [ ] No sensitive data in logs
- [ ] Component props properly typed/documented
- [ ] Responsive design tested on mobile

### Performance Checks
- [ ] Pagination working on large datasets
- [ ] API responses under 1 second
- [ ] No N+1 queries (use proper joins)
- [ ] Indexes on all foreign keys
- [ ] Database query optimization reviewed

---

## Phase 5: Deployment

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors in dev tools
- [ ] No warning messages in terminal
- [ ] Database backed up
- [ ] Code committed to version control
- [ ] Environment variables configured (.env)

### Deployment Steps
1. Pull latest code
   ```bash
   git pull origin main
   ```

2. Install backend dependencies
   ```bash
   cd sims-backend
   npm install
   ```

3. Run migrations
   ```bash
   npm run migrate
   ```

4. Start backend server
   ```bash
   npm start
   ```

5. Install frontend dependencies
   ```bash
   cd ../sims-frontend
   npm install
   ```

6. Build frontend
   ```bash
   npm run build
   ```

7. Start frontend (or deploy to hosting)
   ```bash
   npm run dev
   ```

### Verification Post-Deployment
- [ ] Backend server running without errors
- [ ] Frontend loads without 404s
- [ ] Can login successfully
- [ ] Request creation works end-to-end
- [ ] Request list loads for all roles
- [ ] Approval workflow works
- [ ] Inventory deduction on fulfillment verified
- [ ] No JavaScript console errors
- [ ] Database has request records
- [ ] Audit logs recorded

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor API response times
- [ ] Monitor database query performance
- [ ] Set up alerts for failures
- [ ] Review logs daily for first week

---

## Rollback Plan

If issues arise:

1. **Database Rollback:**
   ```bash
   npm run migrate:rollback
   npm run migrate
   ```

2. **Backend Rollback:**
   ```bash
   git revert HEAD
   npm start
   ```

3. **Frontend Rollback:**
   ```bash
   git revert HEAD
   npm run build
   ```

---

## Sign-Off Checklist

**Development Lead:** _______  Date: _______

**QA Lead:** _______  Date: _______

**DevOps/Deployment:** _______  Date: _______

**Product Manager:** _______  Date: _______

---

## Known Issues & Limitations

- None at deployment time

---

## Future Enhancements

1. **Email Notifications** - Send email on status changes
2. **Bulk Import** - Import requests from CSV
3. **Request Templates** - Save and reuse common requests
4. **Analytics Dashboard** - Request metrics and trends
5. **Approval Chains** - Multi-level approval workflow
6. **Budget Integration** - Check against department budget
7. **Mobile App** - Native mobile support
8. **Webhooks** - Third-party system integration
9. **Request Comments** - Discussion threads on requests
10. **Recurring Requests** - Auto-resubmit periodic requests

---

**Checklist Version:** 1.0
**Last Updated:** June 2024
**Status:** Ready for Deployment
