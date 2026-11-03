require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  try {
    console.log('Running migrations...');
    const sql1 = fs.readFileSync(path.join(__dirname, '001_schema.sql'), 'utf8');
    await conn.query(sql1);
    const sql2File = path.join(__dirname, '002_settings.sql');
    if (fs.existsSync(sql2File)) {
      const sql2 = fs.readFileSync(sql2File, 'utf8');
      await conn.query(sql2);
    }
    console.log('Done! Login: admin@crm.com / Admin@123');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}
run();
