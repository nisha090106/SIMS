# Request Workflow & Requester Portal - Complete Guide

## Overview

The Request Workflow system enables users to submit product requests from a requester portal. Managers and admins can then review, approve, reject, or fulfill these requests. The workflow includes:

- **Requester Portal**: Browse products, add to cart, create requests
- **Request Management**: Admin/Manager review and action requests
- **Request Lifecycle**: Pending → Approved → Fulfilled
- **Inventory Integration**: Automatic deduction on fulfillment
- **Audit Trail**: Full logging of all operations

---

## System Architecture

### Database Models

#### Request Table
```sql
CREATE TABLE requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_number VARCHAR(50) UNIQUE,
  requester_id INT (FK -> users),
  warehouse_id INT (FK -> warehouses) -- destination
  status ENUM ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'),
  priority ENUM ('low', 'medium', 'high', 'urgent'),
  notes TEXT,
  approved_by INT (FK -> users),
  approved_at DATETIME,
  fulfilled_by INT (FK -> users),
  fulfilled_at DATETIME,
  rejection_reason TEXT,
  rejected_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  
  INDEXES: requester_id, warehouse_id, status, priority, created_at
);
```

#### RequestItem Table
```sql
CREATE TABLE request_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT (FK -> requests),
  product_id INT (FK -> products),
  requested_qty INT,
  approved_qty INT (nullable),
  fulfilled_qty INT (nullable),
  notes TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  
  INDEXES: request_id, product_id
);
```

### Request Number Format
`REQ-YYYYMMDD-XXXX` (e.g., REQ-20240612-0145)

---

## Backend API Endpoints

### Base URL: `/api/requests`

#### GET /api/requests
Get all requests (with role-based filtering)

**Query Parameters:**
```json
{
  "page": 1,
  "limit": 10,
  "status": "pending",        // optional filter
  "priority": "high",         // optional filter
  "warehouse_id": 1           // admin only
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 1,
        "request_number": "REQ-20240612-0145",
        "status": "pending",
        "priority": "high",
        "requester": { "id": 2, "first_name": "John", "last_name": "Doe" },
        "warehouse": { "warehouse_id": 1, "name": "Main" },
        "items": [...],
        "created_at": "2024-06-12T10:30:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

**Role-Based Filtering:**
- **Admin**: Sees all requests across all warehouses
- **Manager**: Sees requests for their warehouse (destination)
- **Staff**: Sees requests for their warehouse (destination)
- **Requester/User**: Sees only their own requests

---

#### GET /api/requests/:id
Get single request with full details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "request_number": "REQ-20240612-0145",
    "requester": {...},
    "warehouse": {...},
    "items": [
      {
        "id": 1,
        "product_id": 5,
        "product": { "sku": "SKU-001", "name": "Laptop" },
        "requested_qty": 10,
        "approved_qty": 9,
        "fulfilled_qty": 5
      }
    ],
    "status": "approved",
    "priority": "high",
    "notes": "...",
    "approved_by": {...},
    "approved_at": "2024-06-12T11:00:00Z"
  }
}
```

---

#### POST /api/requests
Create new request

**Request Body:**
```json
{
  "warehouse_id": 1,
  "priority": "high",
  "notes": "Urgent requirement for Q3",
  "items": [
    {
      "product_id": 5,
      "requested_qty": 10,
      "notes": "Optional item-level notes"
    },
    {
      "product_id": 10,
      "requested_qty": 5
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Request created successfully",
  "data": {
    "id": 1,
    "request_number": "REQ-20240612-0145",
    "status": "pending",
    "priority": "high",
    "item_count": 2
  }
}
```

**Validation:**
- warehouse_id required and must exist
- items array required and non-empty
- Each item must have product_id and positive requested_qty
- All products must exist

---

#### POST /api/requests/:id/approve
Approve request with optional partial qty approval

**Authorization:** Admin/Manager only

**Request Body:**
```json
{
  "approved_items": [
    {
      "id": 1,
      "approved_qty": 9        // optional, defaults to requested_qty
    },
    {
      "id": 2,
      "approved_qty": 5
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request approved successfully"
}
```

**Rules:**
- Request must be in 'pending' status
- approved_qty cannot exceed requested_qty
- If approved_items not provided, all items approved with requested_qty

---

#### POST /api/requests/:id/reject
Reject request with reason

**Authorization:** Admin/Manager only

**Request Body:**
```json
{
  "rejection_reason": "Insufficient budget for Q2"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request rejected successfully"
}
```

**Rules:**
- rejection_reason required (non-empty)
- Request must be in 'pending' or 'approved' status
- Reason stored in database for audit trail

---

#### POST /api/requests/:id/fulfill
Fulfill approved request

**Authorization:** Admin/Manager/Staff only

