/**
 * Tests básicos de Arte Que Veste (node:test + node:assert).
 * Corren con: npm test  (node --test) desde frontend/
 * Verifican las utilidades principales que existen en el repo:
 *   - server.js      servidor estático (rutas, MIME, anti-traversal)
 *   - scripts/verify.mjs  validador de HTML y enlaces locales
 *   - js/cart.js     carrito de compras (localStorage) via vm
 *   - products.json / seed.json  datos del catálogo
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* server.js — servidor estático                                       */
/* ------------------------------------------------------------------ */

test('server.js responde / e /index.html con 200 text/html', { timeout: 20000 }, async (t) => {
  const port = 20000 + Math.floor(Math.random() * 40000);
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => proc.kill());

  // Esperar a que el servidor imprima la línea de listen
  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('server.js no arrancó en 10s')), 10000);
    proc.stdout.on('data', (chunk) => {
      if (String(chunk).includes('Server: http://127.0.0.1:')) { clearTimeout(timer); res(); }
    });
    proc.on('exit', (code) => rej(new Error('server.js terminó con código ' + code)));
  });

  const base = 'http://127.0.0.1:' + port;
  for (const path of ['/', '/index.html']) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200, 'GET ' + path + ' debe ser 200');
    assert.ok((res.headers.get('content-type') || '').startsWith('text/html'),
      'GET ' + path + ' debe servir text/html');
    const body = await res.text();
    assert.ok(body.includes('<!doctype html>') || body.includes('<html'),
      'GET ' + path + ' debe devolver la portada');
    assert.ok(body.includes('Nossa Coleção'),
      'GET ' + path + ' debe abrir el catálogo de la tienda');
  }

  const resJson = await fetch(base + '/products.json');
  assert.equal(resJson.status, 200);
  assert.ok((resJson.headers.get('content-type') || '').includes('application/json'));
  const catalog = await resJson.json();
  assert.ok(Array.isArray(catalog) && catalog.length > 0);
});

