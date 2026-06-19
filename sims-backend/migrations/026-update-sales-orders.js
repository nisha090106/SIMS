export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('sales_orders', 'warehouse_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: 'warehouses',
      key: 'warehouse_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('sales_orders', 'items', {
    type: Sequelize.TEXT,
    allowNull: true,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('sales_orders', 'warehouse_id');
  await queryInterface.removeColumn('sales_orders', 'items');
}
