import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const UnknownBarcode = sequelize.define(
    'UnknownBarcode',
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
      scanned_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      scanned_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.ENUM('stock_in', 'stock_out', 'audit'),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      resolved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'unknown_barcodes',
      timestamps: false,
      underscored: true,
    },
  );

  return UnknownBarcode;
};
