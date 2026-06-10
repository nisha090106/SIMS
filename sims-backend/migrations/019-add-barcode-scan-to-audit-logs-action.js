import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('audit_logs', 'action', {
      type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'BARCODE_SCAN'),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('audit_logs', 'action', {
      type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'login', 'logout'),
      allowNull: false,
    });
  },
};
