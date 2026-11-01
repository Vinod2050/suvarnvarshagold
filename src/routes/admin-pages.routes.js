// Admin panel pages: /admin/login (open) and /admin/<section> (signed in only).
const express = require('express');
const { requireAdminPage, loadAdmin } = require('../middleware/auth');
const { csrfToken } = require('../middleware/csrf');
const { adminPage, loginPage, ADMIN_PAGES, SUPER_PAGES } = require('../views/admin');

const router = express.Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get(['/', ''], (req, res) => res.redirect(302, '/admin/dashboard'));

router.get('/login', async (req, res, next) => {
  try {
    if (await loadAdmin(req)) return res.redirect(302, '/admin/dashboard');
    return res.type('html').send(loginPage());
  } catch (err) {
    return next(err);
  }
});

router.get('/:page', (req, res, next) => {
  if (!ADMIN_PAGES.has(req.params.page)) return next();
  return requireAdminPage(req, res, (err) => {
    if (err) return next(err);
    // Users and Settings: super admins only; other admins go back to the dashboard.
    if (SUPER_PAGES.has(req.params.page) && req.admin.role !== 'superadmin') return res.redirect(302, '/admin/dashboard');
    return res.type('html').send(adminPage(req.params.page, { user: req.admin, csrf: csrfToken(req) }));
  });
});

module.exports = { adminPagesRouter: router };
