import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const RequestItem = sequelize.define(
    'RequestItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requested_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      approved_qty: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      fulfilled_qty: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'request_items',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return RequestItem;
};
