export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert('suppliers', [
    {
      name: 'TechSupply Co.',
      contact_person: 'John Smith',
      email: 'john@techsupply.com',
      phone: '+1-555-0101',
      address: '100 Tech Street, Silicon Valley, CA',
      payment_terms: 'Net 30',
      lead_time: 7,
      rating: 4.8,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: 'Office Furniture Inc.',
      contact_person: 'Jane Doe',
      email: 'jane@officefurn.com',
      phone: '+1-555-0102',
      address: '200 Furniture Blvd, Los Angeles, CA',
      payment_terms: 'Net 45',
      lead_time: 14,
      rating: 4.5,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: 'Paper & Supplies Ltd.',
      contact_person: 'Bob Johnson',
      email: 'bob@papersupplies.com',
      phone: '+1-555-0103',
      address: '300 Paper Mill Road, Houston, TX',
      payment_terms: 'Net 15',
      lead_time: 3,
      rating: 4.2,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: 'Electronics Warehouse',
      contact_person: 'Alice Brown',
      email: 'alice@elecware.com',
      phone: '+1-555-0104',
      address: '400 Electronic Drive, Seattle, WA',
      payment_terms: 'Net 30',
      lead_time: 5,
      rating: 4.7,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete('suppliers', null, {});
}
