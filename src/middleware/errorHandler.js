// Turns every error into the standard JSON reply. Details of unexpected errors are logged, never sent.
const env = require('../config/env');
const { AppError } = require('../utils/response');

function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api/') || (req.method !== 'GET' && req.method !== 'HEAD')) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }
  // Loaded here, not at the top, because the page views load services that load this file's neighbours.
  const { renderNotFound } = require('../routes/site.routes');
  return renderNotFound(req, res).catch(next);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let error = 'Something went wrong. Please try again.';
  let fields;

  if (err instanceof AppError) {
    ({ status } = err);
    error = err.message;
    ({ fields } = err);
  } else if (err.name === 'MulterError') {
    status = 400;
    error = err.code === 'LIMIT_FILE_SIZE' ? 'The image is too large (2 MB maximum)' : 'Could not read the uploaded file';
    fields = { image: error };
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    error = 'Invalid request data';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    error = 'Request is too large';
  } else {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
    if (!env.isProduction) error = err.message;
  }

  if (res.headersSent) return res.end();
  if (!req.path.startsWith('/api/') && status >= 500) {
    return res.status(status).type('text/plain').send('Sorry, something went wrong. Please try again later.');
  }
  return res.status(status).json({ ok: false, error, ...(fields ? { fields } : {}) });
}

module.exports = { errorHandler, notFoundHandler };
