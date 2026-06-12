import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    // Add country, notes, and deleted_at columns to suppliers table
    await queryInterface.addColumn('suppliers', 'country', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('suppliers', 'notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('suppliers', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns
    await queryInterface.removeColumn('suppliers', 'country');
    await queryInterface.removeColumn('suppliers', 'notes');
    await queryInterface.removeColumn('suppliers', 'deleted_at');
  },
};
