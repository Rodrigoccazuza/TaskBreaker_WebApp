/* Copies the static web app into www/ for Capacitor.
 * Run: node scripts/copy-www.js  (or: npm run copy:www) */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

const files = [
  'index.html',
  'styles.css',
  'app.js',
  'supabase-config.js',
  'manifest.json',
  'sw.js',
  'icons/icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

fs.rmSync(www, { recursive: true, force: true });
for (const f of files) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) {
    console.log('skip (missing):', f);
    continue;
  }
  const dest = path.join(www, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
console.log('www/ ready');
