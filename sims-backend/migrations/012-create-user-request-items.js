import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_request_items', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'user_requests',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'product_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      quantity_requested: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity_fulfilled: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_request_items');
  },
};
