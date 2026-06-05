import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const BarcodeScanLog = sequelize.define(
    'BarcodeScanLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      barcode: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      scan_type: {
        type: DataTypes.ENUM('stock_in', 'stock_out', 'audit'),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      scanned_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: 'barcode_scan_logs',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false, // No updated_at for scan logs
    },
  );

  return BarcodeScanLog;
};
