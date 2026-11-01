// Starts the website. GoDaddy (and most Node hosting) gives the port in process.env.PORT.
const env = require('./src/config/env');
const db = require('./src/config/db');
const { app, sessionStore } = require('./src/app');

const server = app.listen(env.port, env.host, () => {
  const where = env.host ? `${env.host}:${env.port}` : `port ${env.port}`;
  console.log(`Suvarnavarsha Gold website running on ${where} (${env.isProduction ? 'production' : 'development'})`);
});

// Prepare the database (create missing tables, add starting content and the first admin), so a new
// database works without any manual import. A wrong setting shows clearly in the log.
const { migrate } = require('./src/config/migrate');
migrate()
  .then((r) => {
    if (r.skipped) console.log('Database: automatic table setup turned off (AUTO_MIGRATE=false)');
    if (r.created) console.log(`Admin account "${r.created}" created from the ADMIN_PASSWORD setting`);
    console.log(`Database connected and ready (${r.admins} admin account${r.admins === 1 ? '' : 's'})`);
    if (!r.admins) console.log('No admin yet: add the ADMIN_PASSWORD setting and restart, or run: npm run create-admin');
    return null;
  })
  .catch((err) => console.error(`Database setup failed: ${err.code || err.message}. Check the DB_* settings.`));

function shutdown(signal) {
  console.log(`${signal} received, closing`);
  server.close(() => {
    Promise.allSettled([sessionStore.close(), db.pool.end()]).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('Unhandled promise rejection:', err));
