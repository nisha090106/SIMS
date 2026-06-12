# Barcode API - Quick Reference & Examples

## Quick Start

### Backend Endpoints Summary
```
GET    /api/barcodes/scan/:barcode         Lookup barcode
POST   /api/barcodes/stock-in              Stock-in via barcode
POST   /api/barcodes/stock-out             Stock-out via barcode
POST   /api/barcodes/audit                 Record audit
GET    /api/barcodes/unknown               Get unknown barcodes
POST   /api/barcodes/unknown/:id/assign    Assign unknown barcode
GET    /api/barcodes/generate              Generate barcode
```

---

## API Request/Response Examples

### 1. Lookup Barcode
**Endpoint**: `GET /api/barcodes/scan/:barcode`

**Query Parameters**:
```json
{
  "warehouse_id": 1
}
```

**Success Response** (200):
```json
{
  "success": true,
  "product": {
    "product_id": 5,
    "sku": "SKU-001",
    "name": "Laptop",
    "barcode": "SIMS000005",
    "unit": "piece",
    "image_url": "https://example.com/laptop.jpg"
  },
  "inventory": {
    "current_qty": 15,
    "warehouse_id": 1
  }
}
```

**Unknown Barcode Response** (404):
```json
{
  "success": false,
  "unknownBarcode": true,
  "barcode": "UNKNOWN123",
  "message": "Barcode not recognized"
}
```

---

### 2. Stock-In via Barcode
**Endpoint**: `POST /api/barcodes/stock-in`

**Request Body**:
```json
{
  "barcode": "SIMS000005",
  "quantity": 10,
  "warehouse_id": 1,
  "batch_no": "BATCH-2024-001",
  "expiry_date": "2025-12-31"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Stock-in completed",
  "product": {
    "name": "Laptop",
    "sku": "SKU-001"
  },
  "before_qty": 15,
  "after_qty": 25
}
```

**Unknown Barcode Response** (404):
```json
{
  "success": false,
  "unknownBarcode": true
}
```

---

### 3. Stock-Out via Barcode
**Endpoint**: `POST /api/barcodes/stock-out`

**Request Body**:
```json
{
  "barcode": "SIMS000005",
  "quantity": 5,
  "warehouse_id": 1,
  "reference_no": "SO-2024-001"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Stock-out completed",
  "product": {
    "name": "Laptop",
    "sku": "SKU-001"
  },
  "before_qty": 25,
  "after_qty": 20
}
```

**Insufficient Stock Response** (400):
```json
{
  "success": false,
  "error": "Insufficient stock. Current: 25, Requested: 50"
}
```

---

### 4. Record Audit
**Endpoint**: `POST /api/barcodes/audit`

**Request Body**:
```json
{
  "barcode": "SIMS000005",
  "counted_quantity": 22,
  "warehouse_id": 1
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Audit recorded",
  "product": {
    "name": "Laptop",
    "sku": "SKU-001"
  },
  "system_qty": 20,
  "counted_qty": 22,
  "variance": 2
}
```

---

### 5. Get Unknown Barcodes
**Endpoint**: `GET /api/barcodes/unknown`

**Query Parameters**:
```json
{
  "page": 1,
  "limit": 10
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "unknownBarcodes": [
      {
        "id": 1,
        "barcode": "UNKNOWN123",
        "scanned_at": "2024-12-12T10:30:00Z",
        "scanned_by": 2,
        "warehouse_id": 1,
        "action": "stock_in",
        "quantity": 5,
        "resolved": false,
        "product_id": null,
        "scanner": {
          "id": 2,
          "email": "john@example.com",
          "first_name": "John",
          "last_name": "Doe"
        },
        "warehouse": {
          "warehouse_id": 1,
          "name": "Main Warehouse"
        }
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

---

### 6. Assign Unknown Barcode
**Endpoint**: `POST /api/barcodes/unknown/:id/assign`

**URL Parameter**:
```
:id = 1  (UnknownBarcode ID)
```

**Request Body**:
```json
{
  "product_id": 5
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Unknown barcode successfully assigned and processed",
  "product": {
    "product_id": 5,
    "sku": "SKU-001",
    "name": "Laptop"
  },
  "before_qty": 15,
  "after_qty": 20
}
```

**Already Resolved Response** (400):
```json
{
  "success": false,
  "error": "This barcode has already been resolved"
}
```

---

### 7. Generate Barcode
**Endpoint**: `GET /api/barcodes/generate`

**Query Parameters**:
```json
{
  "product_id": 5
}
```

**Success Response** (200):
```json
{
  "success": true,
  "product": {
    "product_id": 5,
    "sku": "SKU-001",
    "name": "Laptop"
  },
  "barcode": "SIMS000005",
  "message": "Barcode generated"
}
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Barcode, quantity, and warehouse_id are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Permission denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Client-Side Usage Examples

### JavaScript/React - Lookup Barcode
```javascript
const lookupBarcode = async (barcode, warehouseId) => {
  try {
    const response = await axios.get(`/api/barcodes/scan/${barcode}`, {
      params: { warehouse_id: warehouseId }
    });
    
    if (response.data.unknownBarcode) {
      console.log('Unknown barcode:', barcode);
    } else {
      console.log('Product:', response.data.product);
    }
  } catch (error) {
    console.error('Lookup failed:', error);
  }
};
```

