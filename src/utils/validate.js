// Small input validator. validate(body, schema) returns clean values or throws a 400 with per-field messages.
//
// Rule options: type (string | text | int | number | bool | enum | date | phone | email | url | youtube),
// required, min, max (length for strings, value for numbers), values (enum), default.
const { badRequest } = require('./response');
const { parseYouTube } = require('./youtube');

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function checkOne(value, rule) {
  const t = rule.type || 'string';
  switch (t) {
    case 'string':
    case 'text': {
      if (typeof value !== 'string' && typeof value !== 'number') return { error: 'Must be text' };
      // Remove control characters except new lines and tabs (text fields keep line breaks).
      let s = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
      if (t === 'string') s = s.replace(/\s+/g, ' ');
      if (rule.min && s.length < rule.min) return { error: `Must be at least ${rule.min} characters` };
      if (rule.max && s.length > rule.max) return { error: `Must be at most ${rule.max} characters` };
      return { value: s };
    }
    case 'int':
    case 'number': {
      const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
      if (!Number.isFinite(n)) return { error: 'Must be a number' };
      if (t === 'int' && !Number.isInteger(n)) return { error: 'Must be a whole number' };
      if (rule.min !== undefined && n < rule.min) return { error: `Must be ${rule.min} or more` };
      if (rule.max !== undefined && n > rule.max) return { error: `Must be ${rule.max} or less` };
      return { value: t === 'number' ? Math.round(n * 1000) / 1000 : n };
    }
    case 'bool':
      if ([true, 1, '1', 'true', 'on', 'yes'].includes(value)) return { value: true };
      if ([false, 0, '0', 'false', 'off', 'no'].includes(value)) return { value: false };
      return { error: 'Must be yes or no' };
    case 'enum':
      if (!rule.values.includes(value)) return { error: 'Choose a valid option' };
      return { value };
    case 'date': {
      const s = String(value).trim();
      const d = new Date(`${s}T00:00:00Z`);
      if (!DATE.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return { error: 'Enter a valid date' };
      return { value: s };
    }
    case 'phone': {
      // Indian mobile: 10 digits starting 6-9; allows +91 / 0 prefix, spaces and dashes.
      let digits = String(value).replace(/[\s\-()]/g, '');
      digits = digits.replace(/^(\+?91|0)(?=\d{10}$)/, '');
      if (!/^[6-9]\d{9}$/.test(digits)) return { error: 'Enter a 10-digit mobile number' };
      return { value: digits };
    }
    case 'email': {
      const s = String(value).trim().toLowerCase();
      if (s.length > 190 || !EMAIL.test(s)) return { error: 'Enter a valid email address' };
      return { value: s };
    }
    case 'url': {
      const s = String(value).trim();
      try {
        const u = new URL(s);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
        if (s.length > (rule.max || 500)) return { error: 'Link is too long' };
        return { value: u.toString() };
      } catch {
        return { error: 'Enter a full link starting with https://' };
      }
    }
    case 'youtube': {
      const yt = parseYouTube(String(value));
      if (!yt) return { error: 'Paste a YouTube video link (youtube.com or youtu.be)' };
      return { value: yt };
    }
    default:
      throw new Error(`Unknown rule type ${t}`);
  }
}

// partial = true: only fields present in the body are checked (for PATCH-style updates).
function validate(body, schema, { partial = false } = {}) {
  const src = body && typeof body === 'object' ? body : {};
  const out = {};
  const fields = {};
  for (const [name, rule] of Object.entries(schema)) {
    const present = Object.prototype.hasOwnProperty.call(src, name);
    if (partial && !present) continue;
    const raw = src[name];
    if (isEmpty(raw)) {
      if (rule.type === 'bool') {
        out[name] = rule.default !== undefined ? rule.default : false;
      } else if (rule.required) {
        fields[name] = 'This field is required';
      } else {
        out[name] = rule.default !== undefined ? rule.default : null;
      }
      continue;
    }
    const r = checkOne(raw, rule);
    if (r.error) fields[name] = r.error;
    else out[name] = r.value;
  }
  if (Object.keys(fields).length) throw badRequest('Please correct the highlighted fields', fields);
  return out;
}

// Reads list query options (?page=&pageSize=&q=&status=) with safe limits.
function listOptions(query, { maxPageSize = 100, statuses } = {}) {
  const page = Math.max(1, Math.min(10000, parseInt(query.page, 10) || 1));
  const pageSize = Math.max(1, Math.min(maxPageSize, parseInt(query.pageSize, 10) || 20));
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  const status = statuses && statuses.includes(query.status) ? query.status : null;
  return { page, pageSize, q, status };
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw badRequest('Invalid id');
  return id;
}

module.exports = { validate, listOptions, parseId };
