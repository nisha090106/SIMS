import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'login', 'logout'),
        allowNull: false,
      },
      table_name: {
        type: DataTypes.STRING(50),
      },
      changes: {
        type: DataTypes.JSON,
      },
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      ip_address: {
        type: DataTypes.STRING(45),
      },
    },
    {
      tableName: 'audit_logs',
      timestamps: false,
      underscored: true,
    },
  );

  return AuditLog;
};
