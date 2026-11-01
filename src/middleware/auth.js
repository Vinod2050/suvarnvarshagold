// Protects admin APIs and admin pages. The session holds only the admin id; the user is re-checked on
// every request so a disabled or deleted admin is signed out at once.
const { adminUsers } = require('../models');
const { unauthorized } = require('../utils/response');

async function loadAdmin(req) {
  const id = req.session && req.session.adminId;
  if (!id) return null;
  const user = await adminUsers.byId(id);
  if (!user || user.status !== 'active') {
    req.session.adminId = null;
    return null;
  }
  return user;
}

// For /api/admin/*: replies 401 JSON when not signed in.
async function requireAdmin(req, res, next) {
  try {
    const user = await loadAdmin(req);
    if (!user) return next(unauthorized());
    req.admin = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

// For /admin/*.html pages: sends the visitor to the login page when not signed in.
async function requireAdminPage(req, res, next) {
  try {
    const user = await loadAdmin(req);
    if (!user) return res.redirect(302, '/admin/login');
    req.admin = user;
    res.set('Cache-Control', 'no-store');
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAdmin, requireAdminPage, loadAdmin };
