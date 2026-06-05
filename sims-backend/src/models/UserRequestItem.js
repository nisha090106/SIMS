import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const UserRequestItem = sequelize.define(
    'UserRequestItem',
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
      quantity_requested: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity_fulfilled: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      notes: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: 'user_request_items',
      timestamps: true,
      underscored: true,
    },
  );

  return UserRequestItem;
};
