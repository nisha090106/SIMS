# Request System API Reference

## Base URL
```
/api/requests
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer {token}
```

---

## Endpoints

### 1. List Requests

**Endpoint:** `GET /api/requests`

**Description:** Retrieve paginated list of requests with role-based filtering

**Query Parameters:**
```
page:        number (default: 1) - Page number for pagination
limit:       number (default: 10) - Records per page
status:      string (optional) - Filter by status: pending|approved|rejected|fulfilled|cancelled
priority:    string (optional) - Filter by priority: low|medium|high|urgent
warehouse_id: number (optional) - Admin only: filter by warehouse
```

**Authorization:**
- Admin: Can see all requests, optionally filter by warehouse_id
- Manager: Can see requests for their warehouse
- Staff: Can see requests for their warehouse
- Requester/User: Can see only their own requests

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/requests?page=1&limit=10&status=pending" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response (200):**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 1,
        "request_number": "REQ-20240612-0001",
        "requester": {
          "id": 2,
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@company.com"
        },
        "warehouse": {
          "warehouse_id": 1,
          "name": "Main Warehouse",
          "location": "New York"
        },
        "status": "pending",
        "priority": "high",
        "items": [
          {
            "id": 1,
            "request_id": 1,
            "product_id": 5,
            "product": {
              "product_id": 5,
              "sku": "SKU-001",
              "name": "Laptop",
              "category": "Electronics"
            },
            "requested_qty": 10,
            "approved_qty": null,
            "fulfilled_qty": null
          }
        ],
        "notes": "Urgent requirement for Q3 campaign",
        "approved_by": null,
        "approved_at": null,
        "fulfilled_by": null,
        "fulfilled_at": null,
        "rejection_reason": null,
        "rejected_at": null,
        "created_at": "2024-06-12T10:30:00.000Z",
        "updated_at": "2024-06-12T10:30:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

### 2. Get Request by ID

**Endpoint:** `GET /api/requests/:id`

**Description:** Retrieve full details of a specific request

**URL Parameters:**
```
id: number - Request ID
```

**Authorization:**
- Admin: Can view any request
- Manager: Can view requests in their warehouse
- Staff: Can view requests in their warehouse
- Requester/User: Can view only their own requests

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/requests/1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "request_number": "REQ-20240612-0001",
    "requester": {
      "id": 2,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@company.com",
      "department": "Sales"
    },
    "warehouse": {
      "warehouse_id": 1,
      "name": "Main Warehouse",
      "location": "New York",
      "manager_id": 3
    },
    "status": "pending",
    "priority": "high",
    "items": [
      {
        "id": 1,
        "request_id": 1,
        "product_id": 5,
        "product": {
          "product_id": 5,
          "sku": "SKU-001",
          "name": "Laptop Dell XPS 13",
          "category": "Electronics",
          "unit": "pieces",
          "image_url": "https://..."
        },
        "requested_qty": 10,
        "approved_qty": null,
        "fulfilled_qty": null,
        "notes": "High performance required"
      },
      {
        "id": 2,
        "request_id": 1,
        "product_id": 10,
        "product": {
          "product_id": 10,
          "sku": "SKU-010",
          "name": "USB-C Cable",
          "category": "Accessories"
        },
        "requested_qty": 20,
        "approved_qty": null,
        "fulfilled_qty": null,
        "notes": null
      }
    ],
    "notes": "Urgent requirement for Q3 campaign",
    "approved_by": null,
    "approved_at": null,
    "fulfilled_by": null,
    "fulfilled_at": null,
    "rejection_reason": null,
    "rejected_at": null,
    "created_at": "2024-06-12T10:30:00.000Z",
    "updated_at": "2024-06-12T10:30:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Request not found"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "Unauthorized to view this request"
}
```

---

### 3. Create Request

**Endpoint:** `POST /api/requests`

**Description:** Create a new inventory request

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
      "notes": "High performance required"
    },
    {
      "product_id": 10,
      "requested_qty": 20
    }
  ]
}
```

