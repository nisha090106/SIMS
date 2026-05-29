export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('sales_orders', {
    order_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_number: {
      type: Sequelize.STRING(50),
      unique: true,
      allowNull: false,
    },
    customer_name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    order_date: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    delivery_date: {
      type: Sequelize.DATE,
    },
    status: {
      type: Sequelize.ENUM('draft', 'pending', 'dispatched', 'delivered', 'cancelled'),
      defaultValue: 'draft',
    },
    total_amount: {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0,
    },
    created_by: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
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

  await queryInterface.addIndex('sales_orders', ['order_number'], { unique: true });
  await queryInterface.addIndex('sales_orders', ['customer_name']);
  await queryInterface.addIndex('sales_orders', ['created_by']);
  await queryInterface.addIndex('sales_orders', ['status']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('sales_orders');
}
