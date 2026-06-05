import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ReorderRule = sequelize.define(
    'ReorderRule',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reorder_threshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reorder_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      preferred_supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      last_triggered_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'reorder_rules',
      timestamps: true,
      underscored: true,
    },
  );

  return ReorderRule;
};
