import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('barcode_scan_logs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      barcode: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'product_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Null if unrecognised barcode',
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'warehouses',
          key: 'warehouse_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      scan_type: {
        type: DataTypes.ENUM('stock_in', 'stock_out', 'audit'),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      scanned_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('barcode_scan_logs');
  },
};