**Body Fields:**
```
warehouse_id: number (required) - Destination warehouse
priority:     string (required) - low|medium|high|urgent
notes:        string (optional) - Additional notes
items:        array (required) - At least 1 item
  - product_id: number (required) - Product to request
  - requested_qty: number (required) - Quantity (> 0)
  - notes: string (optional) - Item-specific notes
```

**Authorization:**
- All authenticated users can create requests

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/requests" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": 1,
    "priority": "high",
    "notes": "Q3 Campaign",
    "items": [{"product_id": 5, "requested_qty": 10}]
  }'
```

**Example Response (201):**
```json
{
  "success": true,
  "message": "Request created successfully",
  "data": {
    "id": 1,
    "request_number": "REQ-20240612-0001",
    "status": "pending",
    "priority": "high",
    "item_count": 2,
    "warehouse_id": 1,
    "requester_id": 2
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid warehouse ID"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Items array is required and must contain at least one item"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Product with ID 999 not found"
}
```

---

### 4. Approve Request

**Endpoint:** `POST /api/requests/:id/approve`

**Description:** Approve a pending request with optional partial quantity approval

**URL Parameters:**
```
id: number - Request ID
```

**Request Body:**
```json
{
  "approved_items": [
    {
      "id": 1,
      "approved_qty": 8
    },
    {
      "id": 2,
      "approved_qty": 20
    }
  ]
}
```

**Body Fields:**
```
approved_items: array (optional) - Item-level approvals
  - id: number (required) - RequestItem ID
  - approved_qty: number (required) - Approved quantity (≤ requested_qty)
```

**Note:** If `approved_items` is not provided or empty, all items are approved with their requested quantities.

**Authorization:**
- Admin: Can approve any request
- Manager: Can approve requests in their warehouse
- Staff: Cannot approve

**Validation Rules:**
- Request must be in 'pending' status
- approved_qty cannot exceed requested_qty
- Must provide valid RequestItem IDs
- Request must exist

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/requests/1/approve" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "approved_items": [
      {"id": 1, "approved_qty": 8},
      {"id": 2, "approved_qty": 20}
    ]
  }'
```

**Example Response (200):**
```json
{
  "success": true,
  "message": "Request approved successfully",
  "data": {
    "id": 1,
    "request_number": "REQ-20240612-0001",
    "status": "approved",
    "approved_at": "2024-06-12T11:00:00.000Z",
    "approved_by": 3,
    "approved_items": [
      {
        "id": 1,
        "requested_qty": 10,
        "approved_qty": 8
      },
      {
        "id": 2,
        "requested_qty": 20,
        "approved_qty": 20
      }
    ]
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Request is not in pending status"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Approved quantity (25) exceeds requested quantity (20) for item"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "You do not have permission to approve requests"
}
```

---

### 5. Reject Request

**Endpoint:** `POST /api/requests/:id/reject`

**Description:** Reject a request with reason

**URL Parameters:**
```
id: number - Request ID
```

**Request Body:**
```json
{
  "rejection_reason": "Insufficient budget for Q2"
}
```

**Body Fields:**
```
rejection_reason: string (required) - Reason for rejection (non-empty)
```

**Authorization:**
- Admin: Can reject any request
- Manager: Can reject requests in their warehouse
- Staff: Cannot reject

**Validation Rules:**
- Request must be in 'pending' or 'approved' status
- rejection_reason must be non-empty string
- Request must exist

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/requests/1/reject" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"rejection_reason": "Budget exhausted"}'
```

**Example Response (200):**
```json
{
  "success": true,
  "message": "Request rejected successfully",
  "data": {
    "id": 1,
    "request_number": "REQ-20240612-0001",
    "status": "rejected",
    "rejected_at": "2024-06-12T11:15:00.000Z",
    "rejection_reason": "Budget exhausted"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Rejection reason is required"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Cannot reject fulfilled or cancelled request"
}
```

---

### 6. Fulfill Request

**Endpoint:** `POST /api/requests/:id/fulfill`

**Description:** Fulfill approved request by deducting from inventory

**URL Parameters:**
```
id: number - Request ID
```

**Request Body:**
```json
{
  "fulfill_items": [
    {
      "id": 1,
      "fulfilled_qty": 8
    },
    {
      "id": 2,
      "fulfilled_qty": 20
    }
  ]
}
```

**Body Fields:**
```
fulfill_items: array (required) - Item fulfillment details
  - id: number (required) - RequestItem ID
  - fulfilled_qty: number (required) - Quantity to fulfill (≤ approved_qty)
```

**Authorization:**
- Admin: Can fulfill any request
- Manager: Can fulfill requests in their warehouse
- Staff: Can fulfill requests in their warehouse

**Validation Rules:**
- Request must be in 'approved' status
- fulfilled_qty cannot exceed approved_qty
- Sufficient inventory must exist at warehouse_id
- All items must be fulfillable or entire operation fails (atomic)

**Inventory Deduction:**
- Checks: `inventory.quantity >= fulfilled_qty` at warehouse
- Operation: Deducts from warehouse_id specified in request
- Failure: Returns error if insufficient stock
- Atomicity: Uses transaction - all items fulfill or none

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/requests/1/fulfill" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "fulfill_items": [
      {"id": 1, "fulfilled_qty": 8},
      {"id": 2, "fulfilled_qty": 20}
    ]
  }'
```

**Example Response (200):**
```json
{
  "success": true,
  "message": "Request fulfilled successfully",
  "data": {
    "id": 1,
    "request_number": "REQ-20240612-0001",
    "status": "fulfilled",
    "fulfilled_at": "2024-06-12T12:00:00.000Z",
    "fulfilled_by": 4,
    "fulfilled_items": [
      {
        "id": 1,
        "approved_qty": 8,
        "fulfilled_qty": 8
      },
      {
        "id": 2,
        "approved_qty": 20,
        "fulfilled_qty": 20
      }
    ]
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Request is not in approved status"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Insufficient inventory for SKU-001. Available: 5, Requested: 8"
}
```

**Error Response (422):**
```json
{
  "success": false,
  "error": "Fulfilled quantity (10) exceeds approved quantity (8) for item"
}
```

---

### 7. Cancel Request

**Endpoint:** `POST /api/requests/:id/cancel`

**Description:** Cancel a pending request

**URL Parameters:**
```
id: number - Request ID
```

**Request Body:**
```json
{}
```

**Authorization:**
- Admin: Can cancel any request
- Manager: Can cancel requests in their warehouse (own only)
- Staff: Can cancel requests in their warehouse (own only)
- Requester/User: Can cancel only their own pending requests

**Validation Rules:**
- Request must be in 'pending' status
- Non-admin users can only cancel own requests
- Request must exist

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/requests/1/cancel" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response (200):**
```json
{
  "success": true,
  "message": "Request cancelled successfully",
  "data": {
    "id": 1,
    "request_number": "REQ-20240612-0001",
    "status": "cancelled"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Only pending requests can be cancelled"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "You can only cancel your own requests"
}
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* operation-specific data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Request successful (GET, POST updates) |
| 201 | Resource created (POST creates) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (permission denied) |
| 404 | Not found (resource doesn't exist) |
| 422 | Unprocessable entity (business logic error) |
| 500 | Server error |

---

## Testing cURL Examples

### Create a request:
```bash
curl -X POST "http://localhost:3001/api/requests" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": 1,
    "priority": "high",
    "notes": "Test request",
    "items": [{"product_id": 5, "requested_qty": 10}]
  }'
```

### Get pending requests:
```bash
curl "http://localhost:3001/api/requests?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Approve request:
```bash
curl -X POST "http://localhost:3001/api/requests/1/approve" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approved_items": [{"id": 1, "approved_qty": 10}]
  }'
```

### Fulfill request:
```bash
curl -X POST "http://localhost:3001/api/requests/1/fulfill" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fulfill_items": [{"id": 1, "fulfilled_qty": 10}]
  }'
```

---

**Documentation Version:** 1.0
**Last Updated:** June 2024
**API Version:** v1
