import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ImportLog = sequelize.define('ImportLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    importType: {
      type: DataTypes.ENUM('products', 'inventory', 'warehouses'),
      allowNull: false,
    },
    totalRows: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    successCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    failedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    imported_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('completed', 'partial', 'failed'),
      defaultValue: 'completed',
    },
    errorFilePath: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
  }, {
    tableName: 'import_logs',
    timestamps: true,
    underscored: true,
  });

  return ImportLog;
};
