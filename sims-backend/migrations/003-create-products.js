export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('products', {
    product_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sku: {
      type: Sequelize.STRING(50),
      unique: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
    },
    category: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    unit: {
      type: Sequelize.STRING(20),
      defaultValue: 'piece',
    },
    reorder_level: {
      type: Sequelize.INTEGER,
      defaultValue: 10,
    },
    reorder_qty: {
      type: Sequelize.INTEGER,
      defaultValue: 50,
    },
    unit_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
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

  await queryInterface.addIndex('products', ['sku'], { unique: true });
  await queryInterface.addIndex('products', ['category']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('products');
}
