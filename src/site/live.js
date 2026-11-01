// Puts live data from the database into the original website pages (public/*.html, public/mr/*.html),
// without changing their design: contact details from Settings, today's rate, FAQs and the Saturday offer.
// The pages keep the original markup; only text and links are swapped.
const { esc, inr, phoneText } = require('../views/util');

// Values written into the original pages. They are replaced when the admin changes the setting.
const ORIGINAL = {
  phone1: '8805942424',
  phone2: '8805982424',
  whatsapp: '918805942424',
  addressEn: 'Second Floor – 239, VTP Altitude, Near Shell Petrol Pump, Dange Chowk, Pune – 411033, Maharashtra',
  addressMr: 'दुसरा मजला – 239, व्हीटीपी अल्टिट्यूड, शेल पेट्रोल पंपाजवळ, डांगे चौक, पुणे – 411033, महाराष्ट्र',
  hoursEn: 'Call us for today’s timings',
  hoursMr: 'आजच्या वेळेसाठी कॉल करा',
  mapLink: 'https://www.google.com/maps/search/?api=1&amp;query=VTP+Altitude+Dange+Chowk+Pune+411033',
  site: 'https://suvarnvarshagold.com',
};

const replaceAll = (html, from, to) => (from === to || !from ? html : html.split(from).join(to));

