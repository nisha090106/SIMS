import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from './src/server.js';
import { 
  User, 
  Product, 
  ReorderRule, 
  Warehouse, 
  Inventory, 
  ImportJob 
} from './src/models/index.js';
import AuthService from './src/services/authService.js';

// Wait for database sync and connection to start
await new Promise(resolve => setTimeout(resolve, 15000));

async function runTests() {
  console.log('\n=======================================');
  console.log('      SIMS BULK IMPORT TEST SUITE     ');
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

    const token = AuthService.generateToken(adminUser);
    console.log('1. Generated Admin JWT token successfully.');

    // Helper for authenticated requests
    const agent = request(app);

    // 2. Test template download endpoints
    console.log('\n2. Testing template downloads...');
    const prodTemplateRes = await agent
      .get('/api/imports/template/products')
      .set('Authorization', `Bearer ${token}`);
    
    if (prodTemplateRes.status !== 200 || !prodTemplateRes.text.toLowerCase().includes('sku')) {
      throw new Error(`Product template download failed: ${prodTemplateRes.status}`);
    }
    console.log('   - Product template download OK.');

    const stockTemplateRes = await agent
      .get('/api/imports/template/stock')
      .set('Authorization', `Bearer ${token}`);
    
    if (stockTemplateRes.status !== 200 || !stockTemplateRes.text.toLowerCase().includes('quantity')) {
      throw new Error(`Stock template download failed: ${stockTemplateRes.status}`);
    }
    console.log('   - Stock template download OK.');

    const whTemplateRes = await agent
      .get('/api/imports/template/warehouses')
      .set('Authorization', `Bearer ${token}`);
    
    if (whTemplateRes.status !== 200 || !whTemplateRes.text.toLowerCase().includes('manageremail')) {
      throw new Error(`Warehouse template download failed: ${whTemplateRes.status}`);
    }
    console.log('   - Warehouse template download OK.');

    // 3. Test Product Bulk Import
    console.log('\n3. Testing Product Bulk Import...');
    const prodCsvContent = `name,sku,category,unit,unit_price,reorder_level,reorder_qty,description,barcode
Test Mouse,MSE-TST-01,Accessories,piece,15.99,10,30,Test wireless mouse,111122223333
Test Keyboard,KBD-TST-01,Accessories,piece,45.50,5,20,Test mechanical keyboard,444455556666`;

    const uploadsDir = path.join(process.cwd(), 'src', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const prodCsvPath = path.join(uploadsDir, 'test_products.csv');
    fs.writeFileSync(prodCsvPath, prodCsvContent);

    const prodUploadRes = await agent
      .post('/api/imports/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('import_type', 'product')
      .attach('file', prodCsvPath);

    if (prodUploadRes.status !== 202) {
      throw new Error(`Product upload failed with status ${prodUploadRes.status}: ${JSON.stringify(prodUploadRes.body)}`);
    }

    const prodJobId = prodUploadRes.body.jobId;
    console.log(`   - Product upload accepted. Job ID: ${prodJobId}. Polling...`);

    // Poll until completed
    let prodJob = null;
    for (let attempts = 0; attempts < 10; attempts++) {
      await new Promise(r => setTimeout(r, 1000));
      const jobRes = await agent
        .get(`/api/imports/${prodJobId}`)
        .set('Authorization', `Bearer ${token}`);
      
      prodJob = jobRes.body.data;
      if (prodJob.status === 'completed' || prodJob.status === 'failed') {
        break;
      }
    }

    console.log(`   - Job Status: ${prodJob.status}. Processed: ${prodJob.processed_rows}, Failed: ${prodJob.failed_rows}`);
    if (prodJob.status !== 'completed') {
      throw new Error(`Product import job failed: ${prodJob.error_log}`);
    }

    // Verify DB records
    const product1 = await Product.findOne({ where: { sku: 'MSE-TST-01' } });
    const product2 = await Product.findOne({ where: { sku: 'KBD-TST-01' } });

    if (!product1 || !product2) {
      throw new Error('Imported products not found in database.');
    }
    console.log(`   - Imported product 1: ${product1.name} (SKU: ${product1.sku})`);
    console.log(`   - Imported product 2: ${product2.name} (SKU: ${product2.sku})`);

    const rule1 = await ReorderRule.findOne({ where: { product_id: product1.product_id } });
    if (!rule1 || rule1.reorder_threshold !== 10 || rule1.reorder_quantity !== 30) {
      throw new Error('Reorder rule for product 1 not created or incorrect.');
    }
    console.log('   - Reorder rules verification OK.');

    // Clean up temp file
    if (fs.existsSync(prodCsvPath)) fs.unlinkSync(prodCsvPath);

    // 4. Test Warehouse Bulk Import
    console.log('\n4. Testing Warehouse Bulk Import...');
    const whCsvContent = `name,location,address,capacity,manager_email
Test Hub Center,Boston,123 Hub Rd,10000,admin@sims.com`;

    const whCsvPath = path.join(uploadsDir, 'test_warehouses.csv');
    fs.writeFileSync(whCsvPath, whCsvContent);

    const whUploadRes = await agent
      .post('/api/imports/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('import_type', 'warehouse')
      .attach('file', whCsvPath);

    if (whUploadRes.status !== 202) {
      throw new Error(`Warehouse upload failed: ${JSON.stringify(whUploadRes.body)}`);
    }

    const whJobId = whUploadRes.body.jobId;
    console.log(`   - Warehouse upload accepted. Job ID: ${whJobId}. Polling...`);

    let whJob = null;
    for (let attempts = 0; attempts < 10; attempts++) {
      await new Promise(r => setTimeout(r, 1000));
      const jobRes = await agent
        .get(`/api/imports/${whJobId}`)
        .set('Authorization', `Bearer ${token}`);
      
      whJob = jobRes.body.data;
      if (whJob.status === 'completed' || whJob.status === 'failed') {
        break;
      }
    }

    console.log(`   - Job Status: ${whJob.status}. Processed: ${whJob.processed_rows}, Failed: ${whJob.failed_rows}`);
    if (whJob.status !== 'completed') {
      throw new Error(`Warehouse import job failed: ${whJob.error_log}`);
    }

    const warehouse = await Warehouse.findOne({ where: { name: 'Test Hub Center' } });
    if (!warehouse) {
      throw new Error('Imported warehouse not found in database.');
    }
    console.log(`   - Imported warehouse: ${warehouse.name} (Location: ${warehouse.location}, Manager ID: ${warehouse.manager_id})`);

    if (fs.existsSync(whCsvPath)) fs.unlinkSync(whCsvPath);

    // 5. Test Stock Bulk Import
    console.log('\n5. Testing Stock Bulk Import...');
    const stockCsvContent = `sku,barcode,quantity,location
MSE-TST-01,,150,Shelf X1
KBD-TST-01,,65,Shelf X2`;

    const stockCsvPath = path.join(uploadsDir, 'test_stock.csv');
    fs.writeFileSync(stockCsvPath, stockCsvContent);

    const stockUploadRes = await agent
      .post('/api/imports/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('import_type', 'stock')
      .field('warehouse_id', warehouse.warehouse_id)
      .attach('file', stockCsvPath);

    if (stockUploadRes.status !== 202) {
      throw new Error(`Stock upload failed: ${JSON.stringify(stockUploadRes.body)}`);
    }

    const stockJobId = stockUploadRes.body.jobId;
    console.log(`   - Stock upload accepted. Job ID: ${stockJobId}. Polling...`);

    let stockJob = null;
    for (let attempts = 0; attempts < 10; attempts++) {
      await new Promise(r => setTimeout(r, 1000));
      const jobRes = await agent
        .get(`/api/imports/${stockJobId}`)
        .set('Authorization', `Bearer ${token}`);
      
      stockJob = jobRes.body.data;
      if (stockJob.status === 'completed' || stockJob.status === 'failed') {
        break;
      }
    }

    console.log(`   - Job Status: ${stockJob.status}. Processed: ${stockJob.processed_rows}, Failed: ${stockJob.failed_rows}`);
    if (stockJob.status !== 'completed') {
      throw new Error(`Stock import job failed: ${stockJob.error_log}`);
    }

    // Verify stock counts in database
    const inv1 = await Inventory.findOne({
      where: { product_id: product1.product_id, warehouse_id: warehouse.warehouse_id }
    });
    const inv2 = await Inventory.findOne({
      where: { product_id: product2.product_id, warehouse_id: warehouse.warehouse_id }
    });

    if (!inv1 || inv1.quantity !== 150 || inv1.location !== 'Shelf X1') {
      throw new Error(`Inventory item 1 verification failed. Found quantity: ${inv1?.quantity}`);
    }
    if (!inv2 || inv2.quantity !== 65 || inv2.location !== 'Shelf X2') {
      throw new Error(`Inventory item 2 verification failed. Found quantity: ${inv2?.quantity}`);
    }
    console.log('   - Stock inventory record 1 verified. Qty: 150, Location: Shelf X1');
    console.log('   - Stock inventory record 2 verified. Qty: 65, Location: Shelf X2');

    if (fs.existsSync(stockCsvPath)) fs.unlinkSync(stockCsvPath);

    // 6. Test Import History
    console.log('\n6. Testing history endpoints...');
    const historyRes = await agent
      .get('/api/imports')
      .set('Authorization', `Bearer ${token}`);
    
    if (historyRes.status !== 200 || historyRes.body.data.length < 3) {
      throw new Error(`History fetch failed: ${historyRes.status}`);
    }
    console.log(`   - History verification OK. Fetched ${historyRes.body.data.length} jobs.`);

    console.log('\n=======================================');
    console.log('      ALL IMPORT TESTS PASSED SUCCESSFULLY!      ');
    console.log('=======================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTests();
