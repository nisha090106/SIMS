import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    // Add barcode column to products table
    await queryInterface.addColumn('products', 'barcode', {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: true,
      comment: 'For barcode scan matching',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove barcode column
    await queryInterface.removeColumn('products', 'barcode');
  },
};