test('server.js rechaza traversal y archivos ocultos, 404 para desconocidos, 405 para POST', { timeout: 20000 }, async (t) => {
  const port = 20000 + Math.floor(Math.random() * 40000);
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => proc.kill());

  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('server.js no arrancó en 10s')), 10000);
    proc.stdout.on('data', (chunk) => {
      if (String(chunk).includes('Server: http://127.0.0.1:')) { clearTimeout(timer); res(); }
    });
    proc.on('exit', (code) => rej(new Error('server.js terminó con código ' + code)));
  });

  // Petición HTTP cruda: el path se envía tal cual, sin la normalización
  // de segmentos %2e%2e que hace fetch/URL del lado cliente.
  const rawRequest = (method, rawPath) => new Promise((res, rej) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: rawPath }, (r) => {
      r.resume();
      r.on('end', () => res(r.statusCode));
    });
    req.on('error', rej);
    req.end();
  });

  // Traversal codificado (%2e%2e) debe ser rechazado (403/404), nunca 200
  for (const path of ['/%2e%2e/server.js', '/%2e%2e%2fserver.js', '/assets/%2e%2e/products.json']) {
    const status = await rawRequest('GET', path);
    assert.ok(status === 403 || status === 404,
      'GET ' + path + ' debe ser rechazado, fue ' + status);
  }

  // Archivos ocultos (dotfiles) no se sirven
  const dot = await rawRequest('GET', '/.gitignore');
  assert.ok(dot === 403 || dot === 404, '/.gitignore debe ser rechazado, fue ' + dot);

  // Extensión sin MIME conocido y archivo inexistente
  assert.equal(await rawRequest('GET', '/notas.txt'), 404);
  assert.equal(await rawRequest('GET', '/no-existe.html'), 404);

  // Métodos distintos de GET/HEAD
  assert.equal(await rawRequest('POST', '/'), 405);

  // HEAD funciona sin cuerpo
  const head = await fetch('http://127.0.0.1:' + port + '/index.html', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

/* ------------------------------------------------------------------ */
/* scripts/verify.mjs — validador de HTML y enlaces                    */
/* ------------------------------------------------------------------ */

test('scripts/verify.mjs valida los HTML del frontend y termina en 0', { timeout: 30000 }, () => {
  const r = spawnSync(process.execPath, ['scripts/verify.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, 'verify.mjs falló:\n' + (r.stderr || r.stdout));
  assert.match(r.stdout, /PASS:/);
});

test('carrinho.html não oferece validação de cupom sem API configurada', () => {
  const cartPage = readFileSync(join(root, 'carrinho.html'), 'utf8');
  assert.doesNotMatch(cartPage, /applyCoupon|\/api\/cupom/);
  assert.match(cartPage, /Cupons e descontos não estão configurados/);
});

/* ------------------------------------------------------------------ */
/* js/cart.js — carrito (evaluado en vm con stubs de navegador)         */
/* ------------------------------------------------------------------ */

function loadCart() {
  const code = readFileSync(join(root, 'js', 'cart.js'), 'utf8');
  const store = new Map();
  const sandbox = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
    window: { dispatchEvent: () => {} },
    document: {
      addEventListener: () => {},
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({
        style: {}, innerHTML: '', firstElementChild: null,
        querySelector: () => ({ textContent: '' }),
        appendChild() {}, remove() {},
      }),
      body: { appendChild() {} },
    },
    requestAnimationFrame: () => {},
    setTimeout: () => 0,
    CustomEvent: class CustomEvent { constructor(type, opts) { this.type = type; this.detail = opts?.detail; } },
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code + '\n;globalThis.__Cart = Cart;', sandbox, { filename: 'js/cart.js' });
  return { Cart: sandbox.__Cart, store };
}

test('cart.js: add / getItemCount / getSubtotal con claves por sku+talla+color', () => {
  const { Cart } = loadCart();
  const camiseta = { sku: 'CBM-001', name: 'Camiseta Bumba Meu Boi', price: 129 };
  const brinco = { sku: 'BXI-001', name: 'Brincos Xilogravura', price: 45 };

  assert.equal(Cart.getItemCount(), 0);
  assert.equal(Cart.getSubtotal(), 0);

  Cart.add(camiseta, 2);
  Cart.add(camiseta, 1, 'M', 'turquesa'); // misma sku, talla/color distintos → item aparte
  assert.equal(Cart.getItemCount(), 3);
  assert.equal(Cart.getSubtotal(), 129 * 3);

  Cart.add(brinco);
  assert.equal(Cart.getItemCount(), 4);
  assert.equal(Cart.getSubtotal(), 129 * 3 + 45);

  // Volver a añadir la misma variante acumula cantidad
  Cart.add(camiseta, 1, 'M', 'turquesa');
  assert.equal(Cart.getItemCount(), 5);
});

test('cart.js: update, remove y clear', () => {
  const { Cart } = loadCart();
  const bolsa = { sku: 'BTB-001', name: 'Bolsa Tote Bag', price: 89 };
  Cart.add(bolsa, 1);
  const key = Cart.get()[0].key;

  Cart.update(key, 5);
  assert.equal(Cart.getItemCount(), 5);

  // Cantidad 0 elimina el item
  Cart.update(key, 0);
  assert.equal(Cart.getItemCount(), 0);

  Cart.add(bolsa, 2);
  Cart.remove(Cart.get()[0].key);
  assert.equal(Cart.getItemCount(), 0);

  Cart.add(bolsa, 3);
  Cart.clear();
  assert.equal(Cart.get().length, 0);
});

test('cart.js: datos corruptos o maliciosos en localStorage se sanean', () => {
  const { Cart, store } = loadCart();

  // JSON inválido → carrito vacío, sin excepción
  store.set('aqv_carrinho', '{esto no es json');
  assert.equal(Cart.get().length, 0);

  // Items con price no numérico y cantidad fuera de rango se normalizan
  store.set('aqv_carrinho', JSON.stringify([
    { key: 'x', sku: 'X', name: 'Item raro', price: 'no-es-numero', quantidade: 9999 },
  ]));
  const items = Cart.get();
  assert.equal(items.length, 1);
  assert.equal(items[0].price, 0);
  assert.equal(items[0].quantidade, 100); // límite superior del código
});

/* ------------------------------------------------------------------ */
/* Datos del catálogo: products.json y backend/seed.json               */
/* ------------------------------------------------------------------ */

test('products.json: catálogo válido con imágenes existentes', () => {
  const products = JSON.parse(readFileSync(join(root, 'products.json'), 'utf8'));
  assert.ok(Array.isArray(products) && products.length >= 5,
    'el catálogo debe tener productos');
  for (const p of products) {
    assert.ok(p.sku && typeof p.sku === 'string', 'producto sin sku: ' + JSON.stringify(p));
    assert.ok(p.name && typeof p.name === 'string', 'producto sin name: ' + p.sku);
    assert.ok(typeof p.price === 'number' && p.price >= 0, 'price inválido en ' + p.sku);
    assert.ok(typeof p.stock === 'number' && p.stock >= 0, 'stock inválido en ' + p.sku);
    assert.ok(existsSync(join(root, p.img)), 'imagen inexistente para ' + p.sku + ': ' + p.img);
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
