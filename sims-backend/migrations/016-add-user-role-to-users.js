import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    // Add 'user' role to users table ENUM
    await queryInterface.changeColumn('users', 'role', {
      type: DataTypes.ENUM('admin', 'manager', 'staff', 'user'),
      defaultValue: 'staff',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to old ENUM without 'user'
    await queryInterface.changeColumn('users', 'role', {
      type: DataTypes.ENUM('admin', 'manager', 'staff'),
      defaultValue: 'staff',
    });
  },
};
