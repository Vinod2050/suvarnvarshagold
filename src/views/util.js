// Small helpers for building HTML on the server. Every value from the database goes through esc().

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => ESC[c]);

// Joins template pieces, skipping false / null / undefined (handy for optional blocks).
const join = (parts) => parts.filter((p) => p !== false && p !== null && p !== undefined).join('');

// ₹1,23,456 (Indian grouping). Whole rupees unless there are paise.
function inr(n) {
  const v = Number(n) || 0;
  const hasPaise = Math.round(v * 100) % 100 !== 0;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 })}`;
}

// 8805942424 -> 8805-94-2424 (how the client writes it on the business card)
function phoneText(digits) {
  const d = String(digits || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : String(digits || '');
}
const telHref = (digits) => `tel:+91${String(digits || '').replace(/\D/g, '').slice(-10)}`;
const waHref = (number, text) => `https://wa.me/${String(number || '').replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  mr: ['जाने.', 'फेब्रु.', 'मार्च', 'एप्रि.', 'मे', 'जून', 'जुलै', 'ऑग.', 'सप्टें.', 'ऑक्टो.', 'नोव्हें.', 'डिसें.'],
};

// "2026-11-01" -> "1 Nov 2026"
function dateText(ymd, lang = 'en') {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[lang === 'mr' ? 'mr' : 'en'][Number(m[2]) - 1]} ${m[1]}`;
}

// UTC Date from MySQL -> "10:30 AM, 1 Nov 2026" in Indian time
function dateTimeText(value, lang = 'en') {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  let h = ist.getUTCHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = `${h}:${String(ist.getUTCMinutes()).padStart(2, '0')} ${ampm}`;
  return `${time}, ${dateText(ist.toISOString().slice(0, 10), lang)}`;
}

// Turns plain text with line breaks into safe paragraphs.
const paragraphs = (text) =>
  String(text || '')
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');

module.exports = { esc, join, inr, phoneText, telHref, waHref, dateText, dateTimeText, paragraphs };
