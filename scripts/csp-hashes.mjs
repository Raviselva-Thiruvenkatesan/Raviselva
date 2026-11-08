/**
 * Post-build: tighten the Content Security Policy of every pre-rendered page.
 *
 * Angular's `autoCsp` can't be combined with pre-rendering, so this does the same job:
 * for each HTML file it hashes the inline scripts the browser will execute and replaces
 * `'unsafe-inline'` in the page's `script-src` with exactly those hashes. Any script
 * injected later (XSS) won't match a hash and is blocked.
 *
 * Run automatically by `npm run build`.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'dist/portfolio/browser';
const EXECUTABLE_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

let pages = 0;
for (const file of htmlFiles(OUT)) {
  let html = readFileSync(file, 'utf8');
  const hashes = new Set();

  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attrs)) continue;                       // external: covered by 'self'
    const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1] ?? '').toLowerCase();
    if (!EXECUTABLE_TYPES.has(type)) continue;                    // JSON-LD, ng-state: not executed
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }

  const cspMeta = /(<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*content=")([^"]*)(")/i;
  if (!cspMeta.test(html)) throw new Error(`No CSP <meta> found in ${file}`);

  html = html.replace(cspMeta, (_, start, policy, end) => {
    const tightened = policy.replace(/script-src[^;]*/i, `script-src 'self' ${[...hashes].join(' ')}`.trim());
    if (/script-src[^;]*'unsafe-inline'/i.test(tightened)) throw new Error(`unsafe-inline left in ${file}`);
    return start + tightened + end;
  });

  writeFileSync(file, html);
  pages++;
  console.log(`CSP: ${file.replace(/\\/g, '/')}  (${hashes.size} inline script hash${hashes.size === 1 ? '' : 'es'})`);
}

if (!pages) throw new Error(`No HTML files found in ${OUT}. Did the build run?`);
console.log(`CSP hashes applied to ${pages} page(s).`);
