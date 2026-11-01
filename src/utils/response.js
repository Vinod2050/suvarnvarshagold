// One response shape for every API: { ok: true, data } or { ok: false, error, fields }.

class AppError extends Error {
  constructor(status, message, fields, retryAfter) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.retryAfter = retryAfter; // seconds; sent as Retry-After and retry_after
  }
}

const badRequest = (message, fields) => new AppError(400, message, fields);
const notFound = (what = 'Item') => new AppError(404, `${what} not found`);
const unauthorized = () => new AppError(401, 'Please sign in');
const forbidden = (message = 'Not allowed') => new AppError(403, message);
const tooMany = (message = 'Too many requests. Please try again later.') => new AppError(429, message);

function ok(res, data = null, status = 200) {
  return res.status(status).json({ ok: true, data });
}

// Wraps async route handlers so errors reach the error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { AppError, badRequest, notFound, unauthorized, forbidden, tooMany, ok, wrap };
