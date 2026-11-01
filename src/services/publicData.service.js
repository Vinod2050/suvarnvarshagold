// What the public website may show: settings (business details), rates and the lists for each page.
// Used by both the public API and the server-rendered pages, so both always show the same data.
const settingsService = require('./settings.service');
const rateService = require('./goldRates.service');
const adService = require('./advertisements.service');
const feedbackService = require('./feedback.service');
const productService = require('./products.service');
const faqService = require('./faqs.service');

async function publicSettings() {
  const s = await settingsService.getAll();
  return {
    business_name: { en: s.business_name_en, mr: s.business_name_mr || s.business_name_en },
    company_name: { en: s.company_name_en || s.business_name_en, mr: s.company_name_mr || s.company_name_en || s.business_name_en },
    logo_path: s.logo_path,
    phone_primary: s.phone_primary,
    phone_secondary: s.phone_secondary,
    whatsapp_number: s.whatsapp_number,
    email: s.email,
    address: { en: s.address_en, mr: s.address_mr || s.address_en },
    map_link: s.map_link,
    map_embed_url: s.map_embed_url,
    hours: { en: s.hours_en, mr: s.hours_mr || s.hours_en },
    social: { facebook: s.facebook_url, instagram: s.instagram_url, youtube: s.youtube_url },
    show_silver: s.show_silver,
    show_18k: s.show_18k,
    saturday_offer_active: s.saturday_offer_active,
  };
}

// Hides 18K / silver when switched off in settings.
function publicRate(r, s) {
  if (!r) return null;
  return {
    effective_date: r.effective_date,
    updated_at: r.updated_at,
    gold_24k: Number(r.gold_24k),
    gold_22k: Number(r.gold_22k),
    gold_18k: s.show_18k && r.gold_18k !== null ? Number(r.gold_18k) : null,
    silver_kg: s.show_silver && r.silver_kg !== null ? Number(r.silver_kg) : null,
  };
}

async function latestRate() {
  const [s, r] = await Promise.all([settingsService.getAll(), rateService.latest()]);
  return publicRate(r, s);
}

async function rateHistory(days = 30) {
  const [s, rows] = await Promise.all([settingsService.getAll(), rateService.history(days)]);
  return rows.map((r) => publicRate(r, s));
}

// Loaders by name, so a page can list only what it needs.
const loaders = {
  rate: latestRate,
  history: () => rateHistory(30),
  advertisements: () => adService.publicList(),
  feedback: () => feedbackService.publicList(),
  products: () => productService.publicList(),
  faqs: () => faqService.publicList(),
};

async function load(needs = []) {
  const entries = await Promise.all(needs.map(async (n) => [n, await loaders[n]()]));
  return Object.fromEntries(entries);
}

module.exports = { publicSettings, publicRate, latestRate, rateHistory, load };
