import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('import_jobs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      job_type: {
        type: DataTypes.ENUM('product_import', 'stock_import', 'warehouse_import'),
        allowNull: false,
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
      },
      total_rows: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      processed_rows: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      failed_rows: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      error_log: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array of row-level errors',
      },
      triggered_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
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
    await queryInterface.dropTable('import_jobs');
  },
};
