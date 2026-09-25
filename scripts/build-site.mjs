// Uso: node scripts/build-site.mjs  ->  gera dist/ so com o que vai pro ar.
import { rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';

const KEEP = [
  'index.html', '404.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'site.webmanifest',
  'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'Images', 'assets', 'sobre', 'receitas', 'privacidade', 'termos', 'admin',
];
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const item of KEEP) {
  if (!existsSync(item)) { console.error('faltando:', item); process.exit(1); }
  cpSync(item, `dist/${item}`, { recursive: true });
}
console.log('dist/ pronto. Publique o conteudo da pasta dist.');
