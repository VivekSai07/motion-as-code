#!/usr/bin/env bun
// Diagnostics for the offline renderer: starts Vite, opens the app in Chrome (?export=1) and reports
// the GPU Chrome uses, every console message, failed and still-pending requests, and boot progress.
//   bun scripts/diag.ts [--headed] [--angle d3d11|gl|swiftshader|default] [--secs 300]
import { chromium } from 'playwright-core';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1]! : d; };
const APP = path.resolve(import.meta.dir, '..');
const angle = opt('angle', process.platform === 'win32' ? 'd3d11' : 'default');
const secs = +opt('secs', '300');
const t0 = Date.now();
const log = (...a: any[]) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s]`, ...a);

const port = 5600 + Math.floor(Math.random() * 300);
const vite = Bun.spawn([process.execPath, path.join(APP, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: APP, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', env: { ...process.env, PDOOM_NO_HMR: '1' } });
(async () => { for await (const c of vite.stdout as any) process.stdout.write('[vite] ' + new TextDecoder().decode(c)); })();
(async () => { for await (const c of vite.stderr as any) process.stdout.write('[vite!] ' + new TextDecoder().decode(c)); })();
const url = `http://localhost:${port}`;
for (let i = 0; i < 300; i++) { try { if ((await fetch(url)).ok) break; } catch {} await Bun.sleep(100); }
log('vite up at', url);

const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
if (angle !== 'default') args.unshift(`--use-angle=${angle}`);
if (process.env.PDOOM_GPU === 'high') args.unshift('--force_high_performance_gpu');
log('launching Chrome, angle =', angle, 'gpu =', process.env.PDOOM_GPU ?? 'default', 'headless =', !argv.includes('--headed'));
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: process.env.BROWSER_CHANNEL ?? 'chrome' }),
  headless: !argv.includes('--headed'), args,
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pending = new Map<string, number>();
page.on('console', (m) => log(`[console.${m.type()}]`, m.text().slice(0, 400)));
page.on('pageerror', (e) => log('[pageerror]', e.message));
page.on('request', (r) => pending.set(r.url(), Date.now()));
page.on('requestfinished', (r) => pending.delete(r.url()));
page.on('requestfailed', (r) => { pending.delete(r.url()); log('[request failed]', r.url(), r.failure()?.errorText); });
page.on('response', (r) => { if (r.status() >= 400) log('[http', r.status() + ']', r.url()); });

const gpu = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2') as WebGL2RenderingContext | null;
  if (!c) return 'NO WEBGL2';
  const e = c.getExtension('WEBGL_debug_renderer_info');
  return e ? `${c.getParameter(e.UNMASKED_VENDOR_WEBGL)} | ${c.getParameter(e.UNMASKED_RENDERER_WEBGL)}` : String(c.getParameter(c.RENDERER));
});
log('WebGL2 renderer:', gpu);

page.goto(`${url}/?export=1`).catch((e) => log('[goto]', e.message));
let ok = false;
for (let s = 0; s < secs; s += 5) {
  await Bun.sleep(5000);
  const st = await page.evaluate(() => { const p = (window as any).__pdoom; return p ? (p.error ? 'ERROR: ' + p.error : p.ready ? 'READY' : 'booting') : 'no __pdoom yet'; }).catch((e) => 'eval failed: ' + e.message);
  const pend = [...pending.entries()].map(([u, t]) => `${u.replace(url, '')} (${((Date.now() - t) / 1000).toFixed(0)}s)`);
  log('state:', st, '| pending requests:', pend.length ? pend.slice(0, 8).join(', ') : 'none');
  if (st === 'READY') {
    ok = true;
    const t1 = Date.now();
    await page.evaluate(() => (window as any).__pdoom.still(12.5, 1, 0.5));
    log(`first frame rendered in ${Date.now() - t1} ms`);
    break;
  }
  if (st.startsWith('ERROR')) break;
}
log(ok ? 'RESULT: app booted OK' : 'RESULT: app did NOT boot');
await browser.close().catch(() => {});
if (process.platform === 'win32') Bun.spawnSync(['taskkill', '/pid', String(vite.pid), '/T', '/F'], { stdout: 'ignore', stderr: 'ignore' }); else vite.kill();
process.exit(ok ? 0 : 1);
