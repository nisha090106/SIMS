import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const UserRequest = sequelize.define(
    'UserRequest',
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
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      purpose: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'),
        defaultValue: 'pending',
      },
      reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      review_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fulfilled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'user_requests',
      timestamps: true,
      underscored: true,
    },
  );

  return UserRequest;
};
