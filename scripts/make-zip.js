// Builds the ZIP to upload to GoDaddy: dist/suvarnavarsha-website-<date>.zip
// Leaves out node_modules, .env, uploads, dist and local files (the hosting runs `npm install` itself).
const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'dist');
const stamp = new Date().toISOString().slice(0, 10);
const outFile = path.join(outDir, `suvarnavarsha-website-${stamp}.zip`);

// Everything the app needs, nothing else.
const INCLUDE = ['server.js', 'package.json', 'package-lock.json', '.env.example', 'README.md', 'src', 'public', 'database', 'scripts', 'views'];
const SKIP = [/(^|[\\/])\.env$/, /(^|[\\/])node_modules([\\/]|$)/, /\.map$/, /(^|[\\/])\.DS_Store$/, /(^|[\\/])Thumbs\.db$/, /sample-data\.sql$/];

if (!fs.existsSync(path.join(root, 'public', 'vendor', 'bootstrap', 'bootstrap.min.css'))) {
  console.error('public/vendor/bootstrap is missing. Run `npm install` (or `npm run build`) first.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const output = fs.createWriteStream(outFile);
const zip = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => console.log(`Created ${path.relative(root, outFile)} (${(zip.pointer() / 1024 / 1024).toFixed(1)} MB)`));
zip.on('warning', (err) => console.warn(err.message));
zip.on('error', (err) => {
  throw err;
});
zip.pipe(output);

for (const item of INCLUDE) {
  const full = path.join(root, item);
  if (!fs.existsSync(full)) continue;
  if (fs.statSync(full).isDirectory()) {
    zip.directory(full, item, (entry) => (SKIP.some((re) => re.test(entry.name)) ? false : entry));
  } else {
    zip.file(full, { name: item });
  }
}
zip.finalize();
