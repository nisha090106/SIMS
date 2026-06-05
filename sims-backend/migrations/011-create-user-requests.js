import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_requests', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      request_number: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        comment: 'Auto-generated: REQ-YYYYMMDD-XXXX',
      },
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      purpose: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Reason for the request',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'),
        defaultValue: 'pending',
      },
      reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_requests');
  },
};
