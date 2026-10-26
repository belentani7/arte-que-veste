'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { createStaticServer } = require('../server');

async function request(server, pathname, method = 'GET') {
  const port = server.address().port;
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: pathname, method,
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
      response.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('static shop serves public pages but not private files or paths', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aqv-static-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'aqv-outside-'));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(path.join(root, 'loja.html'), '<h1>Arte Que Veste</h1>');
  fs.writeFileSync(path.join(root, 'products.json'), '[{"sku":"test"}]');
  fs.writeFileSync(path.join(root, '.env'), 'HIDDEN=secret');
  fs.writeFileSync(path.join(root, 'assets', 'style.css'), 'body{color:teal}');
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'PRIVATE SECRET');
  fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(root, 'assets', 'leak.txt'));

  const server = createStaticServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const home = await request(server, '/');
  assert.equal(home.status, 200);
  assert.match(home.body, /Arte Que Veste/);
  assert.match(home.headers['content-type'], /text\/html/);
  assert.equal(home.headers['cache-control'], 'no-store');
  assert.equal(home.headers['x-content-type-options'], 'nosniff');

  const css = await request(server, '/assets/style.css?v=2');
  assert.equal(css.status, 200);
  assert.match(css.headers['content-type'], /text\/css/);
  assert.equal(css.body, 'body{color:teal}');

  const products = await request(server, '/products.json');
  assert.equal(products.status, 200);
  assert.equal(products.headers['cache-control'], 'no-store');

  const head = await request(server, '/loja.html', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.equal(Number(head.headers['content-length']), Buffer.byteLength(home.body));

  const method = await request(server, '/products.json', 'POST');
  assert.equal(method.status, 405);
  assert.equal(method.headers.allow, 'GET, HEAD');

  for (const pathname of [
    '/.env', '/assets/../products.json', '/%2e%2e/secret.txt',
    '/assets/%2e%2e/products.json', '/assets/leak.txt',
  ]) {
    const result = await request(server, pathname);
    assert.ok([403, 400].includes(result.status), pathname + ' should be rejected');
    assert.doesNotMatch(result.body, /PRIVATE SECRET|HIDDEN=secret/);
  }

  for (const pathname of ['/assets%2fleak.txt', '/assets%5cleak.txt', '/%00', '/%E0%A4%A']) {
    const response = await request(server, pathname);
    assert.equal(response.status, 400, pathname);
  }
  assert.equal((await request(server, '/not-exists.html')).status, 404);
  assert.equal((await request(server, '/no-executable.sh')).status, 404);
});
