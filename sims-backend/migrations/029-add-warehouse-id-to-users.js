import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'warehouse_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'warehouses',
        key: 'warehouse_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'warehouse_id');
  },
};
