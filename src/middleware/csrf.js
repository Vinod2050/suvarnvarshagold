// CSRF protection.
// Admin and sign-in requests: a random token kept in the session must come back in the X-CSRF-Token header.
// Public forms (no session): the request must come from this website (Origin / Referer check) and be JSON,
// which a form on another website cannot send.
const env = require('../config/env');
const { forbidden } = require('../utils/response');
const { randomToken, safeEqual } = require('../utils/security');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = randomToken(32);
  return req.session.csrf;
}

function verifyCsrf(req, res, next) {
  if (SAFE.has(req.method)) return next();
  if (!req.session || !safeEqual(req.get('x-csrf-token'), req.session.csrf)) {
    return next(forbidden('Security check failed. Please reload the page and try again.'));
  }
  return next();
}

function allowedOrigin(req, origin) {
  try {
    const u = new URL(origin);
    if (u.host === req.get('host')) return true;
    if (env.siteUrl && u.origin === new URL(env.siteUrl).origin) return true;
    return env.corsOrigins.includes(u.origin);
  } catch {
    return false;
  }
}

function sameOrigin(req, res, next) {
  if (SAFE.has(req.method)) return next();
  const origin = req.get('origin') || req.get('referer');
  if (!origin || !allowedOrigin(req, origin)) return next(forbidden('Requests must come from this website'));
  // Requests with no body (e.g. DELETE) are fine; a body must be JSON or a file upload.
  const len = req.headers['content-length'];
  const hasBody = req.headers['transfer-encoding'] !== undefined || (len !== undefined && len !== '0');
  if (hasBody && !req.is('application/json') && !req.is('multipart/form-data')) return next(forbidden('Unsupported request type'));
  return next();
}

module.exports = { csrfToken, verifyCsrf, sameOrigin };
