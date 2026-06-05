import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    // Add auto_drafted column to purchase_orders table
    await queryInterface.addColumn('purchase_orders', 'auto_drafted', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Flag to indicate if system auto-created this PO',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove auto_drafted column
    await queryInterface.removeColumn('purchase_orders', 'auto_drafted');
  },
};
