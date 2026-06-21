import { User } from '../src/models/index.js';

export async function up(queryInterface, Sequelize) {
  const manager = await User.findOne({ where: { email: 'manager@sims.com' }, attributes: ['id'] });
  const managerId = manager?.id ?? null;

  await queryInterface.bulkInsert('warehouses', [
    {
      name: 'Main Warehouse',
      location: 'Building A',
      address: '123 Industrial Street, City, Country',
      capacity: 10000,
      current_usage: 4500,
      manager_id: managerId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: 'Secondary Warehouse',
      location: 'Building B',
      address: '456 Storage Road, City, Country',
      capacity: 5000,
      current_usage: 2000,
      manager_id: managerId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: 'Regional Warehouse',
      location: 'Building C',
      address: '789 Distribution Lane, City, Country',
      capacity: 8000,
      current_usage: 3500,
      manager_id: managerId,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete('warehouses', null, {});
}
