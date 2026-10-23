const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'cart.js'), 'utf8');

test('cart confirmation never interpolates product text into HTML', () => {
  const toast = source.slice(source.indexOf('showToast(msg)'));
  assert.match(toast, /textContent\s*=\s*msg/);
  assert.doesNotMatch(toast, /<span>\$\{msg\}<\/span>/);
});
