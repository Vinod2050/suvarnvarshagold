// Gold and silver rates: validation, history and the latest rate for the website.
const { goldRates, activity } = require('../models');
const { validate } = require('../utils/validate');
const { badRequest, notFound } = require('../utils/response');
const { todayIndia } = require('../utils/security');

const RATE = { type: 'number', min: 1, max: 100000000 };
const rateSchema = {
  effective_date: { type: 'date', required: true },
  gold_24k: { ...RATE, required: true },
  gold_22k: { ...RATE, required: true },
  gold_18k: RATE,
  silver_kg: RATE,
};

function checkRateDate(date) {
  // Allow up to 7 days ahead (rates entered the night before), and no further back than 2 years.
  const today = todayIndia();
  const max = todayIndia(new Date(Date.now() + 7 * 86400000));
  const min = todayIndia(new Date(Date.now() - 730 * 86400000));
  if (date > max || date < min) {
    throw badRequest('Please correct the highlighted fields', { effective_date: `Choose a date between ${min} and ${max}` });
  }
  return today;
}

function checkRateOrder(r) {
  if (r.gold_22k !== undefined && r.gold_24k !== undefined && r.gold_22k > r.gold_24k) {
    throw badRequest('Please correct the highlighted fields', { gold_22k: '22K rate cannot be higher than the 24K rate' });
  }
  if (r.gold_18k && r.gold_22k && r.gold_18k > r.gold_22k) {
    throw badRequest('Please correct the highlighted fields', { gold_18k: '18K rate cannot be higher than the 22K rate' });
  }
}

const rateService = {
  list: (opts) => goldRates.list(opts),
  async create(body, adminId) {
    const clean = validate(body, rateSchema);
    checkRateDate(clean.effective_date);
    checkRateOrder(clean);
    const row = await goldRates.create(clean, adminId);
    await activity.add(adminId, 'create', 'gold_rate', row.id, `24K ${clean.gold_24k}, 22K ${clean.gold_22k} for ${clean.effective_date}`);
    return row;
  },
  async update(id, body, adminId) {
    const clean = validate(body, rateSchema);
    checkRateDate(clean.effective_date);
    checkRateOrder(clean);
    const row = await goldRates.update(id, clean, adminId);
    if (!row) throw notFound('Rate');
    await activity.add(adminId, 'update', 'gold_rate', id, `24K ${clean.gold_24k}, 22K ${clean.gold_22k} for ${clean.effective_date}`);
    return row;
  },
  async remove(id, adminId) {
    if (!(await goldRates.remove(id))) throw notFound('Rate');
    await activity.add(adminId, 'delete', 'gold_rate', id, 'Rate row deleted');
  },
  latest: () => goldRates.latest(todayIndia()),
  history: (days) => goldRates.history(todayIndia(), days),
};

module.exports = rateService;
