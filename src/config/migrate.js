// Prepares the database on start: runs database/schema.sql (CREATE TABLE IF NOT EXISTS) and
// database/seed.sql (INSERT IGNORE). Both only add what is missing and never change existing rows,
// so this is safe on every start. Hosting with an attached database then needs no manual import.
// Turn off with AUTO_MIGRATE=false (e.g. if the database user may not create tables).
//
// First admin: no password is kept in any file. When the database has no admin yet and the hosting
// settings contain ADMIN_PASSWORD (and optionally ADMIN_USERNAME, default "admin"), that admin is
// created with a bcrypt hash. An existing admin is never changed, so the setting can stay or be removed.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const env = require('./env');

const MIN_ADMIN_PASSWORD = 8;

async function createFirstAdmin(conn) {
  const [[row]] = await conn.query('SELECT COUNT(*) AS n FROM admin_users');
  if (row.n > 0) return { admins: row.n, created: null };
  const password = process.env.ADMIN_PASSWORD || '';
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  if (!password) return { admins: 0, created: null };
  if (password.length < MIN_ADMIN_PASSWORD) throw new Error(`ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD} characters.`);
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) throw new Error('ADMIN_USERNAME: use 3-50 letters, numbers, dots, dashes or underscores.');
  const hash = await bcrypt.hash(password, 12);
  await conn.query("INSERT IGNORE INTO admin_users (username, password_hash, display_name, status) VALUES (?, ?, 'Admin', 'active')", [username, hash]);
  return { admins: 1, created: username };
}

async function migrate() {
  // AUTO_MIGRATE=false: tables were imported by hand (database/setup-all.sql); only the admin step runs.
  const skipped = String(process.env.AUTO_MIGRATE || '').toLowerCase() === 'false';
  const files = ['schema.sql', 'seed.sql'].map((f) => path.join(env.root, 'database', f));
  // One short-lived connection that may run a whole file (the SQL comes only from our own files).
  const conn = await mysql.createConnection({ ...env.db, connectionLimit: undefined, multipleStatements: true, charset: 'utf8mb4' });
  try {
    await conn.query("SET time_zone = '+00:00'");
    if (!skipped) for (const file of files) await conn.query(fs.readFileSync(file, 'utf8'));
    return { skipped, ...(await createFirstAdmin(conn)) };
  } finally {
    await conn.end();
  }
}

module.exports = { migrate };
