// Store products (24K coins, bars, Vedhani). No prices anywhere.
const { products, activity } = require('../models');
const { validate } = require('../utils/validate');
const { badRequest, notFound } = require('../utils/response');
const { removeUpload } = require('../utils/upload');
const productSchema = {
  code: { type: 'string', required: true, max: 40 },
  category: { type: 'enum', required: true, values: ['coin', 'bar', 'biscuit'] },
  weight_grams: { type: 'number', required: true, min: 0.001, max: 100000 },
  name_en: { type: 'string', required: true, max: 150 },
  name_mr: { type: 'string', max: 150, default: '' },
  description_en: { type: 'text', max: 1000, default: '' },
  description_mr: { type: 'text', max: 1000, default: '' },
  status: { type: 'enum', values: ['active', 'inactive'], default: 'active' },
  sort_order: { type: 'int', min: -100000, max: 100000, default: 0 },
};

const productService = {
  list: (opts) => products.list(opts),
  async save(id, body, imagePath, adminId) {
    const existing = id ? await products.get(id) : null;
    if (id && !existing) throw notFound('Product');
    const clean = validate(body, productSchema, { partial: Boolean(id) });
    if (clean.code !== undefined) {
      clean.code = clean.code.toUpperCase();
      if (!/^[A-Z0-9-]{2,40}$/.test(clean.code)) throw badRequest('Please correct the highlighted fields', { code: 'Use letters, numbers and dashes only' });
      const same = await products.byCode(clean.code);
      if (same && (!existing || same.id !== existing.id)) throw badRequest('Please correct the highlighted fields', { code: 'This product code is already used' });
    }
    if (imagePath) clean.image = imagePath;
    if (!id && !clean.image) throw badRequest('Please correct the highlighted fields', { image: 'Please add a product photo' });
    const row = id ? await products.update(id, clean, adminId) : await products.create(clean, adminId);
    if (imagePath && existing && existing.image !== imagePath) await removeUpload(existing.image);
    await activity.add(adminId, id ? 'update' : 'create', 'product', row.id, `${row.code} ${row.name_en}`);
    return row;
  },
  async setStatus(id, status, adminId) {
    if (!['active', 'inactive'].includes(status)) throw badRequest('Choose a valid status');
    const row = await products.update(id, { status }, adminId);
    if (!row) throw notFound('Product');
    await activity.add(adminId, 'status', 'product', id, `${row.code} → ${status}`);
    return row;
  },
  async remove(id, adminId) {
    const row = await products.get(id);
    if (!row) throw notFound('Product');
    await products.remove(id);
    await removeUpload(row.image);
    await activity.add(adminId, 'delete', 'product', id, `${row.code} ${row.name_en}`);
  },
  publicList: async () =>
    (await products.all({ filters: { status: 'active' } })).map((p) => ({
      id: p.id,
      code: p.code,
      category: p.category,
      weight_grams: Number(p.weight_grams),
      image: p.image,
      name: { en: p.name_en, mr: p.name_mr || p.name_en },
      description: { en: p.description_en, mr: p.description_mr || p.description_en },
    })),
};

module.exports = productService;
