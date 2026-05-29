import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Supplier = sequelize.define(
    'Supplier',
    {
      supplier_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(150),
        unique: true,
        allowNull: false,
      },
      contact_person: {
        type: DataTypes.STRING(100),
      },
      email: {
        type: DataTypes.STRING(100),
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING(20),
      },
      address: {
        type: DataTypes.TEXT,
      },
      payment_terms: {
        type: DataTypes.STRING(100),
      },
      lead_time: {
        type: DataTypes.INTEGER,
        comment: 'Lead time in days',
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'blacklisted'),
        defaultValue: 'active',
      },
    },
    {
      tableName: 'suppliers',
      timestamps: true,
      underscored: true,
    }
  );

  return Supplier;
};
