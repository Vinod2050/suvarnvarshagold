// All table models. Special queries live next to the model that owns the table.
const db = require('../config/db');
const { makeModel } = require('./crud');

const goldRates = makeModel({
  table: 'gold_rates',
  columns: ['effective_date', 'gold_24k', 'gold_22k', 'gold_18k', 'silver_kg'],
  orderBy: 'effective_date DESC, id DESC',
});
// Newest rate whose effective date is today or earlier (Indian date).
goldRates.latest = (today) =>
  db.one('SELECT * FROM gold_rates WHERE effective_date <= ? ORDER BY effective_date DESC, id DESC LIMIT 1', [today]);
// One row per day (the last save of each day), newest first.
goldRates.history = (today, days = 30) =>
  db.query(
    `SELECT r.* FROM gold_rates r
     JOIN (SELECT MAX(id) AS id FROM gold_rates WHERE effective_date <= ? GROUP BY effective_date) last ON last.id = r.id
     ORDER BY r.effective_date DESC LIMIT ${Number(days)}`,
    [today],
  );

const advertisements = makeModel({
  table: 'advertisements',
  columns: ['youtube_id', 'is_short', 'title_en', 'title_mr', 'description_en', 'description_mr', 'status', 'sort_order'],
  searchColumns: ['title_en', 'title_mr', 'description_en'],
  filterColumns: ['status'],
  orderBy: 'sort_order ASC, id DESC',
});

const feedback = makeModel({
  table: 'customer_feedback',
  columns: ['customer_name', 'youtube_id', 'is_short', 'title_en', 'title_mr', 'consent', 'status', 'sort_order'],
  searchColumns: ['customer_name', 'title_en', 'title_mr'],
  filterColumns: ['status'],
  orderBy: 'sort_order ASC, id DESC',
});
feedback.publicList = () =>
  db.query("SELECT * FROM customer_feedback WHERE status = 'approved' AND consent = 1 ORDER BY sort_order ASC, id DESC LIMIT 50");

const products = makeModel({
  table: 'products',
  columns: ['code', 'category', 'weight_grams', 'image', 'name_en', 'name_mr', 'description_en', 'description_mr', 'status', 'sort_order'],
  searchColumns: ['code', 'name_en', 'name_mr'],
  filterColumns: ['status', 'category'],
  orderBy: 'sort_order ASC, weight_grams ASC, id ASC',
});
products.byCode = (code) => db.one('SELECT * FROM products WHERE code = ?', [code]);

const faqs = makeModel({
  table: 'faqs',
  columns: ['category', 'question_en', 'answer_en', 'question_mr', 'answer_mr', 'status', 'sort_order'],
  searchColumns: ['question_en', 'question_mr', 'answer_en'],
  filterColumns: ['status', 'category'],
  orderBy: 'sort_order ASC, id ASC',
});
faqs.maxOrder = () => db.one('SELECT COALESCE(MAX(sort_order), 0) AS n FROM faqs').then((r) => r.n);

const adminUsers = {
  count: () => db.one('SELECT COUNT(*) AS n FROM admin_users').then((r) => r.n),
  byUsername: (username) => db.one('SELECT * FROM admin_users WHERE username = ?', [username]),
  byId: (id) => db.one('SELECT id, username, display_name, status, last_login_at, created_at FROM admin_users WHERE id = ?', [id]),
  hashById: (id) => db.one('SELECT password_hash FROM admin_users WHERE id = ?', [id]).then((r) => r && r.password_hash),
  create: (username, passwordHash, displayName = '') =>
    db.query('INSERT INTO admin_users (username, password_hash, display_name) VALUES (?, ?, ?)', [username, passwordHash, displayName]),
  setPassword: (id, passwordHash) => db.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [passwordHash, id]),
  touchLogin: (id) => db.query('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [id]),
};

const loginAttempts = {
  add: (ipHash, username) => db.query('INSERT INTO login_attempts (ip_hash, username) VALUES (?, ?)', [ipHash, username]),
  recent: (ipHash, username, minutes) =>
    db
      .one(
        `SELECT
           (SELECT COUNT(*) FROM login_attempts WHERE ip_hash = ? AND created_at > (UTC_TIMESTAMP() - INTERVAL ? MINUTE)) AS by_ip,
           (SELECT COUNT(*) FROM login_attempts WHERE username = ? AND created_at > (UTC_TIMESTAMP() - INTERVAL ? MINUTE)) AS by_user`,
        [ipHash, minutes, username, minutes],
      ),
  clear: (ipHash, username) => db.query('DELETE FROM login_attempts WHERE ip_hash = ? OR username = ?', [ipHash, username]),
  prune: () => db.query('DELETE FROM login_attempts WHERE created_at < (UTC_TIMESTAMP() - INTERVAL 1 DAY)'),
};

const settings = {
  all: () => db.query('SELECT skey, svalue, updated_at FROM website_settings'),
  async setMany(values, adminId) {
    await db.transaction(async (conn) => {
      for (const [key, value] of Object.entries(values)) {
        await conn.execute(
          'INSERT INTO website_settings (skey, svalue, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE svalue = VALUES(svalue), updated_by = VALUES(updated_by)',
          [key, value, adminId],
        );
      }
    });
  },
};

const activity = {
  add: (adminId, action, entity, entityId, details) =>
    db.query('INSERT INTO activity_logs (admin_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)', [
      adminId,
      action,
      entity,
      entityId,
      String(details || '').slice(0, 300),
    ]),
  recent: (limit = 10) =>
    db.query(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.created_at, u.username
       FROM activity_logs a LEFT JOIN admin_users u ON u.id = a.admin_id
       ORDER BY a.created_at DESC, a.id DESC LIMIT ${Number(limit)}`,
    ),
};

module.exports = { goldRates, advertisements, feedback, products, faqs, adminUsers, loginAttempts, settings, activity };
