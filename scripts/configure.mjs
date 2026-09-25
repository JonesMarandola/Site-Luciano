// Uso: node scripts/configure.mjs --domain https://meudominio.com.br --whatsapp 5543999999999
// Troca o dominio e o numero de WhatsApp em todos os arquivos publicos do site.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => (cur.startsWith('--') ? [...acc, [cur.slice(2), arr[i + 1]]] : acc), [])
);
const CURRENT_DOMAIN = 'https://drlucianocanonico.com.br';
const CURRENT_WA = '5500000000000';
const SKIP = new Set(['node_modules', 'Site de inspiração', '.claude', '.agents', 'dist', 'scripts', '.seo-backup']);
const EXT = new Set(['.html', '.xml', '.txt', '.webmanifest']);

if (!args.domain && !args.whatsapp) {
  console.log('Informe --domain https://exemplo.com.br e/ou --whatsapp 55DDDNUMERO (so digitos).');
  process.exit(1);
}
if (args.domain && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(args.domain)) {
  console.error('Dominio invalido. Use o formato https://exemplo.com.br (sem barra no final).');
  process.exit(1);
}
if (args.whatsapp && !/^55\d{10,11}$/.test(args.whatsapp)) {
  console.error('WhatsApp invalido. Use so digitos com DDI e DDD, ex: 5543999999999.');
  process.exit(1);
}

let changed = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.has(extname(p))) {
      const src = readFileSync(p, 'utf8');
      let out = src;
      if (args.domain) out = out.split(CURRENT_DOMAIN).join(args.domain);
      if (args.whatsapp) out = out.split(CURRENT_WA).join(args.whatsapp);
      if (out !== src) { writeFileSync(p, out); changed++; console.log('atualizado', p); }
    }
  }
};
walk('.');
console.log(`${changed} arquivo(s) atualizado(s).`);
if (args.domain) console.log('Lembrete: se trocar de novo depois, edite CURRENT_DOMAIN neste script. Depois rode npm run admin:senha para atualizar o admin protegido.');
