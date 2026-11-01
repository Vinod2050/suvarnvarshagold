// Protects admin APIs and admin pages. The session holds only the admin id; the user is re-checked on
// every request so a disabled, locked or deleted account is signed out at once.
// Roles: superadmin (everything) and admin (rates, videos, feedback, products, FAQs). See requireSuperAdmin.
const { adminUsers } = require('../models');
const { unauthorized, forbidden } = require('../utils/response');

async function loadAdmin(req) {
  const id = req.session && req.session.adminId;
  if (!id) return null;
  const user = await adminUsers.byId(id);
  if (!user || user.status !== 'active' || user.locked_at) {
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

// After requireAdmin: only super admins (users, settings).
function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== 'superadmin') return next(forbidden('Only a super admin can do this.'));
  return next();
}

module.exports = { requireAdmin, requireAdminPage, requireSuperAdmin, loadAdmin };
