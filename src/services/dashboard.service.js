// Numbers for the admin dashboard.
const db = require('../config/db');
const { activity } = require('../models');
const rateService = require('./goldRates.service');

async function stats() {
  const counts = await db.one(`
    SELECT
      (SELECT COUNT(*) FROM customer_feedback) AS feedback_total,
      (SELECT COUNT(*) FROM customer_feedback WHERE status = 'pending') AS feedback_pending,
      (SELECT COUNT(*) FROM customer_feedback WHERE status = 'approved') AS feedback_approved,
      (SELECT COUNT(*) FROM advertisements) AS ads_total,
      (SELECT COUNT(*) FROM advertisements WHERE status = 'active') AS ads_active,
      (SELECT COUNT(*) FROM products WHERE status = 'active') AS products_active,
      (SELECT COUNT(*) FROM faqs WHERE status = 'active') AS faqs_active`);
  const [rate, recent] = await Promise.all([rateService.latest(), activity.recent(10)]);
  return { counts, rate, recent };
}

module.exports = { stats };
