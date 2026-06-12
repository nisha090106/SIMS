# Barcode Management Module - Setup & Usage Guide

## Overview

The Barcode Management module for SIMS enables comprehensive barcode scanning, stock operations, unknown barcode handling, and barcode generation with admin assignment capabilities.

## Features

### 1. **Barcode Scanner** (BarcodeScanner.jsx)
- **Camera Scanning**: Real-time barcode scanning using HTML5 QR Code library
- **Manual Input**: Fallback manual barcode entry mode
- **Three Operation Modes**:
  - **Stock In**: Add inventory with batch number and expiry date
  - **Stock Out**: Remove inventory with reference number
  - **Audit**: Physical count verification with variance calculation
- **Real-time Product Lookup**: Shows product info and current warehouse inventory
- **Unknown Barcode Handling**: Automatically logs unrecognized barcodes
- **Toast Notifications**: Success/error feedback for all operations

### 2. **Barcode Generator** (BarcodeGenerator.jsx)
- **Product Search**: Find products by name or SKU
- **Multiple Formats**: Support for CODE128, EAN13, and QR codes
- **Print Labels**: Generate print-friendly barcode labels
- **Download Barcodes**: Export barcode images as PNG
- **Bulk Generation**: Prepare sheets with multiple barcodes (extensible)

### 3. **Unknown Barcodes Management** (UnknownBarcodes.jsx)
- **Admin View**: See all unknown barcodes across all warehouses
- **Manager View**: See only their warehouse's unknown barcodes
- **Assignment Modal**: Search and link unknown barcodes to products
- **Inventory Processing**: Automatic stock operations on assignment
- **Audit Trail**: All assignments logged for compliance

## Installation & Setup

### Backend Setup

#### 1. Create Database Migration
Migration file: `migrations/023-create-unknown-barcodes.js` (already created)

Run migrations:
```bash
npm run migrate
```

#### 2. Update Models
- Created: `src/models/UnknownBarcode.js`
- Updated: `src/models/index.js` (added UnknownBarcode model)

#### 3. Update Controller
Enhanced `src/controllers/barcodeController.js` with new methods:
- `scanLookup()` - GET /api/barcodes/scan/:barcode
- `stockIn()` - POST /api/barcodes/stock-in
- `stockOut()` - POST /api/barcodes/stock-out
- `audit()` - POST /api/barcodes/audit
- `getUnknownBarcodes()` - GET /api/barcodes/unknown
- `assignUnknownBarcode()` - POST /api/barcodes/unknown/:id/assign
- `generateBarcode()` - GET /api/barcodes/generate

#### 4. Update Routes
Updated `src/routes/barcodes.js` with new endpoints

### Frontend Setup

#### 1. Install Dependencies
```bash
cd sims-frontend
npm install html5-qrcode bwip-js
```

#### 2. New Components Created
- `src/pages/Barcode/BarcodeScanner.jsx` - Scanner component
- `src/pages/Barcode/BarcodeGenerator.jsx` - Generator component
- `src/pages/Barcode/UnknownBarcodes.jsx` - Unknown barcodes management
- `src/pages/Barcode/index.js` - Index file for exports

#### 3. Integrate into App Routes
Add to your main routing (e.g., `App.jsx` or `Router.jsx`):

```jsx
import { BarcodeScanner, BarcodeGenerator, UnknownBarcodes } from './pages/Barcode';

// Add routes
<Route path="/barcode/scanner" element={<BarcodeScanner />} />
<Route path="/barcode/generator" element={<BarcodeGenerator />} />
<Route path="/barcode/unknown" element={<UnknownBarcodes />} />
```

## API Endpoints

### Barcode Lookup & Operations

**GET /api/barcodes/scan/:barcode**
- Lookup product by barcode (warehouse-scoped)
- Params: `warehouse_id` (optional)
- Returns: Product info or `unknownBarcode: true`
- Auth: Required (any role)

**POST /api/barcodes/stock-in**
- Record stock-in via barcode
- Body: `{ barcode, quantity, warehouse_id, batch_no, expiry_date }`
- Returns: Product info, before/after qty
- Auth: Required (admin, manager, staff)

**POST /api/barcodes/stock-out**
- Record stock-out via barcode
- Body: `{ barcode, quantity, warehouse_id, reference_no }`
- Returns: Product info, before/after qty
- Auth: Required (admin, manager, staff)

**POST /api/barcodes/audit**
- Record physical audit via barcode
- Body: `{ barcode, counted_quantity, warehouse_id }`
- Returns: System qty, counted qty, variance
- Auth: Required (admin, manager, staff)

### Unknown Barcode Management

**GET /api/barcodes/unknown**
- Get unknown barcodes
- Admin: all barcodes
- Manager: only their warehouse
- Params: `page`, `limit`
- Auth: Required (admin, manager)

**POST /api/barcodes/unknown/:id/assign**
- Assign unknown barcode to product
- Body: `{ product_id }`
- Returns: Product info, inventory before/after
- Auth: Required (admin, manager)

