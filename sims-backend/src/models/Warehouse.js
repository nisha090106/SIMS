import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Warehouse = sequelize.define(
    'Warehouse',
    {
      warehouse_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
      },
      capacity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      current_usage: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      manager_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'warehouses',
      timestamps: true,
      underscored: true,
    }
  );

  return Warehouse;
};
