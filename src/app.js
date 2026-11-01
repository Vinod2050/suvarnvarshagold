// The Express application: security headers, sessions, API routes and the website files.
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const env = require('./config/env');
const db = require('./config/db');
const { publicRouter, authRouter, adminRouter } = require('./routes');
const { apiLimiter } = require('./middleware/rateLimits');
const { siteRouter } = require('./routes/site.routes');
const { adminPagesRouter } = require('./routes/admin-pages.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { compressResponses, compressedAssets } = require('./middleware/compress');
const { serveUpload } = require('./utils/upload');

const PUBLIC = path.join(env.root, 'public');
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

// ---------- security headers ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // The original pages use style="..." attributes (layout and scroll-in animations).
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://i.ytimg.com'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ['https://www.youtube-nocookie.com', 'https://www.google.com', 'https://maps.google.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        ...(env.isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    hsts: env.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: false, // YouTube and Google Maps frames
  }),
);
app.use((req, res, next) => {
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

// ---------- one site address (SEO) ----------
// On the live site, www.<domain> goes to <domain> (or the other way round, following SITE_URL), like the
// original .htaccess. Only the www / non-www twin is redirected, so hosting test addresses keep working.
if (env.isProduction && env.siteUrl) {
  const canonical = new URL(env.siteUrl);
  const twin = canonical.hostname.startsWith('www.') ? canonical.hostname.slice(4) : `www.${canonical.hostname}`;
  app.use((req, res, next) => (req.hostname === twin ? res.redirect(301, canonical.origin + req.originalUrl) : next()));
}

// ---------- compression (brotli / gzip) for pages and API replies ----------
app.use(compressResponses);

// Admin panel and API never appear in search results.
app.use(['/admin', '/api'], (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
});

// Only same-site pages call the API; extra origins can be allowed in CORS_ORIGINS.
app.use('/api', cors({ origin: (origin, cb) => cb(null, !origin ? false : env.corsOrigins.includes(origin)), credentials: true }));

// ---------- body parsing ----------
app.use('/api', express.json({ limit: '50kb' }));
app.use('/api', express.urlencoded({ extended: false, limit: '50kb' }));

// ---------- sessions (admin only, stored in MySQL) ----------
const sessionStore = new MySQLStore(
  { createDatabaseTable: true, clearExpired: true, checkExpirationInterval: 15 * 60 * 1000, expiration: 8 * 60 * 60 * 1000 },
  db.pool,
);
const sessionMiddleware = session({
  name: 'sv.sid',
  secret: env.sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  // 'auto': the cookie is marked Secure whenever the request is known to be HTTPS (directly, or through the
  // hosting proxy's X-Forwarded-Proto). If a proxy does not send that header, sign-in still works instead of
  // silently failing; HSTS keeps browsers on HTTPS anyway.
  cookie: { httpOnly: true, sameSite: 'strict', secure: env.isProduction ? 'auto' : false, maxAge: 8 * 60 * 60 * 1000, path: '/' },
});
// Sessions are only needed by the sign-in API, the admin API and the admin pages.
app.use(['/api/auth', '/api/admin', '/admin'], sessionMiddleware);

// ---------- API ----------
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, data: { db: 'up' } });
  } catch {
    res.status(503).json({ ok: false, error: 'Database is not reachable' });
  }
});
app.use('/api', apiLimiter);
app.use('/api/public', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// ---------- clean addresses ----------
// One address per page, as on the original site (no duplicate pages for Google):
// /about.html -> /about, /index.html -> /, /mr/index.html -> /mr, /about/ -> /about
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const q = req.originalUrl.slice(req.path.length);
  const m = req.path.match(/^(.*?)(\/index)?(\.html)?$/);
  if (req.path.endsWith('.html') || req.path.endsWith('/index')) {
    return res.redirect(301, (m[1] || '/') + q);
  }
  if (req.path.length > 1 && req.path.endsWith('/') && !req.path.startsWith('/admin/')) {
    return res.redirect(301, req.path.replace(/\/+$/, '') + q);
  }
  return next();
});

// ---------- admin pages (signed in only, except the login page) ----------
app.use('/admin', adminPagesRouter);

// ---------- uploaded images ----------
// Stored in the database (table uploaded_files), so they survive new ZIP uploads.
app.get('/uploads/*', serveUpload);

// ---------- website pages (original design + live data) and data.js ----------
app.use(siteRouter);

// ---------- website files (CSS, JS, images, fonts) ----------
// Fonts, images, logos and libraries never change name-for-content: 30 days. CSS/JS: 1 day.
const assetCache = (file) => (/[\\/](fonts|images|logo|vendor|og)[\\/]/.test(file) ? 'public, max-age=2592000' : 'public, max-age=86400');
app.use(compressedAssets(PUBLIC, assetCache));
app.use(
  express.static(PUBLIC, {
    index: false,
    dotfiles: 'ignore',
    redirect: false,
    setHeaders: (res, file) => res.set('Cache-Control', assetCache(file)),
  }),
);

app.use(notFoundHandler);
app.use(errorHandler);


module.exports = { app, sessionStore };
