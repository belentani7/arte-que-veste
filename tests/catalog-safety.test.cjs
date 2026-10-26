'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'loja.html'), 'utf8');
const match = html.match(/    function renderProducts\(\) \{[\s\S]*?\n    \}\n\n    \/\/ Product cards now link/);
assert.ok(match, 'catalog renderer exists');

function render(products) {
    const grid = { innerHTML: '' };
    const count = { textContent: '' };
    const document = {
        getElementById(id) { return id === 'productGrid' ? grid : count; }
    };
    const CATEGORIAS = { feminino: { label: 'Feminino', bg: '#ff1493', text: '#fff' } };
    const source = match[0].replace(/\n    \/\/ Product cards now link$/, '');
    vm.runInNewContext(source + '\nrenderProducts();', { PRODUTOS: products, document, CATEGORIAS }, { timeout: 1000 });
    return { markup: grid.innerHTML, count: count.textContent };
}

test('catalog treats API-provided names and descriptions as text', () => {
    const { markup } = render([{
        sku: 'VFJ-001', name: '<img src=x onerror=alert(1)>',
        desc: '<svg onload=alert(2)>', price: 10, category: 'feminino',
        img: 'assets/img/produtos/placeholder.svg', alt: 'Vestido'
    }]);
    assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(markup, /&lt;svg onload=alert\(2\)&gt;/);
    assert.doesNotMatch(markup, /<svg onload|<img src=x/);
});

test('catalog escapes attributes and restricts image sources', () => {
    const { markup } = render([{
        sku: 'x" onclick="alert(1)', name: 'Produto',
        desc: 'Teste', price: 10, category: 'feminino',
        img: 'x" onerror="alert(2)', alt: '" onload="alert(3)'
    }]);
    assert.match(markup, /src="assets\/img\/produtos\/placeholder\.svg"/);
    assert.match(markup, /&quot; onload=&quot;alert\(3\)/);
    assert.match(markup, /sku=x%22%20onclick%3D%22alert\(1\)/);
    assert.doesNotMatch(markup, /src="x" onerror=|alt="" onload=/);
});

test('valid catalog products preserve price and local image', () => {
    const { markup, count } = render([{
        sku: 'VFJ-001', name: 'Vestido', desc: 'Artesanal',
        price: 299, category: 'feminino',
        img: 'assets/img/produtos/placeholder.svg', alt: 'Vestido'
    }]);
    assert.match(markup, /R\$ 299,00/);
    assert.match(markup, /produto\.html\?sku=VFJ-001/);
    assert.match(count, /1 de 1/);
});

test('invalid API catalog payloads do not crash or display bogus prices', () => {
    assert.match(render({ error: 'unavailable' }).count, /0 de 0/);
    assert.match(render([{ price: 'Infinity' }]).count, /0 de 0/);
});

test('storefront does not direct customers to the placeholder WhatsApp number', () => {
    assert.doesNotMatch(html, /wa\.me\/5579999999999/);
    assert.match(html, /href="contato\.html"/);
});
