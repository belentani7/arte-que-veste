/**
 * Tests unitarios y de integración de Arte Que Veste (node:test + node:assert).
 * Corren con: npm test (node --test) desde frontend/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function startServer(t) {
  const port = 20000 + Math.floor(Math.random() * 40000);
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => proc.kill());

  const ready = new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('server.js no arrancó en 10s')), 10000);
    proc.stdout.on('data', (chunk) => {
      if (String(chunk).includes('Server: http://127.0.0.1:')) { clearTimeout(timer); res(); }
    });
    proc.on('exit', (code) => rej(new Error('server.js terminó con código ' + code)));
  });

  return { port, base: 'http://127.0.0.1:' + port, ready };
}

/* ------------------------------------------------------------------ */
/* server.js — servidor estático                                       */
/* ------------------------------------------------------------------ */

test('server.js responde / e /index.html con 200 text/html y cabeceras de seguridad', { timeout: 20000 }, async (t) => {
  const { base, ready } = startServer(t);
  await ready;

  for (const path of ['/', '/index.html']) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200, 'GET ' + path + ' debe ser 200');
    assert.ok((res.headers.get('content-type') || '').startsWith('text/html'),
      'GET ' + path + ' debe servir text/html');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    const body = await res.text();
    assert.ok(body.includes('<!DOCTYPE html>') || body.includes('<!doctype html>') || body.includes('<html'),
      'GET ' + path + ' debe devolver HTML válido');
    assert.ok(body.includes('Nossa Coleção'),
      'GET ' + path + ' debe abrir el catálogo de la tienda');
  }

  const resCss = await fetch(base + '/css/store.css');
  assert.equal(resCss.status, 200);
  assert.ok((resCss.headers.get('content-type') || '').startsWith('text/css'));
  assert.match(resCss.headers.get('cache-control') || '', /max-age=3600/);

  const resJson = await fetch(base + '/products.json');
  assert.equal(resJson.status, 200);
  assert.ok((resJson.headers.get('content-type') || '').includes('application/json'));
  const catalog = await resJson.json();
  assert.ok(Array.isArray(catalog) && catalog.length > 0);
});

test('server.js comprime text/css con gzip cuando el cliente lo solicita', { timeout: 20000 }, async (t) => {
  const { port, ready } = startServer(t);
  await ready;

  const result = await new Promise((res, rej) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      method: 'GET',
      path: '/css/store.css',
      headers: { 'Accept-Encoding': 'gzip' },
    }, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => res({ status: r.statusCode, headers: r.headers, buf: Buffer.concat(chunks) }));
    });
    req.on('error', rej);
    req.end();
  });

  assert.equal(result.status, 200);
  assert.equal(result.headers['content-encoding'], 'gzip');
  const decompressed = zlib.gunzipSync(result.buf).toString('utf8');
  assert.ok(decompressed.includes('--turquesa'));
});