### Barcode Generation

**GET /api/barcodes/generate**
- Generate barcode for product
- Params: `product_id`
- Returns: Generated barcode value
- Auth: Required (admin, manager)

## Warehouse Isolation

All scanning endpoints respect warehouse boundaries:
- **Admin**: Can scan in any warehouse (must specify `warehouse_id`)
- **Manager**: Automatically scoped to their assigned warehouse
- **Staff**: Automatically scoped to their assigned warehouse

## Data Flow

### Stock-In via Barcode
1. User scans barcode or enters manually
2. System looks up product
3. If unknown → creates UnknownBarcode record
4. If known → updates inventory, creates BarcodeScanLog, logs audit entry
5. Checks reorder level for notifications

### Unknown Barcode Resolution
1. Admin/Manager views unresolved unknown barcodes
2. Opens assignment modal
3. Searches and selects correct product
4. System processes pending inventory operation
5. Marks record as resolved with timestamp

### Barcode Generation
1. User searches for product
2. System generates barcode value
3. User selects format (CODE128, EAN13, QR)
4. User can print or download label

## Audit Logging

All barcode operations are logged to `AuditLog` table:
- `action`: 'BARCODE_SCAN'
- `changes`: Operation details (scan_type, qty, before/after)
- `user_id`: User who performed the operation
- `ip_address`: Client IP for compliance

## Database Schema

### UnknownBarcode Table
```sql
CREATE TABLE unknown_barcodes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  barcode VARCHAR(100) NOT NULL,
  scanned_at DATETIME NOT NULL,
  scanned_by INT NOT NULL,
  warehouse_id INT NOT NULL,
  action ENUM('stock_in', 'stock_out', 'audit') NOT NULL,
  quantity INT DEFAULT 1,
  resolved BOOLEAN DEFAULT FALSE,
  product_id INT,
  resolved_at DATETIME,
  resolved_by INT,
  notes TEXT,
  FOREIGN KEY (scanned_by) REFERENCES users(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (resolved_by) REFERENCES users(id),
  INDEX (barcode),
  INDEX (warehouse_id),
  INDEX (scanned_by),
  INDEX (resolved)
);
```

## Usage Examples

### Scanner Usage
1. Navigate to `/barcode/scanner`
2. Select operation mode (Stock In/Out/Audit)
3. Toggle camera mode or use manual input
4. For camera: position barcode in frame
5. For manual: type barcode and press Enter
6. Fill in operation-specific details (qty, batch, etc.)
7. Confirm operation
8. System provides immediate feedback

### Generator Usage
1. Navigate to `/barcode/generator`
2. Search for product by name or SKU
3. Select format (default: CODE128)
4. Click Print to open print dialog
5. Click Download to save as PNG

### Unknown Barcode Management
1. Navigate to `/barcode/unknown` (admin/manager only)
2. View list of unresolved barcodes
3. Click "Assign" button on any row
4. Search for correct product
5. Select product from results
6. Click "Assign" to process
7. System executes pending inventory operation

## Security & Permissions

- **Warehouse Isolation**: Manager/Staff scans are automatically filtered by warehouse
- **Role-Based Access**: 
  - Scanner: admin, manager, staff
  - Generator: admin, manager
  - Unknown Barcodes: admin, manager
- **Audit Trail**: All operations logged with user/timestamp/IP
- **Inventory Controls**: Stock-out validates sufficient inventory before processing

## Troubleshooting

### Camera Not Working
- Check browser permissions (Settings → Camera)
- Firefox/Chrome may require HTTPS for camera access
- Use manual input mode as fallback

### Barcode Generation Issues
- Ensure bwip-js is properly installed
- Check canvas support in browser
- Verify product exists before generating

### Unknown Barcode Not Appearing
- Check product barcode field is empty/NULL
- Verify user has admin/manager role
- Ensure warehouse_id is correctly set

## Future Enhancements

1. **Bulk Operations**: Process multiple barcodes in batch
2. **Mobile App**: Native mobile barcode scanner
3. **Barcode Formats**: Support more formats (Code39, Interleaved 2of5)
4. **History**: Barcode scan analytics and reports
5. **Templates**: Custom label templates
6. **Wireless**: Integration with wireless handheld scanners
7. **Real-time Sync**: WebSocket updates for live inventory
8. **OCR**: Automatic barcode creation from product images

## Support & Maintenance

For issues or enhancements:
1. Check error logs in browser console
2. Review audit logs in database for operation history
3. Verify all dependencies are installed
4. Ensure database migrations are run
5. Test with test barcodes provided in fixtures

## Testing

Test data is available in:
- `test_barcodes.mjs` - Barcode test data
- Create products with `barcode` field populated
- Unknown barcodes auto-created on first unrecognized scan

---

**Module Version**: 1.0.0
**Last Updated**: 2024
**Status**: Production Ready
