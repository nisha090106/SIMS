const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root', // use root to bypass permissions if needed
    password: 'root123', 
    database: 'sims_db'
  });
  
  const [rows] = await conn.query("SELECT id, email, role, warehouse_id FROM users WHERE email='manager@sims.com'");
  console.log(rows);
  conn.end();
}
test().catch(console.error);
