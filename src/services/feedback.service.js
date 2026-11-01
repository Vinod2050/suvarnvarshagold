// Customer feedback videos (YouTube). Shown on the website only when approved and the customer gave consent.
const { feedback } = require('../models');
const { badRequest, notFound } = require('../utils/response');
const { withVideoUrls } = require('../utils/youtube');
const { videoFields, makeCrudService, publicVideo } = require('./video.helpers');

const feedbackSchema = {
  youtube_url: { type: 'youtube', required: true },
  customer_name: { type: 'string', required: true, max: 100 },
  title_en: { type: 'string', max: 150, default: '' },
  title_mr: { type: 'string', max: 150, default: '' },
  consent: { type: 'bool' },
  status: { type: 'enum', values: ['pending', 'approved', 'rejected'], default: 'pending' },
  sort_order: { type: 'int', min: -100000, max: 100000, default: 0 },
};

const feedbackService = makeCrudService({
  model: feedback,
  schema: feedbackSchema,
  entity: 'feedback',
  label: 'Feedback video',
  beforeSave: (clean, existing) => {
    const out = videoFields(clean);
    const consent = out.consent !== undefined ? out.consent : existing && existing.consent;
    const status = out.status || (existing && existing.status);
    if (status === 'approved' && !consent) {
      throw badRequest('Please correct the highlighted fields', { consent: 'Tick consent before approving: the customer must agree to be shown' });
    }
    if (out.consent !== undefined) out.consent = out.consent ? 1 : 0;
    return out;
  },
  describe: (r) => r.customer_name,
});
// Approving needs consent too.
const baseSetStatus = feedbackService.setStatus;
feedbackService.setStatus = async (id, status, allowed, adminId) => {
  const row = await feedback.get(id);
  if (!row) throw notFound('Feedback video');
  if (status === 'approved' && !row.consent) {
    throw badRequest('This customer has not given consent. Edit the video and tick consent first.');
  }
  return baseSetStatus(id, status, allowed, adminId);
};
feedbackService.publicList = async () => (await feedback.publicList()).map(withVideoUrls).map(publicVideo);

module.exports = feedbackService;
