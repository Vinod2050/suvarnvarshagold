// Admin endpoints for every module. Each handler: read the request, call the service, send the reply.
const rateService = require('../services/goldRates.service');
const adService = require('../services/advertisements.service');
const feedbackService = require('../services/feedback.service');
const productService = require('../services/products.service');
const faqService = require('../services/faqs.service');
const settingsService = require('../services/settings.service');
const dashboardService = require('../services/dashboard.service');
const usersService = require('../services/users.service');
const { ok } = require('../utils/response');
const { listOptions, parseId } = require('../utils/validate');
const { saveImage, removeUpload } = require('../utils/upload');

const id = (req) => parseId(req.params.id);
const enumOrNull = (value, list) => (list.includes(value) ? value : null);

const goldRates = {
  list: async (req, res) => ok(res, await rateService.list(listOptions(req.query))),
  create: async (req, res) => ok(res, await rateService.create(req.body, req.admin.id), 201),
  update: async (req, res) => ok(res, await rateService.update(id(req), req.body, req.admin.id)),
  remove: async (req, res) => ok(res, await rateService.remove(id(req), req.admin.id)),
};

function videoController(service, statuses) {
  return {
    list: async (req, res) => {
      const o = listOptions(req.query, { statuses });
      ok(res, await service.list({ ...o, filters: { status: o.status } }));
    },
    create: async (req, res) => ok(res, await service.create(req.body, req.admin.id), 201),
    update: async (req, res) => ok(res, await service.update(id(req), req.body, req.admin.id)),
    setStatus: async (req, res) => ok(res, await service.setStatus(id(req), req.body && req.body.status, statuses, req.admin.id)),
    remove: async (req, res) => {
      await service.remove(id(req), req.admin.id);
      ok(res);
    },
  };
}

const advertisements = videoController(adService, ['active', 'inactive']);
const feedback = videoController(feedbackService, ['pending', 'approved', 'rejected']);

const products = {
  list: async (req, res) => {
    const o = listOptions(req.query, { statuses: ['active', 'inactive'] });
    ok(res, await productService.list({ ...o, filters: { status: o.status, category: enumOrNull(req.query.category, ['coin', 'bar', 'biscuit']) } }));
  },
  // multipart/form-data: text fields in req.body, optional photo in req.file
  save: async (req, res) => {
    const productId = req.params.id ? id(req) : null;
    const image = await saveImage(req.file, 'products');
    try {
      const row = await productService.save(productId, req.body, image, req.admin.id);
      ok(res, row, productId ? 200 : 201);
    } catch (err) {
      await removeUpload(image); // do not keep a photo for a product that was not saved
      throw err;
    }
  },
  setStatus: async (req, res) => ok(res, await productService.setStatus(id(req), req.body && req.body.status, req.admin.id)),
  remove: async (req, res) => {
    await productService.remove(id(req), req.admin.id);
    ok(res);
  },
};

const faqs = {
  list: async (req, res) => {
    const o = listOptions(req.query, { statuses: ['active', 'inactive'], maxPageSize: 200 });
    ok(res, await faqService.list({ ...o, filters: { status: o.status, category: enumOrNull(req.query.category, ['selling', 'pledged', 'buying', 'general']) } }));
  },
  create: async (req, res) => ok(res, await faqService.create(req.body, req.admin.id), 201),
  update: async (req, res) => ok(res, await faqService.update(id(req), req.body, req.admin.id)),
  setStatus: async (req, res) => ok(res, await faqService.setStatus(id(req), req.body && req.body.status, req.admin.id)),
  move: async (req, res) => ok(res, await faqService.move(id(req), req.body && req.body.direction, req.admin.id)),
  remove: async (req, res) => {
    await faqService.remove(id(req), req.admin.id);
    ok(res);
  },
};

const settings = {
  get: async (req, res) => ok(res, await settingsService.getAll()),
  update: async (req, res) => ok(res, await settingsService.update(req.body, req.admin.id)),
  logo: async (req, res) => {
    const image = await saveImage(req.file, 'logo');
    if (!image) return ok(res, await settingsService.getAll());
    const before = (await settingsService.getAll()).logo_path;
    const data = await settingsService.setLogo(image, req.admin.id);
    await removeUpload(before);
    return ok(res, data);
  },
};

const users = {
  // Same shape as the other lists (the admin list screen pages through items).
  list: async (req, res) => {
    const items = await usersService.list();
    ok(res, { items, total: items.length, page: 1, pageSize: Math.max(1, items.length), pages: 1 });
  },
  create: async (req, res) => ok(res, await usersService.create(req.body, req.admin.id), 201),
  update: async (req, res) => ok(res, await usersService.update(id(req), req.body, req.admin.id)),
  resetPassword: async (req, res) => ok(res, await usersService.resetPassword(id(req), req.body, req.admin.id)),
  setLocked: async (req, res) => ok(res, await usersService.setLocked(id(req), Boolean(req.body && req.body.locked), req.admin.id)),
  remove: async (req, res) => {
    await usersService.remove(id(req), req.admin.id);
    ok(res);
  },
};

const dashboard = {
  stats: async (req, res) => ok(res, await dashboardService.stats()),
};

module.exports = { goldRates, advertisements, feedback, products, faqs, settings, users, dashboard };
