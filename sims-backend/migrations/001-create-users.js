export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('users', {
    user_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: Sequelize.STRING(100),
      unique: true,
      allowNull: false,
    },
    password: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: Sequelize.STRING(100),
    },
    last_name: {
      type: Sequelize.STRING(100),
    },
    role: {
      type: Sequelize.ENUM('admin', 'manager', 'staff'),
      defaultValue: 'staff',
    },
    department: {
      type: Sequelize.STRING(50),
    },
    status: {
      type: Sequelize.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
    },
    last_login: {
      type: Sequelize.DATE,
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

  await queryInterface.addIndex('users', ['email'], { unique: true });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('users');
}
