import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Inventory = sequelize.define(
    'Inventory',
    {
      inventory_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      batch_no: {
        type: DataTypes.STRING(50),
      },
      expiry_date: {
        type: DataTypes.DATE,
      },
      location: {
        type: DataTypes.STRING(100),
      },
    },
    {
      tableName: 'inventory',
      timestamps: true,
      underscored: true,
    }
  );

  return Inventory;
};
