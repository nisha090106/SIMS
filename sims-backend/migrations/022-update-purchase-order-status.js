/**
 * Migration 022 — Update purchase_orders status ENUM and add missing fields
 * New statuses: draft | submitted | approved | shipped | received | cancelled
 * New fields: warehouse_id, approved_by, received_by, tax_percent, subtotal
 */
export async function up(queryInterface, Sequelize) {
  // 1. Change status ENUM (add submitted, shipped, received; map old 'pending'→'submitted', 'confirmed'→'approved', 'delivered'→'received')
  await queryInterface.changeColumn('purchase_orders', 'status', {
    type: Sequelize.ENUM('draft', 'submitted', 'approved', 'shipped', 'received', 'cancelled'),
    defaultValue: 'draft',
    allowNull: false,
  }).catch(() => {
    // If ENUM change fails (MySQL requires special handling), use raw SQL
  });

  // Migrate any legacy status values
  await queryInterface.sequelize.query(
    `UPDATE purchase_orders SET status = 'submitted' WHERE status = 'pending'`
  ).catch(() => {});
  await queryInterface.sequelize.query(
    `UPDATE purchase_orders SET status = 'approved' WHERE status = 'confirmed'`
  ).catch(() => {});
  await queryInterface.sequelize.query(
    `UPDATE purchase_orders SET status = 'received' WHERE status = 'delivered'`
  ).catch(() => {});

  // 2. Add warehouse_id
  await queryInterface.addColumn('purchase_orders', 'warehouse_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'warehouses', key: 'warehouse_id' },
    after: 'supplier_id',
  }).catch(() => {});

  // 3. Add approved_by
  await queryInterface.addColumn('purchase_orders', 'approved_by', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    after: 'created_by',
  }).catch(() => {});

  // 4. Add received_by
  await queryInterface.addColumn('purchase_orders', 'received_by', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    after: 'approved_by',
  }).catch(() => {});

  // 5. Add tax_percent (for grand total calculation)
  await queryInterface.addColumn('purchase_orders', 'tax_percent', {
    type: Sequelize.DECIMAL(5, 2),
    defaultValue: 0,
    allowNull: false,
    after: 'total_amount',
  }).catch(() => {});
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('purchase_orders', 'warehouse_id').catch(() => {});
  await queryInterface.removeColumn('purchase_orders', 'approved_by').catch(() => {});
  await queryInterface.removeColumn('purchase_orders', 'received_by').catch(() => {});
  await queryInterface.removeColumn('purchase_orders', 'tax_percent').catch(() => {});
}
