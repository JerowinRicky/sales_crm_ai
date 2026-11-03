const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm_enterprise',
  waitForConnections: true,
  connectionLimit: 20,
  enableKeepAlive: true,
  timezone: '+00:00',
  decimalNumbers: true, // return DECIMAL columns as JS numbers, not strings
});

async function testConnection() {
  try {
    const c = await pool.getConnection();
    console.log('✅ MySQL connected');
    c.release();
  } catch (e) {
    console.error('❌ MySQL failed:', e.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
