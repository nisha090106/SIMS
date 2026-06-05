import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ImportJob = sequelize.define(
    'ImportJob',
    {
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
      },
      triggered_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'import_jobs',
      timestamps: true,
      underscored: true,
    },
  );

  return ImportJob;
};
