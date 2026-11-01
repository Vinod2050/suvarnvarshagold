// Small security helpers: IP hashing, random tokens, constant-time compare, India date.
const crypto = require('crypto');
const env = require('../config/env');

// Only a salted SHA-256 hash of the visitor IP is ever stored.
function ipHash(req) {
  return crypto.createHash('sha256').update(`${env.ipHashSalt}|${req.ip || ''}`).digest('hex');
}

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// Today's date in India (UTC+5:30) as YYYY-MM-DD; the shop works on Indian dates.
function todayIndia(date = new Date()) {
  return new Date(date.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

module.exports = { ipHash, randomToken, safeEqual, todayIndia };
