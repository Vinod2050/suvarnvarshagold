// Image uploads (logo, product photos). Files are checked by their real content, renamed to a random name
// and saved in the database table uploaded_files, so they survive every new ZIP upload (hosting replaces the
// app folder). They are served at /uploads/<folder>/<name> (see serveUpload).
const multer = require('multer');
const db = require('../config/db');
const { badRequest } = require('./response');
const { randomToken } = require('./security');

const MAX_BYTES = 2 * 1024 * 1024;
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Accept only these image types, detected from the first bytes (not from the file name).
function detectImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// multer keeps the file in memory (max 2 MB) until it has been checked.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 30 },
});

// Saves req.file and returns its web path, e.g. /uploads/products/ab12.webp
async function saveImage(file, folder) {
  if (!file) return null;
  const ext = detectImage(file.buffer);
  if (!ext) throw badRequest('Please choose a JPG, PNG or WebP image', { image: 'Only JPG, PNG or WebP images are allowed' });
  const rel = `${folder}/${randomToken(12)}.${ext}`;
  await db.query('INSERT INTO uploaded_files (path, mime, data) VALUES (?, ?, ?)', [rel, MIME[ext], file.buffer]);
  return `/uploads/${rel}`;
}

// Deletes an uploaded image (only paths under /uploads/, never site images).
async function removeUpload(webPath) {
  if (typeof webPath !== 'string' || !webPath.startsWith('/uploads/')) return;
  await db.query('DELETE FROM uploaded_files WHERE path = ?', [webPath.slice('/uploads/'.length)]).catch(() => {});
}

// GET /uploads/<folder>/<name>
async function serveUpload(req, res, next) {
  try {
    const rel = req.path.replace(/^\/+(uploads\/)?/, '');
    if (!/^[a-z]+\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(rel)) return res.status(404).end();
    const row = await db.one('SELECT mime, data, created_at FROM uploaded_files WHERE path = ?', [rel]);
    if (!row) return res.status(404).end();
    // Names are random and never reused, so the file can be cached for a long time.
    res.set({
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=2592000, immutable',
      ETag: `"${rel.split('/')[1]}"`,
      'Content-Security-Policy': "default-src 'none'",
    });
    if (req.headers['if-none-match'] === `"${rel.split('/')[1]}"`) return res.status(304).end();
    return res.send(row.data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { imageUpload, saveImage, removeUpload, serveUpload, MAX_BYTES };
