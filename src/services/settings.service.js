// Website settings: business details, contact, links, hours and display switches.
const { settings, activity } = require('../models');
const { validate } = require('../utils/validate');
const { badRequest } = require('../utils/response');

// Every setting the admin can change, with its validation rule.
const SCHEMA = {
  business_name_en: { type: 'string', required: true, max: 100 },
  business_name_mr: { type: 'string', max: 100 },
  company_name_en: { type: 'string', max: 150 },
  company_name_mr: { type: 'string', max: 150 },
  phone_primary: { type: 'phone', required: true },
  phone_secondary: { type: 'phone' },
  whatsapp_number: { type: 'string', required: true, max: 15 },
  email: { type: 'email' },
  address_en: { type: 'string', required: true, max: 300 },
  address_mr: { type: 'string', max: 300 },
  map_link: { type: 'url' },
  map_embed_url: { type: 'url', max: 1000 },
  hours_en: { type: 'text', max: 300 },
  hours_mr: { type: 'text', max: 300 },
  facebook_url: { type: 'url' },
  instagram_url: { type: 'url' },
  youtube_url: { type: 'url' },
  show_silver: { type: 'bool' },
  show_18k: { type: 'bool' },
  saturday_offer_active: { type: 'bool' },
};

const BOOLS = Object.keys(SCHEMA).filter((k) => SCHEMA[k].type === 'bool');
const CACHE_MS = 30 * 1000;
let cache = null;

async function getAll() {
  if (cache && cache.at > Date.now() - CACHE_MS) return cache.data;
  const rows = await settings.all();
  const data = { logo_path: '/logo/suvarnavarsha-logo-v2-transparent-384.webp' };
  for (const key of Object.keys(SCHEMA)) data[key] = BOOLS.includes(key) ? false : '';
  for (const r of rows) data[r.skey] = BOOLS.includes(r.skey) ? r.svalue === '1' : r.svalue;
  cache = { at: Date.now(), data };
  return data;
}

function clearCache() {
  cache = null;
}

// Only Google Maps links may be embedded in the page frame.
function checkMapEmbed(url) {
  if (!url) return;
  const u = new URL(url);
  const okHost = ['www.google.com', 'google.com', 'maps.google.com'].includes(u.hostname);
  if (!okHost || u.protocol !== 'https:') {
    throw badRequest('Please correct the highlighted fields', { map_embed_url: 'Use the Google Maps "Embed a map" link (https://www.google.com/maps/...)' });
  }
}

async function update(body, adminId) {
  const clean = validate(body, SCHEMA, { partial: true });
  if (clean.whatsapp_number !== undefined) {
    const digits = String(clean.whatsapp_number).replace(/\D/g, '');
    const normalised = digits.length === 10 ? `91${digits}` : digits;
    if (!/^91[6-9]\d{9}$/.test(normalised)) {
      throw badRequest('Please correct the highlighted fields', { whatsapp_number: 'Enter the 10-digit WhatsApp mobile number' });
    }
    clean.whatsapp_number = normalised;
  }
  checkMapEmbed(clean.map_embed_url);
  const values = {};
  for (const [k, v] of Object.entries(clean)) values[k] = typeof v === 'boolean' ? (v ? '1' : '0') : v === null ? '' : String(v);
  await settings.setMany(values, adminId);
  clearCache();
  await activity.add(adminId, 'update', 'settings', null, `Changed: ${Object.keys(values).join(', ')}`);
  return getAll();
}

async function setLogo(webPath, adminId) {
  await settings.setMany({ logo_path: webPath }, adminId);
  clearCache();
  await activity.add(adminId, 'update', 'settings', null, 'Logo changed');
  return getAll();
}

module.exports = { getAll, update, setLogo, clearCache, SCHEMA };
