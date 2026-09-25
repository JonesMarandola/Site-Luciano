// Protege o /admin com senha, sem servidor.
//
// Como funciona: o admin de verdade fica em src/admin.html (nao e publicado). Este script
// criptografa esse arquivo inteiro com AES-256-GCM, usando uma chave derivada da sua senha
// (PBKDF2-SHA256, 600.000 iteracoes, salt aleatorio), e grava em admin/index.html apenas a
// tela de login + o conteudo cifrado. A senha nao fica salva em lugar nenhum.
//
// Uso:
//   npm run admin:senha                 -> pede a senha (2x) e gera admin/index.html protegido
//   npm run admin:senha -- --bloquear   -> publica so a tela "area nao configurada" (sem admin)
// Sempre que editar src/admin.html, rode de novo o admin:senha.
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 600000;
const SRC = 'src/admin.html';
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : 'admin/index.html';

const b64 = (buf) => Buffer.from(buf).toString('base64');

function askHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch) => {
      if (ch === '\u0003') { stdout.write('\n'); process.exit(1); }            // Ctrl+C
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdin.setRawMode?.(false); stdin.pause(); stdin.off('data', onData);
        stdout.write('\n'); resolve(value); return;
      }
      if (ch === '\u0008' || ch === '\u007f') { if (value) { value = value.slice(0, -1); stdout.write('\b \b'); } return; }
      value += ch; stdout.write('*'.repeat([...ch].length));
    };
    stdin.on('data', onData);
  });
}

function strongEnough(pw) {
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  return pw.length >= 12 && classes >= 3;
}

async function encrypt(plain, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  return { v: 1, it: ITERATIONS, s: b64(salt), i: b64(iv), c: b64(ct) };
}

