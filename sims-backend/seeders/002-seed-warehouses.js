export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert('warehouses', [
    {
      name: 'Main Warehouse',
      location: 'Building A',
      address: '123 Industrial Street, City, Country',
      capacity: 10000,
      current_usage: 4500,
      manager_id: 2,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: 'Secondary Warehouse',
      location: 'Building B',
      address: '456 Storage Road, City, Country',
      capacity: 5000,
      current_usage: 2000,
      manager_id: 2,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: 'Regional Warehouse',
      location: 'Building C',
      address: '789 Distribution Lane, City, Country',
      capacity: 8000,
      current_usage: 3500,
      manager_id: 2,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete('warehouses', null, {});
}
