// Admin sign-in endpoints.
const authService = require('../services/auth.service');
const { loadAdmin } = require('../middleware/auth');
const { csrfToken } = require('../middleware/csrf');
const { ok } = require('../utils/response');
const { ipHash } = require('../utils/security');

// New session id after sign-in, so an id known before sign-in is useless afterwards.
function startSession(req, adminId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.adminId = adminId;
      return resolve(csrfToken(req));
    });
  });
}

async function status(req, res) {
  const [s, user] = await Promise.all([authService.status(), loadAdmin(req)]);
  ok(res, { ...s, loggedIn: Boolean(user), user, csrfToken: csrfToken(req) });
}

async function setup(req, res) {
  const user = await authService.setup(req.body);
  const token = await startSession(req, user.id);
  ok(res, { user, csrfToken: token }, 201);
}

async function login(req, res) {
  const user = await authService.login(req.body, ipHash(req));
  const token = await startSession(req, user.id);
  ok(res, { user, csrfToken: token });
}

async function logout(req, res) {
  const { activity } = require('../models');
  if (req.session.adminId) await activity.add(req.session.adminId, 'logout', 'account', req.session.adminId, 'Signed out');
  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('sv.sid', { path: '/' });
  ok(res);
}

async function me(req, res) {
  ok(res, { user: req.admin, csrfToken: csrfToken(req) });
}

async function changePassword(req, res) {
  await authService.changePassword(req.admin.id, req.body);
  ok(res);
}

module.exports = { status, setup, login, logout, me, changePassword };