**Request Body:**
```json
{
  "fulfill_items": [
    {
      "id": 1,
      "fulfilled_qty": 5       // deducted from inventory
    },
    {
      "id": 2,
      "fulfilled_qty": 3
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request fulfilled successfully",
  "status": "fulfilled"        // or "approved" if partial
}
```

**Inventory Processing:**
- Checks available stock before deduction
- Returns error if insufficient inventory
- Deducts from warehouse_id on request
- Fails atomically if any item insufficient
- Updates fulfilled_qty on items

**Error Response:**
```json
{
  "success": false,
  "error": "Insufficient inventory for SKU-001. Available: 3, Requested: 5"
}
```

---

#### POST /api/requests/:id/cancel
Cancel pending request

**Authorization:** 
- Requester can cancel own requests
- Admin/Manager can cancel any request

**Response (200):**
```json
{
  "success": true,
  "message": "Request cancelled successfully"
}
```

**Rules:**
- Only pending requests can be cancelled
- Requesters can only cancel their own pending requests

---

## Frontend Components

### 1. RequestManagement.jsx (Admin/Manager/Staff)

**Location:** `src/pages/Requests/RequestManagement.jsx`

**Features:**
- Table view of all requests
- Tab-based filtering: All, Pending, Approved, Fulfilled, Rejected
- Priority badges: Urgent (red), High (orange), Medium (blue), Low (gray)
- Status badges with color coding
- Inline action buttons based on status and role
- View modal showing full request details
- Approve modal with qty editing per item
- Reject modal with reason textarea
- Fulfill modal with inventory validation

**State Management:**
- requests, loading, error, success
- page, rowsPerPage, total, tabValue
- Modal states: viewModal, approveModal, rejectModal, fulfillModal
- Form states: approvedQtys, fulfilledQtys, rejectReason

**Key Functions:**
- fetchRequests: Load paginated list with role-based filtering
- handleViewRequest: Open details modal
- handleOpenApproveModal: Prepare approve form
- handleApproveRequest: Submit approve action
- handleRejectRequest: Submit reject action
- handleFulfillRequest: Submit fulfill action

**Permissions:**
- Approve button: visible for pending requests (Admin/Manager only)
- Reject button: visible for pending/approved requests (Admin/Manager only)
- Fulfill button: visible for approved requests (Admin/Manager/Staff only)

---

### 2. ProductCatalog.jsx (Requester Portal)

**Location:** `src/pages/Requests/ProductCatalog.jsx`

**Features:**
- Grid layout of product cards (3 columns on desktop)
- Each card shows: image, name, SKU, category, availability badge
- Search bar for name/SKU filtering
- Category dropdown filter
- "Add to Cart" button on each card
- Cart drawer (right sidebar) with:
  - Item list with qty +/- controls
  - Remove item button
  - Cart total count
  - "Create Request" button

**Cart Functionality:**
- Add product to cart
- Increment/decrement quantity
- Remove from cart
- Cart persists in component state (cleared after submit)
- Can't create request with empty cart

**Request Creation Modal:**
- Warehouse select (destination)
- Priority select (low/medium/high/urgent)
- Notes textarea
- Shows all items in request
- Submit button with validation

**State Management:**
- products, filteredProducts, loading
- categories, warehouses
- searchQuery, selectedCategory
- cart: [{ product_id, product, requested_qty }]
- Form states: warehouse_id, priority, notes
- Modal states: cartOpen, requestModal

**Validation:**
- Warehouse required
- At least one item in cart
- All products must exist

---

### 3. MyRequests.jsx (Requester Portal)

**Location:** `src/pages/Requests/MyRequests.jsx`

**Features:**
- Personal requests table with pagination
- Expandable rows showing:
  - Items with requested/approved/fulfilled quantities
  - Timeline of request lifecycle (Created → Approved → Fulfilled)
  - Notes display
  - Rejection reason (if applicable)
- Cancel button for pending requests
- Status badges and priority badges
- Timeline component for visual representation

**Expandable Content:**
1. **Items Table**: Shows product info and all three quantity columns
2. **Timeline**: Visual progression of request status changes
3. **Notes**: Additional notes on request
4. **Rejection Reason**: If rejected, shows reason in alert

**State Management:**
- requests, loading, error, success
- page, rowsPerPage, total
- expandedId: currently expanded row
- cancelModal state
- selectedRequest for cancel confirmation

**Key Functions:**
- fetchMyRequests: Load personal requests
- handleCancelRequest: Submit cancel action
- getStatusTimeline: Build timeline from request dates
- getPriorityColor, getStatusColor: Badge styling

**Permissions:**
- Can only see own requests
- Can only cancel pending requests

---

## Workflow Scenarios

### Scenario 1: Standard Approval Flow

