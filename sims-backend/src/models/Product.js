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
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(80),
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
      // Selling price (was unit_price; kept for backward compatibility)
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      // Cost price (purchase cost, optional)
      cost_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      barcode: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'products',
      timestamps: true,
      underscored: true,
      // Soft-delete: default scope filters inactive products
      defaultScope: {
        where: { is_active: true },
      },
      scopes: {
        withInactive: {},          // use Product.scope('withInactive') to include all
      },
    },
  );

  return Product;
};
