import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reorder_rules', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'products',
          key: 'product_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'warehouses',
          key: 'warehouse_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'If null, applies to any warehouse',
      },
      reorder_threshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'When stock hits this, draft a PO',
      },
      reorder_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'How many units to order',
      },
      preferred_supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'supplier_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      last_triggered_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reorder_rules');
  },
};
