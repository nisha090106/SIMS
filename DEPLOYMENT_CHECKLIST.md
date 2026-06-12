# Barcode Management Module - Deployment Checklist

## Pre-Deployment Verification

### Backend Verification
- [ ] All backend files created:
  - [ ] `src/models/UnknownBarcode.js`
  - [ ] `migrations/023-create-unknown-barcodes.js`
  - [ ] Updated `src/models/index.js`
  - [ ] Updated `src/controllers/barcodeController.js`
  - [ ] Updated `src/routes/barcodes.js`

- [ ] Code syntax verified (no TypeScript/linting errors)
- [ ] Database connection string configured
- [ ] All environment variables set

### Frontend Verification
- [ ] All frontend files created:
  - [ ] `src/pages/Barcode/BarcodeScanner.jsx`
  - [ ] `src/pages/Barcode/BarcodeGenerator.jsx`
  - [ ] `src/pages/Barcode/UnknownBarcodes.jsx`
  - [ ] `src/pages/Barcode/index.js`

- [ ] Dependencies added to `package.json`:
  - [ ] `html5-qrcode@^2.3.4`
  - [ ] `bwip-js@^3.1.0`

- [ ] Code syntax verified (no ESLint errors)
- [ ] API endpoints configured (base URL, auth headers)

### Documentation Verification
- [ ] `BARCODE_MODULE_GUIDE.md` created
- [ ] `IMPLEMENTATION_SUMMARY.md` created
- [ ] `BARCODE_API_REFERENCE.md` created
- [ ] `DEPLOYMENT_CHECKLIST.md` created (this file)

---

## Deployment Steps

### Step 1: Backend Database Setup
```bash
# Navigate to backend directory
cd sims-backend

# Run database migration
npm run migrate

# Verify migration succeeded (check database)
# Command: SELECT * FROM unknown_barcodes LIMIT 1;
# Expected: Table exists (may be empty)
```

**Status**: ⏳ Pending

### Step 2: Backend Restart
```bash
# Stop backend service
npm stop

# Start backend service
npm start

# Verify backend running
# Check logs for "Server running on port 3000"
```

**Status**: ⏳ Pending

### Step 3: Frontend Dependency Installation
```bash
# Navigate to frontend directory
cd sims-frontend

# Install dependencies (if fresh deployment)
npm install

# OR update specific packages
npm install html5-qrcode bwip-js

# Verify installation
npm list html5-qrcode
npm list bwip-js
```

**Status**: ⏳ Pending

### Step 4: Frontend Build
```bash
# Build production version
npm run build

# Verify build succeeded
# Check dist/ directory exists with bundle files
```

**Status**: ⏳ Pending

### Step 5: Add Routes to App
Edit main routing file (e.g., `src/App.jsx` or `src/Router.jsx`):
```jsx
import { BarcodeScanner, BarcodeGenerator, UnknownBarcodes } from './pages/Barcode';

// In your route configuration:
<Route path="/barcode/scanner" element={<BarcodeScanner />} />
<Route path="/barcode/generator" element={<BarcodeGenerator />} />
<Route path="/barcode/unknown" element={<UnknownBarcodes />} />
```

**Status**: ⏳ Pending

### Step 6: Update Navigation Menu
Add links to barcode module in your navigation/sidebar:
- Icon/Link: "Barcode Scanner" → `/barcode/scanner` (all users)
- Icon/Link: "Barcode Generator" → `/barcode/generator` (admin/manager)
- Icon/Link: "Unknown Barcodes" → `/barcode/unknown` (admin/manager)

**Status**: ⏳ Pending

### Step 7: Frontend Restart
```bash
# Stop frontend development server
npm stop

# Start frontend development server
npm run dev

# OR for production:
# npm run build && npm start
```

**Status**: ⏳ Pending

---

## Post-Deployment Validation

### API Endpoint Testing
```bash
# Test 1: Lookup Barcode
curl -X GET "http://localhost:3000/api/barcodes/scan/SIMS000001?warehouse_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 200 OK or 404 with unknownBarcode flag

# Test 2: Generate Barcode
curl -X GET "http://localhost:3000/api/barcodes/generate?product_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 200 OK with barcode value

# Test 3: Get Unknown Barcodes
curl -X GET "http://localhost:3000/api/barcodes/unknown?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 200 OK with empty array or existing records
```

### Frontend Component Testing
- [ ] Navigate to `/barcode/scanner` - Page loads without errors
- [ ] Navigate to `/barcode/generator` - Page loads without errors
- [ ] Navigate to `/barcode/unknown` - Page loads without errors (admin/manager) or 403 (others)
- [ ] Check browser console - No errors or warnings

### Functionality Testing
- [ ] **Scanner**: Manual input works, lookup works
- [ ] **Generator**: Product search works, barcode generation works
- [ ] **Unknown Barcodes**: List loads, pagination works, modal opens
- [ ] **Warehouse Isolation**: Manager sees only their warehouse
- [ ] **Role-Based Access**: Staff cannot see unknown barcodes page

### Browser Compatibility
- [ ] Chrome/Edge - Working
- [ ] Firefox - Working (if using camera, may need HTTPS)
- [ ] Safari - Working
- [ ] Mobile browsers - Responsive design works

