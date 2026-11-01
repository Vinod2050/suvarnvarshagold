// Reads settings from environment variables (.env on a PC, the hosting panel on GoDaddy).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const root = path.join(__dirname, '..', '..');
const isProduction = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing setting ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

// SESSION_SECRET and IP_HASH_SALT: taken from the settings when given. Hosting that only provides the DB_*
// variables (e.g. GoDaddy with an attached database) does not set them, so they are then derived from the
// database password with HMAC-SHA256: secret (the password never appears in code), and the same after every
// restart and re-upload, so admins are not signed out.
function secret(name) {
  const value = process.env[name];
  if (value) {
    if (value.length < 32) throw new Error(`${name} must be at least 32 characters long.`);
    return value;
  }
  const dbPassword = process.env.DB_PASSWORD || '';
  if (dbPassword.length < 8) {
    throw new Error(`Missing setting ${name} (32+ random characters). Copy .env.example to .env and fill it in.`);
  }
  const crypto = require('crypto');
  const seed = `${process.env.DB_USER}|${process.env.DB_NAME}|${process.env.DB_HOST}|${name}`;
  return crypto.createHmac('sha256', dbPassword).update(seed).digest('hex');
}

const env = {
  root,
  isProduction,
  port: Number(process.env.PORT) || 3000,
  // Empty host = let Node choose (all interfaces), which is what most Node hosting expects.
  host: process.env.HOST || undefined,
  siteUrl: (process.env.SITE_URL || '').replace(/\/+$/, ''),
  trustProxy: process.env.TRUST_PROXY === undefined ? 1 : Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    database: required('DB_NAME'),
    connectionLimit: Number(process.env.DB_POOL_SIZE) || 5,
  },
  sessionSecret: secret('SESSION_SECRET'),
  ipHashSalt: secret('IP_HASH_SALT'),
  // Typed once on the first-run screen to create the first admin. Empty = screen disabled (use `npm run create-admin`).
  setupToken: process.env.SETUP_TOKEN || '',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
};

module.exports = env;
