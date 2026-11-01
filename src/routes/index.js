// All API routes.
//   /api/public/*  website data (no sign-in)
//   /api/auth/*    sign-in, setup, sign-out, password
//   /api/admin/*   admin panel (signed in + CSRF token)
const express = require('express');
const { wrap } = require('../utils/response');
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { verifyCsrf, sameOrigin } = require('../middleware/csrf');
const { loginLimiter } = require('../middleware/rateLimits');
const { imageUpload } = require('../utils/upload');
const pub = require('../controllers/public.controller');
const auth = require('../controllers/auth.controller');
const admin = require('../controllers/admin.controllers');

// ---------- public ----------
const publicRouter = express.Router();
publicRouter.get('/home', wrap(pub.home));
publicRouter.get('/settings', wrap(pub.settings));
publicRouter.get('/gold-rates', wrap(pub.goldRates));
publicRouter.get('/advertisements', wrap(pub.advertisements));
publicRouter.get('/feedback', wrap(pub.feedback));
publicRouter.get('/products', wrap(pub.products));
publicRouter.get('/faqs', wrap(pub.faqs));

// ---------- auth ----------
const authRouter = express.Router();
authRouter.use(sameOrigin);
authRouter.get('/status', wrap(auth.status));
authRouter.post('/login', loginLimiter, verifyCsrf, wrap(auth.login));
authRouter.post('/setup', loginLimiter, verifyCsrf, wrap(auth.setup));
authRouter.post('/logout', verifyCsrf, wrap(auth.logout));
authRouter.get('/me', requireAdmin, wrap(auth.me));
authRouter.put('/password', requireAdmin, verifyCsrf, loginLimiter, wrap(auth.changePassword));

// ---------- admin ----------
const adminRouter = express.Router();
adminRouter.use(sameOrigin, requireAdmin, verifyCsrf);
adminRouter.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

adminRouter.get('/dashboard', wrap(admin.dashboard.stats));

adminRouter.get('/gold-rates', wrap(admin.goldRates.list));
adminRouter.post('/gold-rates', wrap(admin.goldRates.create));
adminRouter.put('/gold-rates/:id', wrap(admin.goldRates.update));
adminRouter.delete('/gold-rates/:id', wrap(admin.goldRates.remove));

for (const [path, c] of [['advertisements', admin.advertisements], ['feedback', admin.feedback]]) {
  adminRouter.get(`/${path}`, wrap(c.list));
  adminRouter.post(`/${path}`, wrap(c.create));
  adminRouter.put(`/${path}/:id`, wrap(c.update));
  adminRouter.patch(`/${path}/:id/status`, wrap(c.setStatus));
  adminRouter.delete(`/${path}/:id`, wrap(c.remove));
}

adminRouter.get('/products', wrap(admin.products.list));
adminRouter.post('/products', imageUpload.single('image'), wrap(admin.products.save));
adminRouter.put('/products/:id', imageUpload.single('image'), wrap(admin.products.save));
adminRouter.patch('/products/:id/status', wrap(admin.products.setStatus));
adminRouter.delete('/products/:id', wrap(admin.products.remove));

adminRouter.get('/faqs', wrap(admin.faqs.list));
adminRouter.post('/faqs', wrap(admin.faqs.create));
adminRouter.put('/faqs/:id', wrap(admin.faqs.update));
adminRouter.patch('/faqs/:id/status', wrap(admin.faqs.setStatus));
adminRouter.patch('/faqs/:id/move', wrap(admin.faqs.move));
adminRouter.delete('/faqs/:id', wrap(admin.faqs.remove));


// Super admin only: website settings and user accounts
adminRouter.get('/settings', requireSuperAdmin, wrap(admin.settings.get));
adminRouter.put('/settings', requireSuperAdmin, wrap(admin.settings.update));
adminRouter.post('/settings/logo', requireSuperAdmin, imageUpload.single('image'), wrap(admin.settings.logo));

adminRouter.get('/users', requireSuperAdmin, wrap(admin.users.list));
adminRouter.post('/users', requireSuperAdmin, wrap(admin.users.create));
adminRouter.put('/users/:id', requireSuperAdmin, wrap(admin.users.update));
adminRouter.put('/users/:id/password', requireSuperAdmin, wrap(admin.users.resetPassword));
adminRouter.patch('/users/:id/lock', requireSuperAdmin, wrap(admin.users.setLocked));
adminRouter.delete('/users/:id', requireSuperAdmin, wrap(admin.users.remove));

module.exports = { publicRouter, authRouter, adminRouter };
