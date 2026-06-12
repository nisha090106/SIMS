'use strict';

export async function up(queryInterface, Sequelize) {
  // Create requests table
  await queryInterface.createTable('requests', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    request_number: {
      type: Sequelize.STRING(50),
      unique: true,
      allowNull: false,
    },
    requester_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    warehouse_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'warehouses',
        key: 'warehouse_id',
      },
      onDelete: 'RESTRICT',
    },
    status: {
      type: Sequelize.ENUM('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'),
      defaultValue: 'pending',
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    approved_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    approved_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    fulfilled_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    fulfilled_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    rejection_reason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    rejected_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  // Create request_items table
  await queryInterface.createTable('request_items', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    request_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'requests',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    product_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'product_id',
      },
      onDelete: 'RESTRICT',
    },
    requested_qty: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    approved_qty: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    fulfilled_qty: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  // Create indexes
  await queryInterface.addIndex('requests', ['requester_id']);
  await queryInterface.addIndex('requests', ['warehouse_id']);
  await queryInterface.addIndex('requests', ['status']);
  await queryInterface.addIndex('requests', ['priority']);
  await queryInterface.addIndex('requests', ['created_at']);
  await queryInterface.addIndex('request_items', ['request_id']);
  await queryInterface.addIndex('request_items', ['product_id']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('request_items');
  await queryInterface.dropTable('requests');
}