// ---------- settings ----------
function applySettings(html, s, lang, siteUrl) {
  let out = html;
  // WhatsApp first (its number contains the phone number), via a placeholder so the phone step skips it.
  out = out.replace(/wa\.me\/918805942424/g, 'wa.me/\u0000WA\u0000');
  if (s.phone_primary && s.phone_primary !== ORIGINAL.phone1) {
    out = replaceAll(out, ORIGINAL.phone1, s.phone_primary);
    out = replaceAll(out, phoneText(ORIGINAL.phone1), phoneText(s.phone_primary));
  }
  if (s.phone_secondary !== ORIGINAL.phone2) {
    if (s.phone_secondary) {
      out = replaceAll(out, ORIGINAL.phone2, s.phone_secondary);
      out = replaceAll(out, phoneText(ORIGINAL.phone2), phoneText(s.phone_secondary));
    } else {
      // Second number removed: drop every place that shows it (top bar "/ number", list items, links, schema).
      out = out.replace(/<span class="flex items-center gap-2"><span aria-hidden="true" class="text-line-strong">\/<\/span><a href="tel:\+918805982424"[^>]*>[^<]*<\/a><\/span>/g, '');
      out = out.replace(/<li\b[^>]*>(?:(?!<\/?li\b)[\s\S])*?(?:tel:\+918805982424|8805-98-2424)(?:(?!<\/?li\b)[\s\S])*?<\/li>/g, '');
      out = out.replace(/<a [^>]*href="tel:\+918805982424"[^>]*>[\s\S]*?<\/a>/g, '');
      out = out.replace(/<span class="block whitespace-nowrap">8805-98-2424<\/span>/g, '');
      out = out.replace(/,\{"@type":"ContactPoint","telephone":"\+918805982424"[^{}]*\}/g, '');
    }
  }
  out = out.replace(/\u0000WA\u0000/g, s.whatsapp_number || ORIGINAL.whatsapp);

  const addrEn = s.address.en;
  const addrMr = s.address.mr;
  if (addrEn) out = replaceAll(out, ORIGINAL.addressEn, esc(addrEn));
  if (addrMr) out = replaceAll(out, ORIGINAL.addressMr, esc(addrMr));
  const hours = lang === 'mr' ? s.hours.mr : s.hours.en;
  if (hours) {
    const text = esc(hours).replace(/\r?\n/g, '<br>');
    out = replaceAll(out, ORIGINAL.hoursEn, text);
    out = replaceAll(out, ORIGINAL.hoursMr, text);
  }
  if (s.map_link) out = replaceAll(out, ORIGINAL.mapLink, esc(s.map_link));
  if (s.map_embed_url) out = out.replace(/(<iframe[^>]*src=")https:\/\/www\.google\.com\/maps[^"]*(")/g, `$1${esc(s.map_embed_url)}$2`);
  // Logo uploaded in Settings: use it in place of the original logo (header, footer, loader).
  if (s.logo_path && s.logo_path.startsWith('/uploads/')) {
    out = out.replace(/<img\b[^>]*suvarnavarsha-logo-v2-transparent[^>]*>/g, (img) =>
      img.replace(/\ssrcset="[^"]*"/, '').replace(/\ssrc="[^"]*"/, ` src="${esc(s.logo_path)}"`),
    );
  }
  if (siteUrl && siteUrl !== ORIGINAL.site) out = replaceAll(out, ORIGINAL.site, siteUrl);
  return out;
}

// ---------- today's rate (same markup site.js draws, so nothing jumps when it runs) ----------
const RATE_TEXT = {
  en: { gold24: 'Gold 24K (999)', gold22: 'Gold 22K', gold18: 'Gold 18K', silver: 'Silver', perGram: 'per gram', perKg: 'per kg', updated: 'Last updated: ', none: 'Today’s rate will be updated soon. Please call us for the rate.' },
  mr: { gold24: 'सोने 24K (999)', gold22: 'सोने 22K', gold18: 'सोने 18K', silver: 'चांदी', perGram: 'प्रति ग्रॅम', perKg: 'प्रति किलो', updated: 'शेवटचे अपडेट: ', none: 'आजचा दर लवकरच अपडेट होईल. दरासाठी कृपया कॉल करा.' },
};

function rateTime(date, lang) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(d).toUpperCase();
  const day = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN-u-nu-latn' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d);
  return `${time}, ${day}`;
}

function rateCells(rate, lang) {
  const T = RATE_TEXT[lang];
  const cells = [
    ['24K', T.gold24, rate.gold_24k, T.perGram],
    ['22K', T.gold22, rate.gold_22k, T.perGram],
    rate.gold_18k ? ['18K', T.gold18, rate.gold_18k, T.perGram] : null,
    rate.silver_kg ? ['Ag', T.silver, rate.silver_kg, T.perKg] : null,
  ].filter(Boolean);
  const cols = cells.length === 4 ? 'lg:grid-cols-4' : cells.length === 3 ? 'lg:grid-cols-3' : '';
  const inner = cells
    .map(
      ([mark, label, value, unit], i) =>
        `<div class="hover-lift rounded-md border bg-surface-sunken px-4 py-4 ${i === 0 ? 'border-accent/60' : 'border-line'}"><dt class="flex items-center gap-2 t-label text-ink-muted"><span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-full bg-cta text-xs font-bold text-on-cta">${mark}</span>${esc(label)}</dt><dd class="mt-3 flex flex-wrap items-baseline gap-x-2"><span class="t-rate text-ink">${esc(inr(value).replace(/\.00$/, ''))}</span><span class="text-sm text-ink-muted">${esc(unit)}</span></dd></div>`,
    )
    .join('');
  return { cols, inner };
}

function applyRates(html, rate, lang, phone) {
  if (!html.includes('data-sv="rates"')) return html;
  const T = RATE_TEXT[lang];
  let out = html;
  if (rate) {
    const { cols, inner } = rateCells(rate, lang);
    out = out.replace(/<dl data-sv="rates" class="[^"]*">[\s\S]*?<\/dl>/g, `<dl data-sv="rates" class="grid grid-cols-2 gap-3 ${cols}">${inner}</dl>`);
    out = out.replace(/(data-sv="rates-updated">[\s\S]*?<\/span><\/span>)[^<]*(<\/p>)/g, `$1${esc(T.updated + rateTime(rate.updated_at, lang))}$2`);
  } else {
    out = out.replace(
      /<dl data-sv="rates" class="[^"]*">[\s\S]*?<\/dl>/g,
      `<dl data-sv="rates" class="grid gap-3"><div class="rounded-md border border-line bg-surface-sunken px-4 py-4"><dt class="t-label text-ink">${esc(T.none)}</dt><dd class="mt-2"><a href="tel:+91${esc(phone)}" class="t-rate text-ink hover:text-accent">${esc(phoneText(phone))}</a></dd></div></dl>`,
    );
    out = out.replace(/(data-sv="rates-updated">[\s\S]*?<\/span><\/span>)[^<]*(<\/p>)/g, '$1$2');
  }
  return out;
}

// ---------- FAQs ----------
// Sets the FAQPage schema (data for Google) to the FAQs shown on the page.
function setFaqSchema(html, list, lang) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (whole, json) => {
    if (!json.includes('"FAQPage"')) return whole;
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      return whole;
    }
    const entity = list.map((f) => ({
      '@type': 'Question',
      name: lang === 'mr' ? f.question.mr : f.question.en,
      acceptedAnswer: { '@type': 'Answer', text: lang === 'mr' ? f.answer.mr : f.answer.en },
    }));
    const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    for (const n of nodes) if (n['@type'] === 'FAQPage') n.mainEntity = entity;
    return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  });
}

