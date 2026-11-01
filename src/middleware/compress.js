// Brotli / gzip compression with Node's built-in zlib (no extra package).
// - compressResponses: pages and API replies sent with res.send / res.json.
// - compressedAssets: CSS, JS, SVG and other text files from public/, compressed once and kept in memory.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const TEXT = /text\/|javascript|json|xml|svg|manifest/;
const MIN_BYTES = 1024;

// Prefer brotli (smaller), then gzip.
function pickEncoding(req) {
  const accept = String(req.headers['accept-encoding'] || '');
  if (/\bbr\b/.test(accept)) return 'br';
  if (/\bgzip\b/.test(accept)) return 'gzip';
  return null;
}

function compress(buf, enc, level) {
  if (enc === 'br') return zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level === 'max' ? 11 : 5 } });
  return zlib.gzipSync(buf, { level: level === 'max' ? 9 : 6 });
}

function compressResponses(req, res, next) {
  res.vary('Accept-Encoding');
  const enc = pickEncoding(req);
  if (!enc || req.method === 'HEAD') return next();
  const send = res.send.bind(res);
  res.send = (body) => {
    const type = String(res.get('Content-Type') || '');
    if ((typeof body === 'string' || Buffer.isBuffer(body)) && !res.get('Content-Encoding') && res.statusCode !== 304 && TEXT.test(type)) {
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
      if (buf.length >= MIN_BYTES) {
        res.set('Content-Encoding', enc);
        res.removeHeader('Content-Length');
        return send(compress(buf, enc));
      }
    }
    return send(body);
  };
  return next();
}

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// Serves text files from `root` compressed (cached in memory per file version). Other files fall through.
function compressedAssets(root, cacheControl) {
  const cache = new Map();
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const ext = path.extname(req.path).toLowerCase();
    if (!TYPES[ext]) return next();
    const enc = pickEncoding(req);
    if (!enc) return next();
    let file;
    try {
      file = path.join(root, decodeURIComponent(req.path));
    } catch {
      return next();
    }
    if (!file.startsWith(root + path.sep)) return next();
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      return next();
    }
    if (!stat.isFile() || stat.size < MIN_BYTES) return next();
    const key = `${file}|${enc}`;
    let hit = cache.get(key);
    if (!hit || hit.mtime !== stat.mtimeMs) {
      const raw = fs.readFileSync(file);
      hit = { mtime: stat.mtimeMs, body: compress(raw, enc, 'max'), etag: `"${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 20)}-${enc}"` };
      cache.set(key, hit);
    }
    res.set({ 'Content-Type': TYPES[ext], 'Content-Encoding': enc, 'Cache-Control': cacheControl(file), ETag: hit.etag, Vary: 'Accept-Encoding' });
    if (req.headers['if-none-match'] === hit.etag) return res.status(304).end();
    if (req.method === 'HEAD') return res.end();
    return res.end(hit.body);
  };
}

module.exports = { compressResponses, compressedAssets };
