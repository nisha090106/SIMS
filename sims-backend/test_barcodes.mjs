import request from 'supertest';
import app from './src/server.js';
import { 
  User, 
  Product, 
  Warehouse, 
  Inventory, 
  BarcodeScanLog,
  AuditLog
} from './src/models/index.js';
import AuthService from './src/services/authService.js';

// Wait for database sync and connection to start
await new Promise(resolve => setTimeout(resolve, 15000));

async function runTests() {
  console.log('\n=======================================');
  console.log('      SIMS BARCODE SCAN TEST SUITE     ');
  console.log('=======================================\n');

  try {
    // 1. Seed or find the admin user to get auth token
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin@sims.com' },
      defaults: {
        password: 'password123',
        first_name: 'Test',
        last_name: 'Admin',
        role: 'admin',
        status: 'active',
      },
    });

    // Create a regular user to test RBAC
    const [regularUser] = await User.findOrCreate({
      where: { email: 'enduser@sims.com' },
      defaults: {
        password: 'password123',
        first_name: 'Test',
        last_name: 'EndUser',
        role: 'user', // regular end-user role
        status: 'active',
      },
    });

    const adminToken = AuthService.generateToken(adminUser);
    const userToken = AuthService.generateToken(regularUser);
    console.log('1. Generated Auth Tokens successfully.');

    // Seed test warehouse
    const [warehouse] = await Warehouse.findOrCreate({
      where: { name: 'Barcode Test Warehouse' },
      defaults: {
        location: 'Section A',
        capacity: 1000,
        manager_id: adminUser.id,
      },
    });
    const warehouseId = warehouse.warehouse_id;
    console.log(`2. Warehouse seeded: ID ${warehouseId}`);

    // Seed test product A (already has barcode)
    await Product.destroy({ where: { sku: 'SKU-BAR-A' } });
    const productA = await Product.create({
      sku: 'SKU-BAR-A',
      name: 'Barcode Test Product A',
      description: 'Test product for barcode scans',
      category: 'Electronics',
      unit: 'piece',
      reorder_level: 5,
      reorder_qty: 20,
      unit_price: 15.50,
      barcode: '9876543210',
    });
    console.log(`3. Product A seeded with barcode: 9876543210`);

    // Seed test product B (no barcode initially)
    await Product.destroy({ where: { sku: 'SKU-BAR-B' } });
    const productB = await Product.create({
      sku: 'SKU-BAR-B',
      name: 'Barcode Test Product B',
      description: 'Test product for barcode linking',
      category: 'Electronics',
      unit: 'piece',
      reorder_level: 5,
      reorder_qty: 20,
      unit_price: 25.00,
      barcode: null,
    });
    console.log(`4. Product B seeded with no barcode.`);

    const agent = request(app);

    // ==========================================
    // 5. Test Endpoint: lookupBarcode
    // ==========================================
    console.log('\n5. Testing GET /api/barcodes/lookup...');
    
    // Test without barcode query param
    const lookupFailRes1 = await agent
      .get('/api/barcodes/lookup')
      .set('Authorization', `Bearer ${adminToken}`);
    if (lookupFailRes1.status !== 400) {
      throw new Error(`Expected 400 when barcode is missing, got ${lookupFailRes1.status}`);
    }
    console.log('   - Missing barcode error handled correctly.');

    // Test with non-existent barcode
    const lookupFailRes2 = await agent
      .get('/api/barcodes/lookup?barcode=0000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    if (lookupFailRes2.status !== 404) {
      throw new Error(`Expected 404 for non-existent barcode, got ${lookupFailRes2.status}`);
    }
    console.log('   - Non-existent barcode handled correctly.');

    // Test lookup success
    const lookupSuccessRes = await agent
      .get('/api/barcodes/lookup?barcode=9876543210')
      .set('Authorization', `Bearer ${adminToken}`);
    if (lookupSuccessRes.status !== 200 || !lookupSuccessRes.body.success) {
      throw new Error(`Lookup failed, got: ${JSON.stringify(lookupSuccessRes.body)}`);
    }
    if (lookupSuccessRes.body.data.sku !== 'SKU-BAR-A') {
      throw new Error(`Expected SKU-BAR-A, got: ${lookupSuccessRes.body.data.sku}`);
    }
    console.log('   - Successful lookup check OK.');

    // ==========================================
    // 6. Test Endpoint: scanBarcode
    // ==========================================
    console.log('\n6. Testing POST /api/barcodes/scan...');

    // Test RBAC: Regular user role should be denied scan endpoint
    const scanRbacRes = await agent
      .post('/api/barcodes/scan')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        barcode: '9876543210',
        warehouse_id: warehouseId,
        scan_type: 'stock_in',
        quantity: 5,
      });
    if (scanRbacRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for 'user' role on scan, got ${scanRbacRes.status}`);
    }
    console.log('   - RBAC check for user role scanning: Blocked (OK).');

    // Test Unrecognised Scan: Scan an unknown barcode
    const scanUnknownRes = await agent
      .post('/api/barcodes/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        barcode: '1111111111',
        warehouse_id: warehouseId,
        scan_type: 'stock_in',
        quantity: 2,
        notes: 'Unrecognised stock_in test',
      });
    if (scanUnknownRes.status !== 200 || scanUnknownRes.body.found !== false) {
      throw new Error(`Expected 200 with found=false for unknown scan, got: ${JSON.stringify(scanUnknownRes.body)}`);
    }
    console.log('   - Unrecognised scan logged and reported as not found.');

    // Verify unrecognised scan was written to DB
    const loggedScan = await BarcodeScanLog.findOne({ where: { barcode: '1111111111', product_id: null } });
    if (!loggedScan) {
      throw new Error('Unrecognised scan was not found in BarcodeScanLog DB.');
    }
    const unrecognisedScanId = loggedScan.id;
    console.log(`   - Scan log verified in database. Log ID: ${unrecognisedScanId}`);

    // Test Scan Stock In: Scan 10 of Product A
    const scanInRes = await agent
      .post('/api/barcodes/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        barcode: '9876543210',
        warehouse_id: warehouseId,
        scan_type: 'stock_in',
        quantity: 10,
        notes: 'Initial stocking',
      });
    if (scanInRes.status !== 200 || scanInRes.body.after_qty !== 10) {
      throw new Error(`Stock In scan failed: ${JSON.stringify(scanInRes.body)}`);
    }
    console.log('   - Stock In scan processed correctly. Qty updated to 10.');

    // Verify Audit Log was written for scan
    const auditLog = await AuditLog.findOne({
      where: { action: 'BARCODE_SCAN', user_id: adminUser.id },
      order: [['timestamp', 'DESC']],
    });
    if (!auditLog || auditLog.changes.after !== 10) {
      throw new Error(`Expected audit log for BARCODE_SCAN, got: ${JSON.stringify(auditLog)}`);
    }
    console.log('   - Audit log recorded correctly with BARCODE_SCAN action.');

    // Test Scan Stock Out: Scan out 3 of Product A
    const scanOutRes = await agent
      .post('/api/barcodes/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        barcode: '9876543210',
        warehouse_id: warehouseId,
        scan_type: 'stock_out',
        quantity: 3,
      });
    if (scanOutRes.status !== 200 || scanOutRes.body.after_qty !== 7) {
      throw new Error(`Stock Out scan failed: ${JSON.stringify(scanOutRes.body)}`);
    }
    console.log('   - Stock Out scan processed correctly. Qty updated to 7.');

    // Test Scan Stock Out Insufficient Stock: Scan out 10 (exceeds current 7)
    const scanOutFailRes = await agent
      .post('/api/barcodes/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        barcode: '9876543210',
        warehouse_id: warehouseId,
        scan_type: 'stock_out',
        quantity: 10,
      });
    if (scanOutFailRes.status !== 400 || !scanOutFailRes.body.error.includes('Insufficient stock')) {
      throw new Error(`Expected 400 Insufficient stock, got: ${scanOutFailRes.status} - ${JSON.stringify(scanOutFailRes.body)}`);
    }
    console.log('   - Insufficient stock validation worked correctly.');

    // Test Scan Stock Out Low Stock Trigger: Scan out 3 more (qty goes to 4, reorder level is 5)
    // Should trigger low stock check
    const scanOutLowRes = await agent
      .post('/api/barcodes/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        barcode: '9876543210',
        warehouse_id: warehouseId,
        scan_type: 'stock_out',
        quantity: 3,
      });
    if (scanOutLowRes.status !== 200 || scanOutLowRes.body.after_qty !== 4) {
      throw new Error(`Stock Out failed: ${JSON.stringify(scanOutLowRes.body)}`);
    }
    console.log('   - Low Stock Out scan completed successfully. Qty is 4 (<= reorder level 5).');

    // Test Audit scan: Scan audit doesn't change qty
    const scanAuditRes = await agent
      .post('/api/barcodes/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        barcode: '9876543210',
        warehouse_id: warehouseId,
        scan_type: 'audit',
        quantity: 5,
        notes: 'Verification audit',
      });
    if (scanAuditRes.status !== 200 || scanAuditRes.body.after_qty !== 4) {
      throw new Error(`Audit scan should not change qty, got: ${JSON.stringify(scanAuditRes.body)}`);
    }
    console.log('   - Audit scan processed correctly (quantity unchanged at 4).');

    // ==========================================
    // 7. Test Endpoint: getScanHistory
    // ==========================================
    console.log('\n7. Testing GET /api/barcodes/history...');
    
    const historyRes = await agent
      .get(`/api/barcodes/history?warehouse_id=${warehouseId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (historyRes.status !== 200 || !historyRes.body.success) {
      throw new Error(`Failed to fetch history, got: ${historyRes.status}`);
    }
    if (historyRes.body.data.logs.length === 0) {
      throw new Error('Expected history logs to be returned.');
    }
    console.log(`   - Scan history retrieved. Total records: ${historyRes.body.data.total}`);

    // ==========================================
    // 8. Test Endpoint: processUnrecognisedScans
    // ==========================================
    console.log('\n8. Testing GET /api/barcodes/unrecognised...');
    
    const unrecognisedRes = await agent
      .get('/api/barcodes/unrecognised')
      .set('Authorization', `Bearer ${adminToken}`);
    if (unrecognisedRes.status !== 200 || !unrecognisedRes.body.success) {
      throw new Error(`Failed to fetch unrecognised scans, got: ${unrecognisedRes.status}`);
    }
    const unrecognisedLogs = unrecognisedRes.body.data.logs;
    const foundLog = unrecognisedLogs.find(l => l.barcode === '1111111111');
    if (!foundLog) {
      throw new Error('Our unrecognised scan of 1111111111 was not returned.');
    }
    console.log('   - Unrecognised scans list fetched successfully.');

    // ==========================================
    // 9. Test Endpoint: linkScanToProduct
    // ==========================================
    console.log('\n9. Testing PATCH /api/barcodes/:scanId/link...');
    
    // Attempt to link to invalid product
    const linkFailRes1 = await agent
      .patch(`/api/barcodes/${unrecognisedScanId}/link`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_id: 99999 });
    if (linkFailRes1.status !== 404) {
      throw new Error(`Expected 404 for invalid product link, got ${linkFailRes1.status}`);
    }
    console.log('   - Invalid product link handled correctly.');

    // Successful linking to Product B (which currently has barcode=null)
    const linkSuccessRes = await agent
      .patch(`/api/barcodes/${unrecognisedScanId}/link`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_id: productB.product_id });
    if (linkSuccessRes.status !== 200 || !linkSuccessRes.body.success) {
      throw new Error(`Linking barcode failed: ${JSON.stringify(linkSuccessRes.body)}`);
    }
    console.log('   - Barcode linked successfully.');

    // Verify product B now has barcode '1111111111'
    const updatedProductB = await Product.findByPk(productB.product_id);
    if (updatedProductB.barcode !== '1111111111') {
      throw new Error(`Expected barcode to be '1111111111', got ${updatedProductB.barcode}`);
    }
    console.log("   - Product barcode database update verified.");

    // Verify stock is updated in Warehouse for Product B (since the unrecognised scan was stock_in of quantity 2)
    const inventoryB = await Inventory.findOne({
      where: { product_id: productB.product_id, warehouse_id: warehouseId }
    });
    if (!inventoryB || inventoryB.quantity !== 2) {
      throw new Error(`Expected inventory B to have quantity 2, got ${inventoryB ? inventoryB.quantity : 'null'}`);
    }
    console.log("   - Stock adjustments processed on barcode linking verified. Qty is 2.");

    // Attempt to link again (should fail since it is already processed)
    const linkFailRes2 = await agent
      .patch(`/api/barcodes/${unrecognisedScanId}/link`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_id: productB.product_id });
    if (linkFailRes2.status !== 400) {
      throw new Error(`Expected 400 when attempting to relink processed scan, got ${linkFailRes2.status}`);
    }
    console.log('   - Relinking block verified.');

    console.log('\n=======================================');
    console.log('      ALL BARCODE TESTS PASSED!        ');
    console.log('=======================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
