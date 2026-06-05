import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Product = sequelize.define(
    'Product',
    {
      product_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sku: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING(20),
        defaultValue: 'piece',
      },
      reorder_level: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
      },
      reorder_qty: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      barcode: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: true,
      },
    },
    {
      tableName: 'products',
      timestamps: true,
      underscored: true,
    },
  );

  return Product;
};
