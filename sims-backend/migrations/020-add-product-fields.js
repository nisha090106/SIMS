/**
 * Migration 020: Add is_active, image_url, cost_price to products table
 * and create product_categories table
 */
export async function up(queryInterface, Sequelize) {
  // 1. Add is_active (soft-delete flag)
  await queryInterface.addColumn('products', 'is_active', {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    after: 'barcode',
  });

  // 2. Add image_url
  await queryInterface.addColumn('products', 'image_url', {
    type: Sequelize.STRING(500),
    allowNull: true,
    after: 'is_active',
  });

  // 3. Add cost_price (separate from selling price = unit_price)
  await queryInterface.addColumn('products', 'cost_price', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    after: 'image_url',
  });

  // 4. Add created_by FK to users
  await queryInterface.addColumn('products', 'created_by', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    after: 'cost_price',
  });

  // 5. Create product_categories table (normalised category management)
  await queryInterface.createTable('product_categories', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING(80),
      allowNull: false,
      unique: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    created_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    created_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
  });

  // 6. Add index on is_active for fast filtering
  await queryInterface.addIndex('products', ['is_active']);
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('products', 'is_active');
  await queryInterface.removeColumn('products', 'image_url');
  await queryInterface.removeColumn('products', 'cost_price');
  await queryInterface.removeColumn('products', 'created_by');
  await queryInterface.dropTable('product_categories');
}
