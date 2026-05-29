export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('inventory', {
    inventory_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'product_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    warehouse_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'warehouses',
        key: 'warehouse_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    batch_no: {
      type: Sequelize.STRING(50),
    },
    expiry_date: {
      type: Sequelize.DATE,
    },
    location: {
      type: Sequelize.STRING(100),
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

  await queryInterface.addIndex('inventory', ['product_id']);
  await queryInterface.addIndex('inventory', ['warehouse_id']);
  await queryInterface.addIndex('inventory', ['batch_no']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('inventory');
}
