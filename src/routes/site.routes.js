// Public website: the original pages (public/*.html, public/mr/*.html) served at the same addresses as the
// original site (/about, /mr, /mr/about ...), with live data from the database added on the server.
// /assets/js/data.js is generated from the database in the format the original site.js reads.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const env = require('../config/env');
const db = require('../config/db');
const publicData = require('../services/publicData.service');
const adService = require('../services/advertisements.service');
const feedbackService = require('../services/feedback.service');
const productService = require('../services/products.service');
const faqService = require('../services/faqs.service');
const live = require('../site/live');
const newPages = require('../site/newPages');

const PUBLIC = path.join(env.root, 'public');
const ORIGINAL_PAGES = ['about', 'services', 'sell-gold', 'release-pledged-gold', 'buy-gold', 'store', 'how-it-works', 'faq', 'contact', 'privacy-policy', 'terms'];
const NEW_PAGES = Object.keys(newPages.PAGES);
const ALL_PAGES = ['', ...ORIGINAL_PAGES, ...NEW_PAGES];

// Page files are read once (and again after a change on disk while developing).
const cache = new Map();
function readPage(rel) {
  const file = path.join(PUBLIC, rel);
  const stat = fs.statSync(file);
  const hit = cache.get(file);
  if (hit && (env.isProduction || hit.mtime === stat.mtimeMs)) return hit.html;
  const html = fs.readFileSync(file, 'utf8');
  cache.set(file, { html, mtime: stat.mtimeMs });
  return html;
}

const siteUrl = (req) => env.siteUrl || `${req.protocol}://${req.get('host')}`;

// If the database cannot be reached (e.g. hosting maintenance), pages still open with the content written
// in them (the original contact details and FAQs). The problem is logged at most once a minute.
let lastDbWarning = 0;
async function safe(promise, fallback) {
  try {
    return await promise;
  } catch (err) {
    if (Date.now() - lastDbWarning > 60000) {
      lastDbWarning = Date.now();
      console.error(`[${new Date().toISOString()}] Database not reachable, showing pages without live data: ${err.code || err.message}`);
    }
    return fallback;
  }
}
const FALLBACK_SETTINGS = {
  phone_primary: live.ORIGINAL.phone1,
  phone_secondary: live.ORIGINAL.phone2,
  whatsapp_number: live.ORIGINAL.whatsapp,
  address: { en: '', mr: '' },
  hours: { en: '', mr: '' },
  map_link: '',
  map_embed_url: '',
  logo_path: '',
  social: {},
  show_silver: true,
  show_18k: true,
  saturday_offer_active: true,
};

async function renderPage(req, slug, lang) {
  const dir = lang === 'mr' ? 'mr/' : '';
  const [settings, rate, faqs] = await Promise.all([
    safe(publicData.publicSettings(), FALLBACK_SETTINGS),
    safe(publicData.latestRate(), null),
    safe(faqService.publicList(), null),
  ]);
  let html;
  if (NEW_PAGES.includes(slug)) {
    const needs = newPages.PAGES[slug].needs;
    const data = await safe(publicData.load(needs), Object.fromEntries(needs.map((n) => [n, []])));
    html = newPages.build(slug, lang, readPage(`${dir}privacy-policy.html`), readPage(`${dir}index.html`), { query: req.query }, data);
  } else {
    html = readPage(`${dir}${slug || 'index'}.html`);
  }
  html = newPages.addFooterLinks(html, lang);
  html = live.applyOffer(html, settings.saturday_offer_active);
  if (faqs) html = live.applyFaqs(html, faqs, lang, slug === 'faq');
  html = live.applyRates(html, rate, lang, settings.phone_primary);
  html = live.applySettings(html, settings, lang, env.siteUrl || '');
  return html;
}

function send(res, html, status = 200) {
  res.status(status).set('Cache-Control', 'no-cache').type('html').send(html);
}

// ---------- data.js: rates, videos and products for site.js ----------
function videoItem(v) {
  return {
    id: v.id,
    youtubeId: v.youtube_id,
    short: Boolean(v.is_short),
    title: { en: v.title.en || v.customer_name || '', mr: v.title.mr || v.title.en || v.customer_name || '' },
    customerName: v.customer_name || undefined,
    consent: true,
    active: true,
    // Lists come sorted by the admin's order; site.js sorts by date, so give it dates in that order.
    createdAt: null,
  };
}

