'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all products with their reorder_level and reorder_qty
    const products = await queryInterface.sequelize.query(
      'SELECT product_id, reorder_level, reorder_qty FROM products;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Get first supplier (for preferred_supplier_id)
    const suppliers = await queryInterface.sequelize.query(
      'SELECT supplier_id FROM suppliers LIMIT 1;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (suppliers.length === 0) {
      console.log('⚠️  No suppliers found. Skipping reorder rules seeder.');
      return;
    }

    const firstSupplierId = suppliers[0].supplier_id;

    // Create reorder rules for each product
    const reorderRules = products.map((product) => ({
      product_id: product.product_id,
      warehouse_id: null, // Applies to any warehouse
      reorder_threshold: product.reorder_level || 10,
      reorder_quantity: product.reorder_qty || 50,
      preferred_supplier_id: firstSupplierId,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    if (reorderRules.length > 0) {
      await queryInterface.bulkInsert('reorder_rules', reorderRules);
      console.log(`✅ Created ${reorderRules.length} reorder rules`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Clear all reorder rules (or just the seeded ones)
    await queryInterface.bulkDelete('reorder_rules', {});
  },
};