function page(payload) {
  const locked = payload === null;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Área restrita | Dr. Luciano Canonico</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="referrer" content="no-referrer">
  <meta name="theme-color" content="#0A1626">
  <link rel="icon" href="../favicon.ico" sizes="any">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    :root { --ink: #12283F; --muted: #5B6F86; --accent: #1F6FCC; --line: rgba(18,40,63,.12); --ease: cubic-bezier(.16,1,.3,1); }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; }
    body { min-height: 100svh; display: grid; place-items: center; padding: 24px max(20px, env(safe-area-inset-left)); font-family: 'Geist', system-ui, sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased;
      background: radial-gradient(circle at 15% 10%, rgba(46,139,238,.28), transparent 45%), radial-gradient(circle at 90% 90%, rgba(11,76,140,.45), transparent 50%), linear-gradient(160deg, #0A1626 0%, #060D16 100%); }
    .card { width: 100%; max-width: 400px; padding: 36px 32px 28px; border-radius: 22px; background: #fff; box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 40px 80px -30px rgba(0,0,0,.6);
      animation: rise 600ms var(--ease) both; }
    @keyframes rise { from { opacity: 0; transform: translateY(12px) scale(.98); } }
    .brand { display: flex; flex-direction: column; line-height: 1; margin-bottom: 28px; }
    .brand .pre { font-size: .7rem; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; }
    .brand .name { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.15rem; letter-spacing: .01em; text-transform: uppercase; }
    .lock { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; background: #EAF4FC; color: var(--accent); margin-bottom: 18px; }
    .lock svg { width: 24px; height: 24px; }
    h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: 6px; }
    .lead { color: var(--muted); font-size: .95rem; line-height: 1.5; margin-bottom: 24px; }
    label { display: block; font-size: .82rem; font-weight: 600; margin-bottom: 8px; }
    .field { position: relative; }
    input[type=password], input[type=text] { width: 100%; height: 50px; padding: 0 52px 0 16px; border: 1.5px solid #C9D3DE; border-radius: 12px; font: inherit; font-size: 16px; color: var(--ink); background: #fff; transition: border-color 150ms ease, box-shadow 150ms ease; }
    input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px rgba(31,111,204,.15); }
    .toggle { position: absolute; right: 4px; top: 4px; width: 42px; height: 42px; display: grid; place-items: center; border: 0; background: transparent; color: var(--muted); border-radius: 10px; cursor: pointer; touch-action: manipulation; }
    .toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .toggle svg { width: 20px; height: 20px; }
    button[type=submit] { width: 100%; height: 50px; margin-top: 16px; border: 0; border-radius: 999px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: .82rem; letter-spacing: .08em; text-transform: uppercase; color: #fff; cursor: pointer; touch-action: manipulation; user-select: none;
      background: linear-gradient(135deg, #2B7FE0 0%, #1B5CAE 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 18px 36px -18px rgba(43,127,224,.8); transition: transform 160ms var(--ease), filter 200ms ease, opacity 200ms ease; }
    button[type=submit]:active { transform: scale(.97); }
    button[type=submit]:disabled { opacity: .7; cursor: progress; }
    button[type=submit]:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
    @media (hover: hover) and (pointer: fine) { button[type=submit]:hover:not(:disabled) { filter: brightness(1.08); } }
    .error { min-height: 1.4em; margin-top: 12px; color: #B3261E; font-size: .86rem; text-align: center; }
    .shake { animation: shake 360ms var(--ease); }
    @keyframes shake { 20% { transform: translateX(-6px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
    .note { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: .76rem; line-height: 1.5; text-align: center; }
    .back { display: inline-block; margin-top: 18px; color: rgba(255,255,255,.7); font-size: .84rem; text-decoration: none; padding: 10px; }
    .back:hover { color: #fff; }
    .wrap { width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; }
    @media (prefers-reduced-motion: reduce) { .card, .shake { animation: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <main class="card">
      <div class="brand"><span class="pre">Dr.</span><span class="name">Luciano Canonico</span></div>
      <div class="lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></svg></div>
      <h1>Área restrita</h1>
${locked ? `      <p class="lead">O acesso ainda não foi configurado. No computador do projeto, rode <strong>npm run admin:senha</strong> para criar a senha.</p>` : `      <p class="lead">Digite sua senha para abrir o gerador de receitas.</p>
      <form id="f" novalidate>
        <input type="text" name="username" value="admin" autocomplete="username" hidden>
        <label for="pw">Senha</label>
        <div class="field">
          <input id="pw" type="password" autocomplete="current-password" required autofocus>
          <button class="toggle" type="button" id="tg" aria-label="Mostrar senha" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div>
        <button type="submit" id="go">Entrar</button>
        <p class="error" id="err" role="alert" aria-live="assertive"></p>
      </form>`}
      <p class="note">O conteúdo desta página é criptografado e só é aberto no seu navegador, com a senha correta.</p>
    </main>
    <a class="back" href="../">&larr; Voltar ao site</a>
  </div>
${locked ? '' : `  <script>
    const D = ${JSON.stringify(payload)};
    const f = document.getElementById('f'), pw = document.getElementById('pw'), go = document.getElementById('go'), err = document.getElementById('err'), tg = document.getElementById('tg');
    const u8 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    let fails = 0, wait = 0;
    tg.addEventListener('click', () => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; tg.setAttribute('aria-pressed', String(show)); tg.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha'); pw.focus(); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pw.value || Date.now() < wait) return;
      go.disabled = true; go.textContent = 'Verificando…'; err.textContent = '';
      try {
        const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.value), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: u8(D.s), iterations: D.it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        const html = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8(D.i) }, key, u8(D.c)));
        pw.value = '';
        document.open(); document.write(html); document.close();
      } catch (_) {
        fails += 1;
        wait = Date.now() + Math.min(30000, fails > 3 ? 2000 * 2 ** (fails - 4) : 0);
        err.textContent = fails > 3 ? 'Senha incorreta. Aguarde alguns segundos para tentar de novo.' : 'Senha incorreta.';
        const card = document.querySelector('.card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
        go.disabled = false; go.textContent = 'Entrar'; pw.select();
      }
    });
  </script>`}
</body>
</html>
`;
}

if (args.includes('--bloquear')) {
  writeFileSync(OUT, page(null));
  console.log(`${OUT}: tela de area restrita publicada (sem o admin).`);
  process.exit(0);
}

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  if (!process.stdin.isTTY) { console.error('Rode este comando num terminal para digitar a senha.'); process.exit(1); }
  console.log('Crie a senha do admin: minimo 12 caracteres, com pelo menos 3 destes: minuscula, MAIUSCULA, numero, simbolo.');
  password = await askHidden('Senha: ');
  const again = await askHidden('Repita a senha: ');
  if (password !== again) { console.error('As senhas nao conferem. Nada foi alterado.'); process.exit(1); }
}
if (!strongEnough(password)) { console.error('Senha fraca: use 12+ caracteres e pelo menos 3 tipos (minuscula, MAIUSCULA, numero, simbolo). Nada foi alterado.'); process.exit(1); }

const source = readFileSync(SRC, 'utf8');
const payload = await encrypt(source, password);
writeFileSync(OUT, page(payload));
console.log(`${OUT}: admin protegido (AES-256-GCM, PBKDF2 ${ITERATIONS.toLocaleString('pt-BR')} iteracoes). Guarde sua senha: ela nao pode ser recuperada.`);
