// Request limits per visitor (kept in memory). The database also enforces the important ones
// (wrong-password waits and account lock), so they still hold if the app restarts.
const rateLimit = require('express-rate-limit');

const message = (text) => ({ ok: false, error: text });

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many requests. Please wait a minute and try again.'),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many sign-in attempts. Please wait 15 minutes and try again.'),
});

module.exports = { apiLimiter, loginLimiter };
