import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const AutomationLog = sequelize.define(
    'AutomationLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      job_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('success', 'partial', 'failed'),
        allowNull: false,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: false,
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
    },
    {
      tableName: 'automation_logs',
      timestamps: false,
      underscored: true,
    },
  );

  return AutomationLog;
};
