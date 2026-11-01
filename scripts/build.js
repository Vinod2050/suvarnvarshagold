// Copies the Bootstrap files the pages use from node_modules into public/vendor/bootstrap.
// Runs after `npm install` and with `npm run build`.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'bootstrap', 'dist');
const dest = path.join(root, 'public', 'vendor', 'bootstrap');

const files = [
  ['css/bootstrap.min.css', 'bootstrap.min.css'],
  ['css/bootstrap.min.css.map', 'bootstrap.min.css.map'],
  ['js/bootstrap.bundle.min.js', 'bootstrap.bundle.min.js'],
  ['js/bootstrap.bundle.min.js.map', 'bootstrap.bundle.min.js.map'],
];

if (!fs.existsSync(src)) {
  // Bootstrap not installed (e.g. production install without it): keep the files already in public/vendor.
  console.log('build: bootstrap not found in node_modules, keeping public/vendor as it is');
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const [from, to] of files) {
  fs.copyFileSync(path.join(src, from), path.join(dest, to));
}
console.log('build: Bootstrap copied to public/vendor/bootstrap');
