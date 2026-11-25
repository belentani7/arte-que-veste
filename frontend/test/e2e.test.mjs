/**
 * Test End-to-End del camino feliz completo de Arte Que Veste:
 *   1. Arranca server.js real en puerto efímero
 *   2. Verifica que todas las páginas HTML y assets responden 200 OK
 *   3. Ejecuta el flujo completo de compra demostración:
 *      loja.html (cargar catálogo, filtrar, ordenar) ->
 *      produto.html?sku=CBM-001 (galería, selección de talla, añadir al carrito) ->
 *      carrinho.html (render, subir cantidad, verificar totales) ->
 *      checkout.html (paso 1, lookupCEP BrasilAPI v2, paso 2, paso 3, descarga .txt)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function extractInlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(m[1])) out.push(m[2]);
  }
  return out;
}

class MiniElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.style = {};
    this.dataset = {};
    this.attributes = new Map();
    this.classes = new Set();
    this.listeners = new Map();
    this.children = [];
    this.parent = null;
    this.value = '';
    this.checked = false;
    this.hidden = false;
    this.textContent = '';
    this._innerHTML = '';
    this.src = '';
    this.alt = '';
    this.href = '';
    this.download = '';
    this.classList = {
      add: (...cs) => cs.forEach((c) => this.classes.add(c)),
      remove: (...cs) => cs.forEach((c) => this.classes.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classes.has(c)) this.classes.delete(c);
          else this.classes.add(c);
        } else if (force) this.classes.add(c);
        else this.classes.delete(c);
      },
      contains: (c) => this.classes.has(c),
    };
  }
  get className() { return [...this.classes].join(' '); }
  set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); }
  get firstElementChild() { return this.children[0] || { style: {} }; }
  setAttribute(k, v) {
    this.attributes.set(k, String(v));
    if (k.startsWith('data-')) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      this.dataset[camel] = String(v);
    }
  }
  getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
  removeAttribute(k) { this.attributes.delete(k); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  async trigger(type, extra = {}) {
    const fns = this.listeners.get(type) || [];
    for (const fn of fns) {
      await fn({ target: this, currentTarget: this, preventDefault() {}, ...extra });
    }
  }
  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  replaceChildren() { this.children = []; }
  remove() {}
  focus() {}
  click() {
    if (this._onClick) this._onClick();
    return this.trigger('click');
  }
  querySelector() { return new MiniElement('span'); }
  querySelectorAll() { return []; }
  closest() { return null; }
}

function createBrowserEnv({ url, storage, fetchImpl, elements = {}, selectorMap = {} }) {
  const byId = new Map();
  for (const [id, el] of Object.entries(elements)) {
    el.id = id;
    byId.set(id, el);
  }
  const docListeners = new Map();
  const winListeners = new Map();
  const downloads = [];
  const blobContents = new Map();
  let blobSeq = 0;

  const doc = {
    title: '',
    hidden: false,
    documentElement: new MiniElement('html'),
    body: new MiniElement('body'),
    getElementById(id) {
      if (!byId.has(id)) byId.set(id, new MiniElement('div', id));
      return byId.get(id);
    },
    querySelector(sel) {
      if (selectorMap[sel]) return selectorMap[sel][0] || null;
      return null;
    },
    querySelectorAll(sel) {
      return selectorMap[sel] || [];
    },
    createElement(tag) {
      const el = new MiniElement(tag);
      if (tag === 'a') {
        el._onClick = () => downloads.push({ filename: el.download, content: blobContents.get(el.href) || '' });
      }
      return el;
    },
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
  };

  const parsedUrl = new URL(url);
  const win = {
    location: {
      href: parsedUrl.href,
      origin: parsedUrl.origin,
      search: parsedUrl.search,
      hostname: parsedUrl.hostname,
      replace(next) { win._replaced = next; },
    },
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    dispatchEvent(ev) {
      for (const fn of winListeners.get(ev.type) || []) fn(ev);
    },
    matchMedia: () => ({ matches: false }),
    scrollTo() {},
  };

  class FakeBlob {
    constructor(parts) { this._text = parts.join(''); }
  }

  const sandbox = {
    window: win,
    document: doc,
    location: win.location,
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => { storage.set(k, String(v)); },
      removeItem: (k) => { storage.delete(k); },
    },
    fetch: fetchImpl,
    URL: Object.assign(URL, {
      createObjectURL(blob) {
        const u = 'blob:test-' + (++blobSeq);
        blobContents.set(u, blob._text);
        return u;
      },
      revokeObjectURL() {},
    }),
    URLSearchParams,
    Blob: FakeBlob,
    CustomEvent: class CustomEvent { constructor(type, opts) { this.type = type; this.detail = opts?.detail; } },
    requestAnimationFrame: (cb) => cb(0),
    setTimeout: () => 0,
    alert: () => { throw new Error('alert() no debe usarse en la interfaz restaurada'); },
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  return {
    sandbox,
    doc,
    win,
    byId,
    downloads,
    async fireDOMContentLoaded() {
      for (const fn of docListeners.get('DOMContentLoaded') || []) {
        await fn();
      }
      // Allow microtasks/fetches started inside DOMContentLoaded to settle
      await new Promise((r) => setTimeout(r, 40));
    },
  };
}

test('E2E camino feliz: todas las páginas responden 200 y el flujo completo loja -> produto -> carrinho -> checkout funciona', { timeout: 30000 }, async (t) => {
  const port = 20000 + Math.floor(Math.random() * 40000);
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => proc.kill());

  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('server.js no arrancó')), 10000);
    proc.stdout.on('data', (chunk) => {
      if (String(chunk).includes('Server: http://127.0.0.1:')) { clearTimeout(timer); res(); }
    });
    proc.on('exit', (code) => rej(new Error('server.js salió con ' + code)));
  });

  const base = `http://127.0.0.1:${port}`;

  // 1. Verificar que las 15 páginas HTML y assets críticos responden 200 OK
  const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html')).sort();
  assert.equal(htmlFiles.length, 15);
  for (const file of htmlFiles) {
    const res = await fetch(`${base}/${file}`);
    assert.equal(res.status, 200, `GET /${file} falló`);
    const text = await res.text();
    assert.doesNotMatch(text, /cdn\.tailwindcss\.com/, `${file} no debe usar Tailwind Play CDN`);
  }

  const storeUiCode = await (await fetch(`${base}/js/store-ui.js`)).text();
  const cartCode = await (await fetch(`${base}/js/cart.js`)).text();
  const sharedStorage = new Map();

  // 2. LOJA: cargar catálogo, filtrar por categoría y ordenar (sin quedar invisible)
  const lojaHtml = await (await fetch(`${base}/loja.html`)).text();
  const btnAll = new MiniElement('button'); btnAll.setAttribute('data-filter', 'all');
  const btnMasc = new MiniElement('button'); btnMasc.setAttribute('data-filter', 'masculino');
  const sortSelect = new MiniElement('select', 'sort-products');
  const searchInput = new MiniElement('input', 'search-products');

  const lojaEnv = createBrowserEnv({
    url: `${base}/loja.html`,
    storage: sharedStorage,
    fetchImpl: (u) => fetch(new URL(u, `${base}/loja.html`)),
    elements: { 'sort-products': sortSelect, 'search-products': searchInput },
    selectorMap: {
      '.filter-btn[data-filter]': [btnAll, btnMasc],
      'input[name="piece-type"]': [],
      '.size-btn': [],
    },
  });
  vm.runInContext(storeUiCode + '\n' + cartCode, lojaEnv.sandbox);
  for (const script of extractInlineScripts(lojaHtml)) vm.runInContext(script, lojaEnv.sandbox);
  await lojaEnv.fireDOMContentLoaded();

  assert.equal(lojaEnv.doc.getElementById('productCount').textContent, 'Mostrando 8 de 8 produtos');
  assert.match(lojaEnv.doc.getElementById('productGrid').innerHTML, /Camiseta Bumba Meu Boi/);

  // Filtrar por masculino -> 1 resultado
  await btnMasc.click();
  assert.equal(lojaEnv.doc.getElementById('productCount').textContent, 'Mostrando 1 de 8 produtos');

  // Volver a todos y ordenar por menor preço -> 8 resultados visibles (sin anim-scroll opacity:0)
  await btnAll.click();
  sortSelect.value = 'price-asc';
  await sortSelect.trigger('change');
  assert.equal(lojaEnv.doc.getElementById('productCount').textContent, 'Mostrando 8 de 8 produtos');
  const gridHtml = lojaEnv.doc.getElementById('productGrid').innerHTML;
  assert.ok(gridHtml.indexOf('Brincos Xilogravura') < gridHtml.indexOf('Vestido Festa Junina'),
    'Ordenação por menor preço deve colocar R$ 45 antes de R$ 299');
  assert.doesNotMatch(gridHtml, /anim-scroll/);

  // 3. PRODUTO: abrir CBM-001, validar galería de 2 fotos, exigir talla, añadir 2 unidades
  const prodHtml = await (await fetch(`${base}/produto.html`)).text();
  const prodEnv = createBrowserEnv({
    url: `${base}/produto.html?sku=CBM-001`,
    storage: sharedStorage,
    fetchImpl: (u) => fetch(new URL(u, `${base}/produto.html`)),
  });
  vm.runInContext(storeUiCode + '\n' + cartCode, prodEnv.sandbox);
  for (const script of extractInlineScripts(prodHtml)) vm.runInContext(script, prodEnv.sandbox);
  await prodEnv.fireDOMContentLoaded();

  assert.equal(prodEnv.doc.getElementById('product-name').textContent, 'Camiseta Bumba Meu Boi');
  assert.equal(prodEnv.doc.getElementById('thumbnails').children.length, 2,
    'CBM-001 debe renderizar galería con 2 fotos (masculino-1.jpg y masculino-2.jpg)');

  // Intentar añadir sin seleccionar talla -> muestra error inline, no usa alert()
  await prodEnv.doc.getElementById('btn-add-cart').click();
  assert.match(prodEnv.doc.getElementById('product-feedback').textContent, /selecione um tamanho/i);
  assert.equal(sharedStorage.has('aqv_carrinho'), false);

  // Seleccionar talla M y subir cantidad a 2
  const sizeWrap = prodEnv.doc.getElementById('size-options');
  const sizeMBtn = new MiniElement('button');
  sizeMBtn.setAttribute('data-size', 'M');
  sizeWrap.closest = () => sizeMBtn;
  await sizeWrap.trigger('click', { target: { closest: () => sizeMBtn } });
  await prodEnv.doc.getElementById('btn-qty-inc').click();
  await prodEnv.doc.getElementById('btn-add-cart').click();

  const savedAfterAdd = JSON.parse(sharedStorage.get('aqv_carrinho'));
  assert.equal(savedAfterAdd.length, 1);
  assert.equal(savedAfterAdd[0].sku, 'CBM-001');
  assert.equal(savedAfterAdd[0].tamanho, 'M');
  assert.equal(savedAfterAdd[0].quantidade, 2);

  // 4. CARRINHO: renderiza 2 unidades (R$ 258,00) y permite aumentar a 3 (R$ 387,00)
  const cartHtml = await (await fetch(`${base}/carrinho.html`)).text();
  const cartEnv = createBrowserEnv({
    url: `${base}/carrinho.html`,
    storage: sharedStorage,
    fetchImpl: (u) => fetch(new URL(u, `${base}/carrinho.html`)),
  });
  vm.runInContext(storeUiCode + '\n' + cartCode, cartEnv.sandbox);
  for (const script of extractInlineScripts(cartHtml)) vm.runInContext(script, cartEnv.sandbox);
  await cartEnv.fireDOMContentLoaded();

  assert.equal(cartEnv.doc.getElementById('cart-count-text').textContent, '2 itens no carrinho');
  assert.equal(cartEnv.doc.getElementById('summary-total').textContent, 'R$ 258,00');

  const incBtn = new MiniElement('button');
  incBtn.setAttribute('data-cart-action', 'increase');
  const fakeRow = new MiniElement('article');
  fakeRow.dataset.key = 'CBM-001-M-';
  incBtn.closest = (s) => (s === '.cart-item' ? fakeRow : null);
  await cartEnv.doc.getElementById('cart-items').trigger('click', {
    target: { closest: (s) => (s === 'button[data-cart-action]' ? incBtn : null) },
  });
  assert.equal(cartEnv.doc.getElementById('summary-total').textContent, 'R$ 387,00');

  // 5. CHECKOUT: sin crash pix-total, lookupCEP BrasilAPI v2, descarga de resumen local
  const coHtml = await (await fetch(`${base}/checkout.html`)).text();
  const step1Btn = new MiniElement('button'); step1Btn.setAttribute('data-step', '1');
  const step2Btn = new MiniElement('button'); step2Btn.setAttribute('data-step', '2');
  const step3Btn = new MiniElement('button'); step3Btn.setAttribute('data-step', '3');

  const coEnv = createBrowserEnv({
    url: `${base}/checkout.html`,
    storage: sharedStorage,
    fetchImpl: async (u) => {
      if (String(u).startsWith('https://brasilapi.com.br/api/cep/v2/')) {
        return {
          ok: true,
          async json() {
            return {
              cep: '49010390',
              state: 'SE',
              city: 'Aracaju',
              neighborhood: 'Centro',
              street: 'Avenida Ivo do Prado',
            };
          },
        };
      }
      return fetch(new URL(u, `${base}/checkout.html`));
    },
    selectorMap: {
      '.step[data-step="1"]': [step1Btn],
      '.step[data-step="2"]': [step2Btn],
      '.step[data-step="3"]': [step3Btn],
      '.step[data-step]': [step1Btn, step2Btn, step3Btn],
      '.form-input[aria-invalid="true"]': [],
    },
  });
  vm.runInContext(storeUiCode + '\n' + cartCode, coEnv.sandbox);
  for (const script of extractInlineScripts(coHtml)) vm.runInContext(script, coEnv.sandbox);
  await coEnv.fireDOMContentLoaded();

  assert.equal(coEnv.doc.getElementById('co-subtotal').textContent, 'R$ 387,00');
  assert.equal(coEnv.doc.getElementById('co-total').textContent, 'R$ 387,00');

  // Rellenar paso 1
  coEnv.doc.getElementById('f-name').value = 'Maria Nordestina';
  coEnv.doc.getElementById('f-email').value = 'maria@exemplo.com';
  coEnv.doc.getElementById('f-whatsapp').value = '(79) 99999-0000';
  await coEnv.doc.getElementById('btn-step1').click();
  assert.equal(coEnv.doc.getElementById('step-2').style.display, 'block');

  // Lookup CEP con esquema oficial BrasilAPI CEP v2 (street, neighborhood, city, state)
  coEnv.doc.getElementById('f-cep').value = '49010-390';
  await coEnv.doc.getElementById('f-cep').trigger('blur');
  assert.equal(coEnv.doc.getElementById('f-rua').value, 'Avenida Ivo do Prado');
  assert.equal(coEnv.doc.getElementById('f-bairro').value, 'Centro');
  assert.equal(coEnv.doc.getElementById('f-cidade').value, 'Aracaju');
  assert.equal(coEnv.doc.getElementById('f-estado').value, 'SE');

  // Completar número, pasar al paso 3 y descargar resumen local
  coEnv.doc.getElementById('f-numero').value = '42';
  await coEnv.doc.getElementById('btn-step2').click();
  assert.equal(coEnv.doc.getElementById('step-3').style.display, 'block');

  await coEnv.doc.getElementById('btn-submit').click();
  assert.equal(coEnv.downloads.length, 1);
  assert.equal(coEnv.downloads[0].filename, 'arte-que-veste-resumo.txt');
  assert.match(coEnv.downloads[0].content, /NÃO É UM PEDIDO CONFIRMADO/);
  assert.match(coEnv.downloads[0].content, /Camiseta Bumba Meu Boi \(M\)/);
  assert.match(coEnv.downloads[0].content, /R\$ 387,00/);
  assert.match(coEnv.downloads[0].content, /Aracaju, SE/);
});