async function dataJs() {
  const [s, rate, ads, fb, products] = await Promise.all([
    publicData.publicSettings(),
    publicData.latestRate(),
    adService.publicList(),
    feedbackService.publicList(),
    productService.publicList(),
  ]);
  // Newest-first in site.js = the admin's order here.
  const order = (list) => list.map((v, i) => ({ ...videoItem(v), createdAt: new Date(Date.UTC(2100, 0, 1) - i * 60000).toISOString() }));
  const data = {
    version: 1,
    whatsapp: s.whatsapp_number,
    showSilver: s.show_silver,
    rates: rate
      ? {
          updatedAt: new Date(rate.updated_at).toISOString(),
          gold24k999: rate.gold_24k,
          gold22k: rate.gold_22k,
          gold18k: rate.gold_18k,
          silverKg: rate.silver_kg,
        }
      : null,
    adverts: order(ads),
    feedback: order(fb),
    products: products.map((p) => ({ id: p.id, code: p.code, category: p.category, weightGrams: p.weight_grams, image: p.image, name: p.name, description: p.description, active: true })),
  };
  // Sample products (shown with a "Sample" badge while the store has none) stay from the original file.
  const original = readPage('assets/js/data.js');
  const at = original.indexOf('window.SV_SAMPLE_PRODUCTS');
  const samples = at >= 0 ? original.slice(at) : '';
  return `/* Suvarnavarsha Gold - live content from the database */\nwindow.SV_DEFAULT_DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};\n\n${samples}`;
}

const router = express.Router();

router.get('/assets/js/data.js', async (req, res, next) => {
  try {
    // Database down: the original file with its built-in content (as the old PHP version did).
    const body = await safe(dataJs(), readPage('assets/js/data.js'));
    const etag = `"${crypto.createHash('sha1').update(body).digest('hex').slice(0, 20)}"`;
    res.set({ 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache', ETag: etag });
    if (req.get('if-none-match') === etag) return res.status(304).end();
    return res.send(body);
  } catch (err) {
    return next(err);
  }
});

// Addresses as on the original site: no trailing slash, /en/... goes to the English page.
// (Express treats "/mr/" and "/mr" as the same route, so check the real path.)
router.get(['/mr/', '/mr/index'], (req, res, next) => (req.path === '/mr' ? next() : res.redirect(301, '/mr')));
router.get(/^\/en(\/.*)?$/, (req, res) => res.redirect(301, req.params[0] && req.params[0] !== '/' ? req.params[0] : '/'));

function handler(lang) {
  return async (req, res, next) => {
    const slug = req.params.slug || '';
    if (!ALL_PAGES.includes(slug)) return next();
    try {
      return send(res, await renderPage(req, slug, lang));
    } catch (err) {
      return next(err);
    }
  };
}
router.get('/', handler('en'));
router.get('/mr', handler('mr'));
router.get('/mr/:slug', handler('mr'));
router.get('/:slug', handler('en'));

// Sitemap with real "last changed" dates: pages showing today's rate change when the rate is saved, the
// FAQ page when a FAQ changes. Other pages give no date (a date that is always "today" is ignored by Google).
const RATE_PAGES = new Set(['', 'sell-gold', 'services', 'gold-rate']);
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const base = siteUrl(req);
    const [rate, faq] = await Promise.all([
      db.one('SELECT MAX(updated_at) AS t FROM gold_rates'),
      db.one('SELECT MAX(updated_at) AS t FROM faqs'),
    ]);
    const day = (t) => (t ? new Date(t).toISOString().slice(0, 10) : null);
    const lastmod = (slug) => (RATE_PAGES.has(slug) ? day(rate.t) : slug === 'faq' ? day(faq.t) : null);
    const loc = (slug, lang) => `${base}${lang === 'mr' ? (slug ? `/mr/${slug}` : '/mr') : `/${slug}`}`;
    const rows = ALL_PAGES.map((slug) => {
      const alt = `<xhtml:link rel="alternate" hreflang="en-IN" href="${loc(slug, 'en')}"/><xhtml:link rel="alternate" hreflang="mr-IN" href="${loc(slug, 'mr')}"/><xhtml:link rel="alternate" hreflang="x-default" href="${loc(slug, 'en')}"/>`;
      const lm = lastmod(slug) ? `<lastmod>${lastmod(slug)}</lastmod>` : '';
      return ['en', 'mr'].map((l) => `<url><loc>${loc(slug, l)}</loc>${lm}${alt}</url>`).join('');
    }).join('\n');
    return res.type('application/xml').set('Cache-Control', 'public, max-age=3600')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows}\n</urlset>\n`);
  } catch (err) {
    return next(err);
  }
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600')
    .send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteUrl(req)}/sitemap.xml\n`);
});

// 404 page (original design) for unknown addresses.
// The original site has one 404 page (English).
async function renderNotFound(req, res) {
  const [settings, faqs] = await Promise.all([safe(publicData.publicSettings(), FALLBACK_SETTINGS), safe(faqService.publicList(), null)]);
  let html = readPage('404.html');
  html = newPages.addFooterLinks(html, 'en');
  if (faqs) html = live.applyFaqs(html, faqs, 'en', false);
  html = live.applySettings(html, settings, 'en', env.siteUrl || '');
  // Relative links of 404.html are written for the site root; make them work from any depth.
  html = html.replace('<head>', '<head><base href="/">');
  send(res, html, 404);
}

module.exports = { siteRouter: router, renderNotFound };
