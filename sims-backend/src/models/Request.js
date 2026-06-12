import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Request = sequelize.define(
    'Request',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      request_number: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      requester_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'),
        defaultValue: 'pending',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fulfilled_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      fulfilled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rejected_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'requests',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Request;
};
