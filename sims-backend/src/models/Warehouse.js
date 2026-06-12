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
      // Short uppercase code e.g. "WH-MUM"
      code: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(60),
        defaultValue: 'India',
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false,
      },
    },
    {
      tableName: 'warehouses',
      timestamps: true,
      underscored: true,
    },
  );

  return Warehouse;
};
