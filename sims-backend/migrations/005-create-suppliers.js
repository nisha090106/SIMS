export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('suppliers', {
    supplier_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING(150),
      unique: true,
      allowNull: false,
    },
    contact_person: {
      type: Sequelize.STRING(100),
    },
    email: {
      type: Sequelize.STRING(100),
    },
    phone: {
      type: Sequelize.STRING(20),
    },
    address: {
      type: Sequelize.TEXT,
    },
    payment_terms: {
      type: Sequelize.STRING(100),
    },
    lead_time: {
      type: Sequelize.INTEGER,
      comment: 'Lead time in days',
    },
    rating: {
      type: Sequelize.DECIMAL(3, 2),
      defaultValue: 0,
    },
    status: {
      type: Sequelize.ENUM('active', 'inactive', 'blacklisted'),
      defaultValue: 'active',
    },
    created_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
  });

  await queryInterface.addIndex('suppliers', ['name'], { unique: true });
  await queryInterface.addIndex('suppliers', ['status']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('suppliers');
}
