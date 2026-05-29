export async function up(queryInterface, Sequelize) {
  const hashedPassword = '$2a$10$qpg2ZN2gJ/9h/1pL8Iu2bOHX.3ZW6sVVzQXbQU8qKkbKH1iBqy5Gq'; // hashed 'password123'

  await queryInterface.bulkInsert('users', [
    {
      email: 'admin@sims.com',
      password: hashedPassword,
      full_name: 'Admin User',
      role: 'admin',
      department: 'Management',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      email: 'manager@sims.com',
      password: hashedPassword,
      full_name: 'Manager User',
      role: 'manager',
      department: 'Operations',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      email: 'staff1@sims.com',
      password: hashedPassword,
      full_name: 'Staff User One',
      role: 'staff',
      department: 'Warehouse',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      email: 'staff2@sims.com',
      password: hashedPassword,
      full_name: 'Staff User Two',
      role: 'staff',
      department: 'Warehouse',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete('users', null, {});
}
