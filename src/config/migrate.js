// Prepares the database on start: runs database/schema.sql (CREATE TABLE IF NOT EXISTS) and
// database/seed.sql (INSERT IGNORE). Both only add what is missing and never change existing rows,
// so this is safe on every start. Hosting with an attached database then needs no manual import.
// Older databases also get new columns added (see COLUMNS). Turn the SQL files off with
// AUTO_MIGRATE=false (e.g. if the database user may not create tables); the steps below still run.
//
// First accounts: no password is kept in any file. From the private hosting settings:
//   SUPERADMIN_PASSWORD (+ SUPERADMIN_USERNAME, default "superadmin") -> created when no super admin exists
//   ADMIN_PASSWORD      (+ ADMIN_USERNAME, default "admin")           -> created when no admin exists
// An existing account is never changed, so the settings can stay or be removed after the first start.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const env = require('./env');

const MIN_PASSWORD = 8;

// Columns added after the first release: [table, column, definition]
const COLUMNS = [
  ['admin_users', 'role', "ENUM('superadmin','admin') NOT NULL DEFAULT 'admin' AFTER display_name"],
  ['admin_users', 'failed_attempts', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER status'],
  ['admin_users', 'last_failed_at', 'DATETIME NULL AFTER failed_attempts'],
  ['admin_users', 'locked_at', 'DATETIME NULL AFTER last_failed_at'],
];

async function addMissingColumns(conn) {
  for (const [table, column, definition] of COLUMNS) {
    const [rows] = await conn.query(
      'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [table, column],
    );
    // Table and column names come only from the list above, never from input.
    if (!rows.length) await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function createAccount(conn, { role, usernameVar, passwordVar, defaultUsername }) {
  const password = process.env[passwordVar] || '';
  if (!password) return null;
  const where = role === 'superadmin' ? "role = 'superadmin'" : '1 = 1';
  const [[row]] = await conn.query(`SELECT COUNT(*) AS n FROM admin_users WHERE ${where}`);
  if (row.n > 0) return null;
  const username = (process.env[usernameVar] || defaultUsername).trim();
  if (password.length < MIN_PASSWORD) throw new Error(`${passwordVar} must be at least ${MIN_PASSWORD} characters.`);
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) throw new Error(`${usernameVar}: use 3-50 letters, numbers, dots, dashes or underscores.`);
  const [[taken]] = await conn.query('SELECT COUNT(*) AS n FROM admin_users WHERE username = ?', [username]);
  if (taken.n > 0) throw new Error(`${usernameVar}: the username "${username}" is already used by another account.`);
  const hash = await bcrypt.hash(password, 12);
  await conn.query("INSERT INTO admin_users (username, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, 'active')", [
    username,
    hash,
    role === 'superadmin' ? 'Super admin' : 'Admin',
    role,
  ]);
  return username;
}

// Emergency reset: with RESET_SUPERADMIN_PASSWORD=yes the super admin account (SUPERADMIN_USERNAME,
// default "superadmin") gets the password from SUPERADMIN_PASSWORD on start and is unlocked; it is
// created if missing. Remove the switch after signing in, otherwise every restart sets it again.
async function resetSuperAdmin(conn) {
  if (String(process.env.RESET_SUPERADMIN_PASSWORD || '').toLowerCase() !== 'yes') return null;
  const password = process.env.SUPERADMIN_PASSWORD || '';
  const username = (process.env.SUPERADMIN_USERNAME || 'superadmin').trim();
  if (password.length < MIN_PASSWORD) throw new Error(`RESET_SUPERADMIN_PASSWORD needs SUPERADMIN_PASSWORD with at least ${MIN_PASSWORD} characters.`);
  const hash = await bcrypt.hash(password, 12);
  const [res] = await conn.query(
    "UPDATE admin_users SET password_hash = ?, role = 'superadmin', status = 'active', failed_attempts = 0, last_failed_at = NULL, locked_at = NULL WHERE username = ?",
    [hash, username],
  );
  if (!res.affectedRows) {
    await conn.query("INSERT INTO admin_users (username, password_hash, display_name, role, status) VALUES (?, ?, 'Super admin', 'superadmin', 'active')", [username, hash]);
  }
  return username;
}

// MAKE_SUPERADMIN=admin (comma-separated names): those existing accounts get full super admin access
// and are unlocked, on every start. No password is involved; the setting can stay or be removed.
async function promoteSuperAdmins(conn) {
  const names = String(process.env.MAKE_SUPERADMIN || '').split(',').map((n) => n.trim()).filter(Boolean);
  const done = [];
  for (const name of names) {
    const [res] = await conn.query(
      "UPDATE admin_users SET role = 'superadmin', status = 'active', failed_attempts = 0, last_failed_at = NULL, locked_at = NULL WHERE username = ? AND (role <> 'superadmin' OR locked_at IS NOT NULL OR status <> 'active')",
      [name],
    );
    if (res.affectedRows) done.push(name);
  }
  return done;
}

async function migrate() {
  const skipped = String(process.env.AUTO_MIGRATE || '').toLowerCase() === 'false';
  const files = ['schema.sql', 'seed.sql'].map((f) => path.join(env.root, 'database', f));
  // One short-lived connection that may run a whole file (the SQL comes only from our own files).
  const conn = await mysql.createConnection({ ...env.db, connectionLimit: undefined, multipleStatements: true, charset: 'utf8mb4' });
  try {
    await conn.query("SET time_zone = '+00:00'");
    if (!skipped) for (const file of files) await conn.query(fs.readFileSync(file, 'utf8'));
    await addMissingColumns(conn);
    const created = [];
    const reset = await resetSuperAdmin(conn);
    if (reset) created.push(`Password of super admin "${reset}" set from SUPERADMIN_PASSWORD (account unlocked) - now REMOVE the RESET_SUPERADMIN_PASSWORD setting`);
    for (const name of await promoteSuperAdmins(conn)) created.push(`Account "${name}" is now a super admin (full access, unlocked)`);
    const superUser = await createAccount(conn, { role: 'superadmin', usernameVar: 'SUPERADMIN_USERNAME', passwordVar: 'SUPERADMIN_PASSWORD', defaultUsername: 'superadmin' });
    if (superUser) created.push(`Account created: super admin "${superUser}"`);
    const adminUser = await createAccount(conn, { role: 'admin', usernameVar: 'ADMIN_USERNAME', passwordVar: 'ADMIN_PASSWORD', defaultUsername: 'admin' });
    if (adminUser) created.push(`Account created: admin "${adminUser}"`);
    const [[counts]] = await conn.query("SELECT COUNT(*) AS admins, SUM(role = 'superadmin') AS supers FROM admin_users");
    return { skipped, created, admins: Number(counts.admins), supers: Number(counts.supers || 0) };
  } finally {
    await conn.end();
  }
}

module.exports = { migrate };