test('server.js rechaza traversal y archivos ocultos, 404 para desconocidos, 405 para POST', { timeout: 20000 }, async (t) => {
  const { port, ready } = startServer(t);
  await ready;

  const rawRequest = (method, rawPath) => new Promise((res, rej) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: rawPath }, (r) => {
      r.resume();
      r.on('end', () => res(r.statusCode));
    });
    req.on('error', rej);
    req.end();
  });

  for (const path of ['/%2e%2e/server.js', '/%2e%2e%2fserver.js', '/assets/%2e%2e/products.json']) {
    const status = await rawRequest('GET', path);
    assert.ok(status === 403 || status === 404,
      'GET ' + path + ' debe ser rechazado, fue ' + status);
  }

  const dot = await rawRequest('GET', '/.gitignore');
  assert.ok(dot === 403 || dot === 404, '/.gitignore debe ser rechazado, fue ' + dot);

  assert.equal(await rawRequest('GET', '/notas.txt'), 404);
  assert.equal(await rawRequest('GET', '/no-existe.html'), 404);
  assert.equal(await rawRequest('POST', '/'), 405);

  const head = await fetch('http://127.0.0.1:' + port + '/index.html', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

/* ------------------------------------------------------------------ */
/* Herramientas internas (scripts/*)                                   */
/* ------------------------------------------------------------------ */

test('scripts/verify.mjs valida los HTML del frontend y soporta --help', { timeout: 30000 }, () => {
  const help = spawnSync(process.execPath, ['scripts/verify.mjs', '--help'], { cwd: root, encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Uso:/);

  const r = spawnSync(process.execPath, ['scripts/verify.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, 'verify.mjs falló:\n' + (r.stderr || r.stdout));
  assert.match(r.stdout, /PASS:/);
});

test('scripts/audit.mjs, export.mjs y optimize-images.mjs cumplen contrato CLI (--help y ejecución)', { timeout: 30000 }, () => {
  for (const script of ['scripts/audit.mjs', 'scripts/export.mjs', 'scripts/optimize-images.mjs']) {
    const help = spawnSync(process.execPath, [script, '--help'], { cwd: root, encoding: 'utf8' });
    assert.equal(help.status, 0, `${script} --help falló`);
    assert.match(help.stdout, /Uso:/);
  }

  const auditRes = spawnSync(process.execPath, ['scripts/audit.mjs', '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(auditRes.status, 0, 'audit.mjs falló:\n' + auditRes.stderr + auditRes.stdout);
  const report = JSON.parse(auditRes.stdout);
  assert.equal(report.status, 'PASS');
  assert.equal(report.third_party.external_scripts, 0);
  assert.equal(report.third_party.external_stylesheets, 0);
  assert.equal(report.backup_files, 0);

  const csvRes = spawnSync(process.execPath, ['scripts/export.mjs', '--format', 'csv'], { cwd: root, encoding: 'utf8' });
  assert.equal(csvRes.status, 0);
  assert.match(csvRes.stdout, /^sku;name;desc/);

  const imgCheck = spawnSync(process.execPath, ['scripts/optimize-images.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(imgCheck.status, 0, imgCheck.stderr || imgCheck.stdout);
});

test('carrinho.html não oferece validação de cupom sem API configurada', () => {
  const cartPage = readFileSync(join(root, 'carrinho.html'), 'utf8');
  assert.doesNotMatch(cartPage, /applyCoupon|\/api\/cupom/);
  assert.match(cartPage, /Cupons e descontos não estão configurados/);
});

/* ------------------------------------------------------------------ */
/* js/cart.js — carrito (evaluado en vm con stubs de navegador)         */
/* ------------------------------------------------------------------ */

function loadCart({ throwOnSet = false } = {}) {
  const code = readFileSync(join(root, 'js', 'cart.js'), 'utf8');
  const store = new Map();
  let lastToastMsg = '';
  const sandbox = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => {
        if (throwOnSet) throw new Error('QuotaExceededError');
        store.set(k, String(v));
      },
      removeItem: (k) => { store.delete(k); },
    },
    window: { dispatchEvent: () => {} },
    document: {
      addEventListener: () => {},
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({
        style: {}, innerHTML: '', firstElementChild: null,
        setAttribute() {},
        querySelector: () => ({
          set textContent(v) { lastToastMsg = v; },
          get textContent() { return lastToastMsg; },
        }),
        appendChild() {}, remove() {},
      }),
      body: { appendChild() {} },
    },
    requestAnimationFrame: () => {},
    setTimeout: () => 0,
    CustomEvent: class CustomEvent { constructor(type, opts) { this.type = type; this.detail = opts?.detail; } },
    console: { warn() {}, log() {}, error() {} },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code + '\n;globalThis.__Cart = Cart;', sandbox, { filename: 'js/cart.js' });
  return { Cart: sandbox.__Cart, store, getLastToast: () => lastToastMsg };
}

test('cart.js: add / getItemCount / getSubtotal con claves por sku+talla+color', () => {
  const { Cart } = loadCart();
  const camiseta = { sku: 'CBM-001', name: 'Camiseta Bumba Meu Boi', price: 129 };
  const brinco = { sku: 'BXI-001', name: 'Brincos Xilogravura', price: 45 };

  assert.equal(Cart.getItemCount(), 0);
  assert.equal(Cart.getSubtotal(), 0);

  Cart.add(camiseta, 2);
  Cart.add(camiseta, 1, 'M', 'turquesa');
  assert.equal(Cart.getItemCount(), 3);
  assert.equal(Cart.getSubtotal(), 129 * 3);

  Cart.add(brinco);
  assert.equal(Cart.getItemCount(), 4);
  assert.equal(Cart.getSubtotal(), 129 * 3 + 45);

  Cart.add(camiseta, 1, 'M', 'turquesa');
  assert.equal(Cart.getItemCount(), 5);
});

test('cart.js: update, remove, clear y casos extremos (NaN, storage lleno, XSS en toast)', () => {
  const { Cart, getLastToast } = loadCart();
  const bolsa = { sku: 'BTB-001', name: '<img src=x onerror=alert(1)>', price: 89 };
  Cart.add(bolsa, Number.NaN); // normaliza a 1
  assert.equal(Cart.getItemCount(), 1);
  assert.equal(getLastToast(), '<img src=x onerror=alert(1)> adicionado ao carrinho!');

  const key = Cart.get()[0].key;
  Cart.update(key, 5);
  assert.equal(Cart.getItemCount(), 5);

  Cart.update(key, 0);
  assert.equal(Cart.getItemCount(), 0);

  Cart.add(bolsa, 2);
  Cart.remove(Cart.get()[0].key);
  assert.equal(Cart.getItemCount(), 0);

  Cart.add(bolsa, 3);
  Cart.clear();
  assert.equal(Cart.get().length, 0);

  // Storage bloqueado/lleno no lanza excepción
  const quotaEnv = loadCart({ throwOnSet: true });
  assert.doesNotThrow(() => quotaEnv.Cart.add({ sku: 'X-1', name: 'Teste', price: 10 }, 1));
});

test('cart.js: datos corruptos o maliciosos en localStorage se sanean', () => {
  const { Cart, store } = loadCart();

  store.set('aqv_carrinho', '{esto no es json');
  assert.equal(Cart.get().length, 0);

  store.set('aqv_carrinho', JSON.stringify([
    { key: 'x', sku: 'X', name: 'Item raro', price: 'no-es-numero', quantidade: 9999 },
  ]));
  const items = Cart.get();
  assert.equal(items.length, 1);
  assert.equal(items[0].price, 0);
  assert.equal(items[0].quantidade, 100);
});

/* ------------------------------------------------------------------ */
/* js/xilogravura-shader.js — fallback 2D y prefers-reduced-motion     */
/* ------------------------------------------------------------------ */

test('xilogravura-shader.js degrada a Canvas 2D sin WebGL y respeta prefers-reduced-motion', () => {
  const code = readFileSync(join(root, 'js', 'xilogravura-shader.js'), 'utf8');
  let strokes = 0;
  const fake2d = {
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() { strokes += 1; },
  };
  const canvas = {
    clientWidth: 800,
    clientHeight: 400,
    width: 0,
    height: 0,
    getContext(kind) { return kind === '2d' ? fake2d : null; },
    addEventListener() {},
    removeEventListener() {},
  };
  const sandbox = {
    window: { matchMedia: () => ({ matches: true }), addEventListener() {}, removeEventListener() {} },
    document: {
      hidden: false,
      getElementById: () => canvas,
      addEventListener() {},
      removeEventListener() {},
    },
    Math,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'js/xilogravura-shader.js' });

  const ctrl = sandbox.window.initXilogravuraShader('xilo-canvas');
  assert.equal(ctrl.mode, 'fallback-2d');
  assert.ok(strokes >= 10, 'El fallback 2D debe dibujar líneas de xilogravura');
});

/* ------------------------------------------------------------------ */
/* Datos del catálogo: products.json y backend/seed.json               */
/* ------------------------------------------------------------------ */

test('products.json: catálogo válido con imágenes y galerías existentes', () => {
  const products = JSON.parse(readFileSync(join(root, 'products.json'), 'utf8'));
  assert.ok(Array.isArray(products) && products.length >= 5,
    'el catálogo debe tener productos');
  for (const p of products) {
    assert.ok(p.sku && typeof p.sku === 'string', 'producto sin sku: ' + JSON.stringify(p));
    assert.ok(p.name && typeof p.name === 'string', 'producto sin name: ' + p.sku);
    assert.ok(typeof p.price === 'number' && p.price >= 0, 'price inválido en ' + p.sku);
    assert.ok(typeof p.stock === 'number' && p.stock >= 0, 'stock inválido en ' + p.sku);
    assert.ok(existsSync(join(root, p.img)), 'imagen inexistente para ' + p.sku + ': ' + p.img);
    if (Array.isArray(p.gallery)) {
      for (const g of p.gallery) {
        assert.ok(existsSync(join(root, g)), 'imagen de galería inexistente para ' + p.sku + ': ' + g);
      }
    }
  }
});

test('backend/seed.json: seed válido y coherente con el catálogo', () => {
  const seed = JSON.parse(readFileSync(resolve(root, '..', 'backend', 'seed.json'), 'utf8'));
  const products = JSON.parse(readFileSync(join(root, 'products.json'), 'utf8'));
  assert.ok(Array.isArray(seed) && seed.length > 0);
  for (const p of seed) {
    assert.ok(p.sku && typeof p.price === 'number' && p.price >= 0, 'seed con item inválido: ' + JSON.stringify(p));
  }
  const skuCatalogo = new Set(products.map((p) => p.sku));
  for (const p of seed) {
    assert.ok(skuCatalogo.has(p.sku), 'seed SKU ' + p.sku + ' no está en frontend/products.json');
  }
});
