import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(60),
        allowNull: false,
        comment: 'e.g. po_submitted, po_approved, po_received, request_created, request_approved, request_rejected, request_fulfilled, low_stock, nightly_sync',
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      link: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: 'Frontend route to navigate to on click, e.g. /purchase-orders/42',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Extra payload: po_id, request_id, product_id, warehouse_id, etc.',
      },
    },
    {
      tableName: 'notifications',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Notification;
};
