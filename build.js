const fs = require('fs');
const esc = (s) => s.replace(/<\/script/gi, '<\\/script');
let html = fs.readFileSync('src/index.html', 'utf8');
const parts = {
  '/*__THREE__*/': fs.readFileSync('node_modules/three/build/three.min.js', 'utf8'),
  '/*__PEER__*/': fs.readFileSync('node_modules/peerjs/dist/peerjs.min.js', 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, ''),
  '/*__GAME__*/': fs.readFileSync('src/game.js', 'utf8'),
};
for (const [k, v] of Object.entries(parts)) html = html.split(k).join(esc(v));
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + 'KB');
// artifact preview variant (solo only, no document skeleton)
let pv = html
  .replace('<script>', '<script>window.__PREVIEW=1;</script><script>')
  .replace(/<!doctype html>\s*<html lang="ko">\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<\/head>\s*<body>/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, '');
fs.writeFileSync('dist/preview.html', pv);
console.log('dist/preview.html', pv.slice(0, 60).replace(/\n/g, ' '));
