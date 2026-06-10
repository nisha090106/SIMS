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
        type: DataTypes.ENUM(
          'create',
          'read',
          'update',
          'delete',
          'login',
          'logout',
          'BARCODE_SCAN',
          'CREATE_PURCHASE_ORDER',
          'UPDATE_PURCHASE_ORDER',
          'APPROVE_PURCHASE_ORDER',
          'RECEIVE_PURCHASE_ORDER',
          'CANCEL_PURCHASE_ORDER',
          'REQUEST_FULFILLED',
        ),
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
