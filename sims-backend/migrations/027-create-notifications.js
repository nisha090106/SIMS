export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('notifications', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    type: {
      type: Sequelize.STRING(60),
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    is_read: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    link: {
      type: Sequelize.STRING(300),
      allowNull: true,
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true,
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

  await queryInterface.addIndex('notifications', ['user_id'], { name: 'idx_notifications_user_id' });
  await queryInterface.addIndex('notifications', ['user_id', 'is_read'], { name: 'idx_notifications_user_unread' });
  await queryInterface.addIndex('notifications', ['created_at'], { name: 'idx_notifications_created_at' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('notifications');
}
