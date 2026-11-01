// Frequently asked questions (English and Marathi), with display order.
const { faqs, activity } = require('../models');
const { validate } = require('../utils/validate');
const { badRequest, notFound } = require('../utils/response');
const faqSchema = {
  category: { type: 'enum', values: ['selling', 'pledged', 'buying', 'general'], default: 'general' },
  question_en: { type: 'string', required: true, max: 300 },
  answer_en: { type: 'text', required: true, max: 3000 },
  question_mr: { type: 'string', max: 300, default: '' },
  answer_mr: { type: 'text', max: 3000, default: '' },
  status: { type: 'enum', values: ['active', 'inactive'], default: 'active' },
};

const faqService = {
  list: (opts) => faqs.list(opts),
  async create(body, adminId) {
    const clean = validate(body, faqSchema);
    clean.sort_order = (await faqs.maxOrder()) + 10;
    const row = await faqs.create(clean, adminId);
    await activity.add(adminId, 'create', 'faq', row.id, row.question_en);
    return row;
  },
  async update(id, body, adminId) {
    const clean = validate(body, faqSchema, { partial: true });
    const row = await faqs.update(id, clean, adminId);
    if (!row) throw notFound('FAQ');
    await activity.add(adminId, 'update', 'faq', id, row.question_en);
    return row;
  },
  async setStatus(id, status, adminId) {
    if (!['active', 'inactive'].includes(status)) throw badRequest('Choose a valid status');
    const row = await faqs.update(id, { status }, adminId);
    if (!row) throw notFound('FAQ');
    await activity.add(adminId, 'status', 'faq', id, `${row.question_en} → ${status}`);
    return row;
  },
  // Moves one FAQ up or down by swapping its place with the neighbour.
  async move(id, direction, adminId) {
    if (!['up', 'down'].includes(direction)) throw badRequest('Choose up or down');
    const all = await faqs.all();
    const i = all.findIndex((f) => f.id === id);
    if (i < 0) throw notFound('FAQ');
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return all;
    [all[i], all[j]] = [all[j], all[i]];
    // Renumber everything 10, 20, 30... so equal sort values never cause ties.
    for (let k = 0; k < all.length; k += 1) {
      if (all[k].sort_order !== (k + 1) * 10) await faqs.update(all[k].id, { sort_order: (k + 1) * 10 }, adminId);
    }
    await activity.add(adminId, 'update', 'faq', id, `Moved ${direction}`);
    return faqs.all();
  },
  async remove(id, adminId) {
    const row = await faqs.get(id);
    if (!row) throw notFound('FAQ');
    await faqs.remove(id);
    await activity.add(adminId, 'delete', 'faq', id, row.question_en);
  },
  publicList: async () =>
    (await faqs.all({ filters: { status: 'active' } })).map((f) => ({
      id: f.id,
      category: f.category,
      question: { en: f.question_en, mr: f.question_mr || f.question_en },
      answer: { en: f.answer_en, mr: f.answer_mr || f.answer_en },
    })),
};

module.exports = faqService;
