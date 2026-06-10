import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Inventory = sequelize.define(
    'Inventory',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sku: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      category_id: {
        type: DataTypes.INTEGER,
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      reorder_level: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
      },
      status: {
        type: DataTypes.ENUM('available', 'discontinued', 'out_of_stock', 'low_stock'),
        defaultValue: 'available',
      },
      stock_value: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      batch_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      expiry_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: 'inventory',
      timestamps: true,
      underscored: true,
    },
  );

  return Inventory;
};
