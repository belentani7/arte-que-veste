'use strict';

// Static demonstration storefront. Checkout and payments are not implemented here.
// Serve only public assets inside the configured storefront directory.
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
});

function isInside(root, file) {
  return file === root || file.startsWith(root + path.sep);
}

function send(res, status, message, isHead = false) {
  const body = Buffer.from(message, 'utf8');
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Length', body.length);
  res.end(isHead ? undefined : body);
}

function createStaticServer(directory = __dirname) {
  const root = fs.realpathSync(directory);
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return send(res, 405, 'Method not allowed');
    }
    const head = req.method === 'HEAD';
    const raw = (req.url || '/').split(/[?#]/, 1)[0];
    // Encoded separators or NULs can make different URL/path parsers disagree.
    if (/%(?:2f|5c|00)/i.test(raw)) return send(res, 400, 'Invalid path', head);

    let requested;
    try {
      requested = decodeURIComponent(raw);
    } catch {
      return send(res, 400, 'Invalid path', head);
    }
    if (!requested.startsWith('/') || requested.includes('\0') || requested.includes('\\')) {
      return send(res, 400, 'Invalid path', head);
    }
    const segments = requested === '/' ? ['loja.html'] : requested.split('/').filter(Boolean);
    if (segments.some(segment => segment === '.' || segment === '..' || segment.startsWith('.'))) {
      return send(res, 403, 'Forbidden', head);
    }
    const candidate = path.resolve(root, ...segments);
    if (!isInside(root, candidate)) return send(res, 403, 'Forbidden', head);
    const mime = MIME[path.extname(candidate).toLowerCase()];
    if (!mime) return send(res, 404, 'Not found', head);

    try {
      const real = await fsp.realpath(candidate);
      if (!isInside(root, real)) return send(res, 403, 'Forbidden', head);
      const stat = await fsp.stat(real);
      if (!stat.isFile()) return send(res, 404, 'Not found', head);

      const data = await fsp.readFile(real);
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', data.length);
      res.setHeader('Cache-Control', mime.startsWith('text/html') || mime.startsWith('application/json')
        ? 'no-store' : 'public, max-age=3600');
      return res.end(head ? undefined : data);
    } catch (error) {
      if (error && ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) {
        return send(res, 404, 'Not found', head);
      }
      // Do not leak absolute paths or stack traces to visitors.
      console.error('[static storefront] file serving failed');
      return send(res, 500, 'Internal error', head);
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 5500);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be between 1 and 65535');
    process.exitCode = 1;
  } else {
    createStaticServer().listen(port, '127.0.0.1', () => {
      console.log('Arte Que Veste storefront listening on http://127.0.0.1:' + port);
    });
  }
}

module.exports = { createStaticServer };
