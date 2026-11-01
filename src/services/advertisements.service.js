// Advertisement videos (YouTube links only).
const { advertisements } = require('../models');
const { withVideoUrls } = require('../utils/youtube');
const { videoFields, makeCrudService, publicVideo } = require('./video.helpers');

const adSchema = {
  youtube_url: { type: 'youtube', required: true },
  title_en: { type: 'string', required: true, max: 150 },
  title_mr: { type: 'string', max: 150, default: '' },
  description_en: { type: 'text', max: 500, default: '' },
  description_mr: { type: 'text', max: 500, default: '' },
  status: { type: 'enum', values: ['active', 'inactive'], default: 'active' },
  sort_order: { type: 'int', min: -100000, max: 100000, default: 0 },
};

const adService = makeCrudService({
  model: advertisements,
  schema: adSchema,
  entity: 'advertisement',
  label: 'Advertisement',
  beforeSave: videoFields,
  describe: (r) => r.title_en,
});
adService.publicList = async () =>
  (await advertisements.all({ filters: { status: 'active' } })).slice(0, 20).map(withVideoUrls).map(publicVideo);

module.exports = adService;
