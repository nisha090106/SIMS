export async function up(queryInterface, Sequelize) {
  await queryInterface.dropTable('purchase_order_items');
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.createTable('purchase_order_items', {
    po_id: {
      type: Sequelize.UUID,
      references: {
        model: 'purchase_orders',
        key: 'po_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: Sequelize.UUID,
      references: {
        model: 'products',
        key: 'product_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });
}
