export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('warehouses', {
    warehouse_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING(100),
      unique: true,
      allowNull: false,
    },
    location: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    address: {
      type: Sequelize.TEXT,
    },
    capacity: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    current_usage: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
    },
    manager_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
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

  await queryInterface.addIndex('warehouses', ['name'], { unique: true });
  await queryInterface.addIndex('warehouses', ['manager_id']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('warehouses');
}
