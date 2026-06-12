import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Inventory = sequelize.define(
    'Inventory',
    {
      // The actual PK column in DB is `id`
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
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
        allowNull: false,
      },
      reserved_qty: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
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
