// MySQL connection pool. All queries use placeholders (?), never string building.
const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  ...env.db,
  charset: 'utf8mb4',
  timezone: 'Z', // DATETIME values are stored and read as UTC
  dateStrings: ['DATE'], // DATE columns stay plain "YYYY-MM-DD" strings
  decimalNumbers: true,
  waitForConnections: true,
  namedPlaceholders: false,
});

// DEFAULT CURRENT_TIMESTAMP uses the connection's time zone. Hosting MySQL may run on any zone,
// so every connection is set to UTC; the website converts to Indian time when it shows a time.
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Runs fn(conn) inside a transaction.
async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, one, transaction };
