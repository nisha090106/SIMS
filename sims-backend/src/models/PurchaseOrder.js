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
      order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      expected_delivery: {
        type: DataTypes.DATE,
      },
      status: {
        type: DataTypes.ENUM('draft', 'pending', 'confirmed', 'delivered', 'cancelled'),
        defaultValue: 'draft',
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'purchase_orders',
      timestamps: true,
      underscored: true,
    }
  );

  return PurchaseOrder;
};
