import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('automation_logs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      job_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "e.g. 'low_stock_checker', 'nightly_sync'",
      },
      status: {
        type: DataTypes.ENUM('success', 'partial', 'failed'),
        allowNull: false,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'JSON summary of what was done',
      },
      records_affected: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      duration_ms: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ran_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('automation_logs');
  },
};
