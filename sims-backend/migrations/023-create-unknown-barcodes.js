'use strict';

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('unknown_barcodes', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    barcode: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    scanned_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    scanned_by: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    warehouse_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'warehouses',
        key: 'warehouse_id',
      },
    },
    action: {
      type: Sequelize.ENUM('stock_in', 'stock_out', 'audit'),
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 1,
    },
    resolved: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    product_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'products',
        key: 'product_id',
      },
    },
    resolved_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    resolved_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  });

  // Create indexes
  await queryInterface.addIndex('unknown_barcodes', ['barcode']);
  await queryInterface.addIndex('unknown_barcodes', ['warehouse_id']);
  await queryInterface.addIndex('unknown_barcodes', ['scanned_by']);
  await queryInterface.addIndex('unknown_barcodes', ['resolved']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('unknown_barcodes');
}