### JavaScript/React - Stock-In
```javascript
const performStockIn = async (barcode, quantity, warehouseId) => {
  try {
    const response = await axios.post('/api/barcodes/stock-in', {
      barcode,
      quantity,
      warehouse_id: warehouseId,
      batch_no: 'BATCH-001',
      expiry_date: '2025-12-31'
    });
    
    console.log(`Stock updated: ${response.data.before_qty} → ${response.data.after_qty}`);
  } catch (error) {
    if (error.response?.data?.unknownBarcode) {
      console.log('Barcode not found in system');
    } else {
      console.error('Stock-in failed:', error.response?.data?.error);
    }
  }
};
```

### JavaScript/React - Assign Unknown Barcode
```javascript
const assignUnknownBarcode = async (unknownBarcodeId, productId) => {
  try {
    const response = await axios.post(
      `/api/barcodes/unknown/${unknownBarcodeId}/assign`,
      { product_id: productId }
    );
    
    console.log('Barcode assigned:', response.data.product.sku);
  } catch (error) {
    console.error('Assignment failed:', error.response?.data?.error);
  }
};
```

---

## Workflow Examples

### Complete Stock-In Workflow
```javascript
async function completeStockInWorkflow(barcode, qty, warehouseId) {
  // Step 1: Lookup barcode
  const lookup = await axios.get(`/api/barcodes/scan/${barcode}`, 
    { params: { warehouse_id: warehouseId } });
  
  if (lookup.data.unknownBarcode) {
    // Show UI to user to assign barcode first
    return { error: 'Unknown barcode. Please assign it first.' };
  }
  
  // Step 2: Record stock-in
  const stockIn = await axios.post('/api/barcodes/stock-in', {
    barcode,
    quantity: qty,
    warehouse_id: warehouseId,
    batch_no: 'BATCH-2024',
    expiry_date: '2025-12-31'
  });
  
  return {
    success: true,
    product: stockIn.data.product,
    after_qty: stockIn.data.after_qty
  };
}
```

### Complete Unknown Barcode Resolution Workflow
```javascript
async function resolveUnknownBarcode(unknownBarcodeId, productId) {
  try {
    // Step 1: Get unknown barcode details (from list already fetched)
    
    // Step 2: Assign to product
    const assign = await axios.post(
      `/api/barcodes/unknown/${unknownBarcodeId}/assign`,
      { product_id: productId }
    );
    
    // Step 3: Refresh unknown barcodes list
    const unknown = await axios.get('/api/barcodes/unknown');
    
    return {
      success: true,
      message: `Assigned to ${assign.data.product.sku}`,
      remainingUnknown: unknown.data.data.unknownBarcodes
    };
  } catch (error) {
    return { success: false, error: error.response?.data?.error };
  }
}
```

---

## Testing with cURL

### Lookup Barcode
```bash
curl -X GET "http://localhost:3000/api/barcodes/scan/SIMS000005?warehouse_id=1" \
  -H "Authorization: Bearer TOKEN"
```

### Stock-In
```bash
curl -X POST "http://localhost:3000/api/barcodes/stock-in" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "SIMS000005",
    "quantity": 10,
    "warehouse_id": 1,
    "batch_no": "BATCH-2024-001",
    "expiry_date": "2025-12-31"
  }'
```

### Get Unknown Barcodes
```bash
curl -X GET "http://localhost:3000/api/barcodes/unknown?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

### Assign Unknown Barcode
```bash
curl -X POST "http://localhost:3000/api/barcodes/unknown/1/assign" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 5}'
```

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success - Operation completed |
| 400 | Bad Request - Invalid input or insufficient stock |
| 401 | Unauthorized - Missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist or unknown barcode |
| 500 | Server Error - Internal error |

---

## Data Validation Rules

### Barcode
- Required: Yes
- Type: String
- Max Length: 100
- Rules: Trimmed before use

### Quantity
- Required: Yes
- Type: Integer
- Min: 1
- Rules: Must be positive for stock-in, must be available for stock-out

### Warehouse ID
- Required: Yes
- Type: Integer
- Rules: Must exist in database, auto-scoped for Manager/Staff

### Batch Number
- Required: No
- Type: String
- Used for: Stock-in tracking

### Expiry Date
- Required: No
- Type: Date (ISO 8601)
- Used for: Inventory tracking

---

## Performance Tips

1. **Limit Pagination**: Use reasonable limits (10-25 per page)
2. **Index Strategy**: Queries use indexed fields (barcode, warehouse_id, resolved)
3. **Caching**: Cache product lookups if performing many scans
4. **Batch Operations**: Group operations when possible
5. **Transaction Handling**: All operations are atomic

---

## Debugging Tips

1. Check browser console for client-side errors
2. Review server logs for backend errors
3. Verify authentication token is valid
4. Ensure warehouse_id matches user's warehouse
5. Check for duplicate barcodes in database
6. Verify product barcode field is populated

---

**API Version**: 1.0.0
**Last Updated**: 2024-12-12
