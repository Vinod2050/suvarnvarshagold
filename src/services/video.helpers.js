// Shared pieces for the YouTube video modules (advertisements and customer feedback).
const { activity } = require('../models');
const { validate } = require('../utils/validate');
const { badRequest, notFound } = require('../utils/response');
const { withVideoUrls } = require('../utils/youtube');
function videoFields(clean) {
  const out = { ...clean };
  if (clean.youtube_url) {
    out.youtube_id = clean.youtube_url.id;
    out.is_short = clean.youtube_url.isShort ? 1 : 0;
  }
  delete out.youtube_url;
  return out;
}

function makeCrudService({ model, schema, entity, label, beforeSave = (x) => x, describe }) {
  return {
    list: async (opts) => {
      const res = await model.list(opts);
      return { ...res, items: res.items.map(withVideoUrls) };
    },
    async create(body, adminId) {
      const clean = await beforeSave(validate(body, schema), null);
      const row = await model.create(clean, adminId);
      await activity.add(adminId, 'create', entity, row.id, describe(row));
      return withVideoUrls(row);
    },
    async update(id, body, adminId) {
      const existing = await model.get(id);
      if (!existing) throw notFound(label);
      const clean = await beforeSave(validate(body, schema, { partial: true }), existing);
      const row = await model.update(id, clean, adminId);
      await activity.add(adminId, 'update', entity, id, describe(row));
      return withVideoUrls(row);
    },
    async setStatus(id, status, allowed, adminId) {
      if (!allowed.includes(status)) throw badRequest('Choose a valid status', { status: 'Choose a valid status' });
      const row = await model.update(id, { status }, adminId);
      if (!row) throw notFound(label);
      await activity.add(adminId, 'status', entity, id, `${describe(row)} → ${status}`);
      return withVideoUrls(row);
    },
    async remove(id, adminId) {
      const row = await model.get(id);
      if (!row) throw notFound(label);
      await model.remove(id);
      await activity.add(adminId, 'delete', entity, id, describe(row));
      return row;
    },
  };
}

function publicVideo(r) {
  return {
    id: r.id,
    youtube_id: r.youtube_id,
    is_short: Boolean(r.is_short),
    title: { en: r.title_en, mr: r.title_mr || r.title_en },
    description: r.description_en !== undefined ? { en: r.description_en, mr: r.description_mr || r.description_en } : undefined,
    customer_name: r.customer_name,
    embed_url: r.embed_url,
    thumbnail_url: r.thumbnail_url,
  };
}

module.exports = { videoFields, makeCrudService, publicVideo };
