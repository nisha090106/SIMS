export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('purchase_orders', {
    po_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    po_number: {
      type: Sequelize.STRING(50),
      unique: true,
      allowNull: false,
    },
    supplier_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'supplier_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    order_date: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    expected_delivery: {
      type: Sequelize.DATE,
    },
    status: {
      type: Sequelize.ENUM('draft', 'pending', 'confirmed', 'delivered', 'cancelled'),
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

  await queryInterface.addIndex('purchase_orders', ['po_number'], { unique: true });
  await queryInterface.addIndex('purchase_orders', ['supplier_id']);
  await queryInterface.addIndex('purchase_orders', ['created_by']);
  await queryInterface.addIndex('purchase_orders', ['status']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('purchase_orders');
}
