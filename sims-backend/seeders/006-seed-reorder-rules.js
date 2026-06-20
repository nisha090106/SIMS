export async function up(queryInterface) {
  // Get all active products
  const products = await queryInterface.sequelize.query(
    'SELECT product_id, reorder_level, reorder_qty FROM products WHERE is_active = 1;',
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );

  if (products.length === 0) {
    console.log('⚠️  No active products found. Skipping reorder rules seeder.');
    return;
  }

  // Get first active supplier
  const suppliers = await queryInterface.sequelize.query(
    "SELECT supplier_id FROM suppliers WHERE status = 'active' ORDER BY supplier_id ASC LIMIT 1;",
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );

  if (suppliers.length === 0) {
    console.log('⚠️  No active suppliers found. Skipping reorder rules seeder.');
    return;
  }

  const firstSupplierId = suppliers[0].supplier_id;

  // Only insert rules that don't already exist (idempotent)
  const existing = await queryInterface.sequelize.query(
    'SELECT product_id FROM reorder_rules;',
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );
  const existingIds = new Set(existing.map((r) => r.product_id));

  const toInsert = products
    .filter((p) => !existingIds.has(p.product_id))
    .map((p) => ({
      product_id:            p.product_id,
      warehouse_id:          null,
      reorder_threshold:     p.reorder_level || 10,
      reorder_quantity:      p.reorder_qty   || 50,
      preferred_supplier_id: firstSupplierId,
      is_active:             true,
      last_triggered_at:     null,
      created_at:            new Date(),
      updated_at:            new Date(),
    }));

  if (toInsert.length === 0) {
    console.log('ℹ️  All products already have reorder rules. Nothing inserted.');
    return;
  }

  await queryInterface.bulkInsert('reorder_rules', toInsert);
  console.log(`✅ Created ${toInsert.length} reorder rules (skipped ${existingIds.size} existing).`);
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete('reorder_rules', {});
}
