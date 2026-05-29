import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SalesOrder = sequelize.define(
    'SalesOrder',
    {
      order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_number: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      customer_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      delivery_date: {
        type: DataTypes.DATE,
      },
      status: {
        type: DataTypes.ENUM('draft', 'pending', 'dispatched', 'delivered', 'cancelled'),
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
      tableName: 'sales_orders',
      timestamps: true,
      underscored: true,
    }
  );

  return SalesOrder;
};