---

## Database Verification

### Check Unknown Barcodes Table
```sql
-- Verify table structure
SHOW COLUMNS FROM unknown_barcodes;

-- Check indexes
SHOW INDEX FROM unknown_barcodes;

-- Count records
SELECT COUNT(*) FROM unknown_barcodes;

-- View sample record
SELECT * FROM unknown_barcodes LIMIT 1;
```

**Expected Output**:
- Table with all columns as defined
- Indexes on: barcode, warehouse_id, scanned_by, resolved
- Initially: 0 or small number of records

### Check Audit Logs
```sql
-- Verify barcode operations logged
SELECT * FROM audit_logs 
WHERE action = 'BARCODE_SCAN' 
ORDER BY timestamp DESC 
LIMIT 10;
```

**Expected Output**:
- Recent BARCODE_SCAN entries after operations

---

## Performance Baseline

### Expected Performance
- Barcode lookup: < 100ms
- Stock operation: < 500ms
- Unknown barcode list: < 1s (page of 10)
- Barcode generation: < 50ms

### Monitor These Metrics
- Database query times
- API response times
- Frontend component load times
- Network waterfall (images, scripts)

---

## Security Checklist

- [ ] All endpoints require authentication
- [ ] Role-based access control enforced:
  - [ ] Scanner: admin, manager, staff
  - [ ] Generator: admin, manager
  - [ ] Unknown Barcodes: admin, manager
- [ ] Warehouse isolation working:
  - [ ] Manager/Staff operations scoped to warehouse_id
  - [ ] Admin can specify any warehouse_id
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Sequelize ORM)
- [ ] CSRF protection (if applicable)
- [ ] Rate limiting on endpoints (if configured)

---

## Rollback Plan

If issues occur, follow these steps:

### Backend Rollback
```bash
# 1. Undo database migration
npm run migrate:undo

# 2. Restore previous barcodeController.js
# 3. Restore previous routes/barcodes.js
# 4. Restart backend
npm start
```

### Frontend Rollback
```bash
# 1. Revert App.jsx routes
# 2. Remove barcode components
# 3. Revert package.json
# 4. npm install
# 5. npm run dev
```

---

## Troubleshooting Guide

### Issue: Migration Fails
**Solution**:
- Check database connection
- Verify migration file syntax
- Check for existing table
- Review error message in logs

### Issue: Camera Not Working
**Solution**:
- Check browser permissions
- Use manual input mode
- Verify HTTPS (some browsers require it)
- Test on different browser

### Issue: Barcode Generation Fails
**Solution**:
- Verify bwip-js installed: `npm list bwip-js`
- Check canvas support
- Verify product exists
- Review browser console

### Issue: Unknown Barcodes List Empty
**Solution**:
- Scan an unknown barcode first
- Check warehouse_id matches user
- Verify user role is admin/manager
- Check database directly

### Issue: Warehouse Isolation Not Working
**Solution**:
- Verify req.user.warehouse_id set correctly
- Check auth middleware passing user data
- Verify database has warehouse_id
- Review role-based logic

---

## Documentation Links

- [Barcode Module Guide](./BARCODE_MODULE_GUIDE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [API Reference](./BARCODE_API_REFERENCE.md)
- [This Checklist](./DEPLOYMENT_CHECKLIST.md)

---

## Sign-Off

### Deployment By
- **Name**: ___________________
- **Date**: ___________________
- **Environment**: [ ] Development [ ] Staging [ ] Production

### Verification By
- **Name**: ___________________
- **Date**: ___________________
- **All Tests Passed**: [ ] Yes [ ] No
- **Issues Found**: ___________________

### Approved By
- **Name**: ___________________
- **Date**: ___________________
- **Status**: [ ] Approved [ ] Conditional Approval [ ] Rejected

---

## Post-Deployment Monitoring

### Day 1 Monitoring
- [ ] Check error logs every hour
- [ ] Monitor database performance
- [ ] User feedback collection
- [ ] API response times

### Week 1 Monitoring
- [ ] Review error logs daily
- [ ] Monitor unknown barcodes created
- [ ] Verify audit logs
- [ ] Check database growth

### Ongoing Monitoring
- [ ] Weekly error log review
- [ ] Monthly performance analysis
- [ ] Quarterly security audit
- [ ] Yearly data cleanup/archival

---

## Deployment Completion

**Module**: Barcode Management System
**Status**: Ready for Deployment
**Version**: 1.0.0
**Date**: December 12, 2024

### Final Checklist
- [ ] All files in place
- [ ] Dependencies installed
- [ ] Database migration completed
- [ ] API endpoints verified
- [ ] Frontend components working
- [ ] Routes configured
- [ ] Navigation updated
- [ ] Documentation complete
- [ ] Team trained
- [ ] Sign-offs obtained

**Ready to Deploy**: ✅ YES

---

## Contact & Support

For deployment issues or questions:
1. Check documentation first
2. Review error logs
3. Contact development team
4. Escalate if critical

**Support Team**: _________________
**On-Call**: _________________
**Emergency Contact**: _________________

---

**Deployment Checklist Version**: 1.0
**Last Updated**: December 12, 2024
**Next Review**: January 12, 2025