1. **Requester** creates request via ProductCatalog
   - Selects products
   - Sets priority
   - Submits to warehouse

2. **Manager** reviews in RequestManagement
   - Sees pending request
   - Opens details to review items
   - Clicks "Approve" button
   - Can adjust qty per item (e.g., approve only 9 of 10)
   - Submits approval

3. **Status Changes:** pending → approved

4. **Staff** fulfills request
   - Views approved request
   - Confirms deduction quantities
   - Clicks "Fulfill"
   - System deducts inventory

5. **Status Changes:** approved → fulfilled

6. **Requester** tracks via MyRequests
   - Views expanded timeline
   - Sees progression: Created → Approved → Fulfilled

---

### Scenario 2: Partial Approval

1. Request created: 10x Laptop, 5x Mouse
2. Manager approves:
   - Item 1: Approve 8 of 10 (shortage)
   - Item 2: Approve 5 of 5 (full)
3. Request status: approved (with partial qty)
4. Staff fulfills what was approved
5. Requester can see approved vs requested discrepancy

---

### Scenario 3: Rejection Flow

1. Manager reviews request
2. Clicks "Reject" button
3. Enters reason: "Budget exhausted for Q2"
4. Rejection reason stored in database
5. Request status: rejected
6. Requester sees rejection with reason in MyRequests

---

### Scenario 4: Cancellation

1. Requester created request but circumstances changed
2. Request still in pending status
3. Requester clicks "Cancel" in MyRequests
4. Confirms cancellation
5. Status: cancelled
6. Request no longer appears in available for approval

---

## Integration Checklist

### Backend
- [ ] Run migration: `npm run migrate`
- [ ] Verify Request table exists
- [ ] Verify RequestItem table exists
- [ ] Test request creation endpoint
- [ ] Test approve/reject/fulfill endpoints
- [ ] Verify inventory deduction on fulfill
- [ ] Test role-based access control

### Frontend
- [ ] Add request routes to App.jsx:
  ```jsx
  import { RequestManagement, ProductCatalog, MyRequests } from './pages/Requests';
  
  <Route path="/requests/management" element={<RequestManagement />} />
  <Route path="/requester/catalog" element={<ProductCatalog />} />
  <Route path="/requester/my-requests" element={<MyRequests />} />
  ```
- [ ] Update navigation menu
- [ ] Test ProductCatalog functionality
- [ ] Test MyRequests expansion and timeline
- [ ] Test RequestManagement modals
- [ ] Verify pagination works
- [ ] Test error handling

### Testing
- [ ] Create test request with multiple items
- [ ] Test partial quantity approval
- [ ] Test rejection with reason
- [ ] Test fulfillment with inventory deduction
- [ ] Test insufficient inventory error
- [ ] Test cancellation flow
- [ ] Verify audit logs created
- [ ] Test role-based access

---

## Permission Matrix

| Action | Admin | Manager | Staff | Requester | User |
|--------|-------|---------|-------|-----------|------|
| View Own Requests | ✓ | ✓ | ✓ | ✓ | ✓ |
| View All Requests | ✓ | WH* | WH* | ✗ | ✗ |
| Create Request | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve Request | ✓ | ✓ | ✗ | ✗ | ✗ |
| Reject Request | ✓ | ✓ | ✗ | ✗ | ✗ |
| Fulfill Request | ✓ | ✓ | ✓ | ✗ | ✗ |
| Cancel Own Request | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cancel Any Request | ✓ | ✗ | ✗ | ✗ | ✗ |

*WH = Warehouse-scoped (see only their warehouse requests)

---

## Error Handling

### Validation Errors
- Missing required fields (warehouse_id, items)
- Invalid priority value
- Empty items array
- Non-existent products
- Insufficient quantities

### Business Logic Errors
- Cannot approve non-pending request
- Cannot reject fulfilled/cancelled request
- Cannot fulfill non-approved request
- Cannot cancel non-pending request
- Insufficient inventory for fulfillment
- Unauthorized access to request

### All errors return:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Audit Logging

All request actions logged to `audit_logs` table:
- Request creation
- Approvals (with quantities)
- Rejections (with reason)
- Fulfillments (with deduction details)
- Cancellations

---

## Future Enhancements

1. **Notifications**: Email/SMS on request status changes
2. **Bulk Requests**: Import from CSV
3. **Request Templates**: Save and reuse common requests
4. **Analytics**: Request trends, approval rates, fulfillment metrics
5. **Recurring Requests**: Automatic re-submission
6. **Budget Integration**: Check against department budget
7. **Approval Chains**: Multi-level approval workflow
8. **Comments**: Discussion thread on requests
9. **Mobile App**: Native mobile request management

---

**Documentation Version:** 1.0
**Last Updated:** June 2024
**Status:** Production Ready