// Each FAQ item in the pages carries data-faq-id (its row in the faqs table). The item shows the current
// question and answer, or disappears when the FAQ is turned off or deleted. On the FAQ page, new FAQs
// are added to their topic, and the numbers and counts are redone.
const ITEM = /<div data-faq-id="(\d+)" data-state="closed" data-orientation="vertical" class="[^"]*"><h3[\s\S]*?<\/div><\/div><\/div>/g;
const COUNT = { en: (n) => `${n} ${n === 1 ? 'question' : 'questions'}`, mr: (n) => `${n} प्रश्न` };

function fillItem(block, faq, lang) {
  const q = esc(lang === 'mr' ? faq.question.mr : faq.question.en);
  const a = esc(lang === 'mr' ? faq.answer.mr : faq.answer.en).replace(/\r?\n/g, '<br>');
  let out = block.replace(/^<div data-faq-id="\d+"/, `<div data-faq-id="${faq.id}"`);
  // Question: numbered style (<span>Q</span></span>) or plain style (text right after the button tag).
  if (/<span>[^<]*<\/span><\/span><span aria-hidden/.test(out)) out = out.replace(/<span>[^<]*<\/span><\/span><span aria-hidden/, `<span>${q}</span></span><span aria-hidden`);
  else out = out.replace(/(data-radix-collection-item="">)[^<]*(<span aria-hidden)/, `$1${q}$2`);
  // Answer: the text inside the last inner div. Unique ids so new items do not clash.
  out = out.replace(/(<div class="measure[^"]*">)[\s\S]*?(<\/div><\/div><\/div>)$/, `$1${a}$2`);
  out = out.replace(/id="radix-([^"]*)"/g, `id="faq${faq.id}-$1"`).replace(/aria-labelledby="radix-([^"]*)"/g, `aria-labelledby="faq${faq.id}-$1"`);
  return out;
}

function applyFaqs(html, faqs, lang, isFaqPage) {
  if (!html.includes('data-faq-id=')) return html;
  const byId = new Map(faqs.map((f) => [String(f.id), f]));
  if (!isFaqPage) {
    const shown = [];
    const out = html.replace(ITEM, (block, id) => {
      if (!byId.has(id)) return '';
      shown.push(byId.get(id));
      return fillItem(block, byId.get(id), lang);
    });
    return setFaqSchema(out, shown, lang);
  }
  // FAQ page: rebuild each topic list from the database, using the first item as the pattern.
  const template = (html.match(ITEM) || [])[0];
  let out = html;
  for (const topic of ['selling', 'pledged', 'buying', 'general']) {
    const head = out.indexOf(`id="faq-${topic}-title"`);
    if (head < 0) continue;
    const listStart = out.indexOf('<div class="space-y-3" data-orientation="vertical">', head);
    if (listStart < 0) continue;
    const contentStart = listStart + '<div class="space-y-3" data-orientation="vertical">'.length;
    // The list ends after its last item.
    ITEM.lastIndex = 0;
    let end = contentStart;
    const re = new RegExp(ITEM.source, 'g');
    re.lastIndex = contentStart;
    let m;
    while ((m = re.exec(out)) && m.index === end) end = re.lastIndex;
    const list = faqs.filter((f) => f.category === topic);
    const items = list
      .map((f, i) => fillItem(template, f, lang).replace(/(class="min-w-7[^>]*>)\d+(<\/span>)/, `$1${String(i + 1).padStart(2, '0')}$2`))
      .join('');
    out = out.slice(0, contentStart) + items + out.slice(end);
    // "8 questions" label just above the heading.
    const labelAt = out.lastIndexOf('<p class="t-eyebrow">', out.indexOf(`id="faq-${topic}-title"`));
    if (labelAt >= 0) {
      const close = out.indexOf('</p>', labelAt);
      out = `${out.slice(0, labelAt)}<p class="t-eyebrow">${COUNT[lang](list.length)}${out.slice(close)}`;
    }
  }
  return setFaqSchema(out, faqs, lang);
}

// ---------- Saturday offer ----------
function applyOffer(html, active) {
  if (active) return html;
  let out = html.replace(/<section aria-label="(?:Saturday offer|शनिवार ऑफर)"[\s\S]*?<\/section>/g, '');
  for (const [from, to] of [
    [' @ 5% Discount', ''],
    [' 5% discount on the 1st &amp; 3rd Saturday of every month.', ''],
    ['24 कॅरेट सोने खरेदीवर 5% सूट', '24 कॅरेट सोने खरेदी'],
    [' दर महिन्याच्या पहिल्या व तिसऱ्या शनिवारी 5% सूट.', ''],
  ]) out = replaceAll(out, from, to);
  return out;
}

module.exports = { applySettings, applyRates, applyFaqs, applyOffer, ORIGINAL };
