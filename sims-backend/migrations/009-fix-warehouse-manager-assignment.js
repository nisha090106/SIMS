export async function up(queryInterface) {
  const [managerRows] = await queryInterface.sequelize.query(
    "SELECT id FROM users WHERE email = 'manager@sims.com' AND role = 'manager' LIMIT 1",
  );

  const managerId = managerRows?.[0]?.id;
  if (!managerId) return;

  await queryInterface.sequelize.query(
    `UPDATE warehouses w
     LEFT JOIN users u ON u.id = w.manager_id
     SET w.manager_id = :managerId
     WHERE w.manager_id IS NULL
        OR w.manager_id = 1
        OR u.id IS NULL
        OR u.role != 'manager'`,
    { replacements: { managerId } },
  );
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(
    "UPDATE warehouses SET manager_id = NULL WHERE manager_id IS NOT NULL",
  );
}
