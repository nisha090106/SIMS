export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('audit_logs', {
    log_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    action: {
      type: Sequelize.ENUM('create', 'read', 'update', 'delete', 'login', 'logout'),
      allowNull: false,
    },
    table_name: {
      type: Sequelize.STRING(50),
    },
    changes: {
      type: Sequelize.JSON,
    },
    timestamp: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    ip_address: {
      type: Sequelize.STRING(45),
    },
  });

  await queryInterface.addIndex('audit_logs', ['user_id']);
  await queryInterface.addIndex('audit_logs', ['action']);
  await queryInterface.addIndex('audit_logs', ['timestamp']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('audit_logs');
}
