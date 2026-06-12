import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const PurchaseOrder = sequelize.define(
    'PurchaseOrder',
    {
      po_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      po_number: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      expected_delivery: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('draft', 'submitted', 'approved', 'shipped', 'received', 'cancelled'),
        defaultValue: 'draft',
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      tax_percent: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      received_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      auto_drafted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      // Items stored as JSON array: [{ product_id, product_name, quantity, unit_cost, total_cost }]
      items: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'purchase_orders',
      timestamps: true,
      underscored: true,
    },
  );

  return PurchaseOrder;
};
