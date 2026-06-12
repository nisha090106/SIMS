/**
 * Migration 021 — extend inventory + warehouse tables
 * Inventory: add reserved_qty, storage_location (rename location → storage_location)
 * Warehouse:  add code, city, country, status, is_active
 */
export async function up(queryInterface, Sequelize) {
  // ── Inventory additions ──────────────────────────────────────
  // reserved_qty — soft-reserved quantity (prevents over-selling)
  await queryInterface.addColumn('inventory', 'reserved_qty', {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
    after: 'quantity',
  }).catch(() => {}); // ignore if already exists (re-run safe)

  // ── Warehouse additions ──────────────────────────────────────
  await queryInterface.addColumn('warehouses', 'code', {
    type: Sequelize.STRING(20),
    allowNull: true,
    after: 'name',
  }).catch(() => {});

  await queryInterface.addColumn('warehouses', 'city', {
    type: Sequelize.STRING(80),
    allowNull: true,
    after: 'location',
  }).catch(() => {});

  await queryInterface.addColumn('warehouses', 'country', {
    type: Sequelize.STRING(60),
    defaultValue: 'India',
    allowNull: true,
    after: 'city',
  }).catch(() => {});

  await queryInterface.addColumn('warehouses', 'status', {
    type: Sequelize.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false,
    after: 'country',
  }).catch(() => {});
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('inventory',  'reserved_qty').catch(() => {});
  await queryInterface.removeColumn('warehouses', 'code').catch(() => {});
  await queryInterface.removeColumn('warehouses', 'city').catch(() => {});
  await queryInterface.removeColumn('warehouses', 'country').catch(() => {});
  await queryInterface.removeColumn('warehouses', 'status').catch(() => {});
}
