// Public website endpoints (no sign-in). Short cache so rate changes show within a minute.
const adService = require('../services/advertisements.service');
const feedbackService = require('../services/feedback.service');
const productService = require('../services/products.service');
const faqService = require('../services/faqs.service');
const publicData = require('../services/publicData.service');
const { ok } = require('../utils/response');

const cache = (res, seconds = 60) => res.set('Cache-Control', `public, max-age=${seconds}`);

async function settings(req, res) {
  cache(res);
  ok(res, await publicData.publicSettings());
}

async function goldRates(req, res) {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
  const [latest, history] = await Promise.all([publicData.latestRate(), publicData.rateHistory(days)]);
  cache(res);
  ok(res, { latest, history });
}

async function advertisements(req, res) {
  cache(res, 300);
  ok(res, await adService.publicList());
}

async function feedback(req, res) {
  cache(res, 300);
  ok(res, await feedbackService.publicList());
}

async function products(req, res) {
  cache(res, 300);
  ok(res, await productService.publicList());
}

async function faqs(req, res) {
  cache(res, 300);
  ok(res, await faqService.publicList());
}

// Everything the home page needs in one request.
async function home(req, res) {
  const [st, rate, ads, fb, fq] = await Promise.all([
    publicData.publicSettings(),
    publicData.latestRate(),
    adService.publicList(),
    feedbackService.publicList(),
    faqService.publicList(),
  ]);
  cache(res);
  ok(res, { settings: st, rate, advertisements: ads, feedback: fb.slice(0, 6), faqs: fq.slice(0, 5) });
}

module.exports = { settings, goldRates, advertisements, feedback, products, faqs, home };
