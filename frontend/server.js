"use strict";
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = fs.realpathSync(__dirname);
const MIME = {
    '.html': 'text/html', '.js': 'application/javascript',
    '.json': 'application/json', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
const PORT = Number(process.env.PORT || 5500);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
}

const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end('Method not allowed');
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
        res.writeHead(400);
        res.end('Bad request');
        return;
    }
    if (pathname === '/') pathname = '/loja.html';
    const segments = pathname.split('/').filter(Boolean);
    if (segments.some(segment => segment.startsWith('.')) ||
        !Object.hasOwn(MIME, path.extname(pathname).toLowerCase())) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    const fp = path.resolve(ROOT, '.' + pathname);
    if (!fp.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    fs.realpath(fp, (resolveErr, realFile) => {
        if (resolveErr || !realFile.startsWith(ROOT + path.sep)) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        fs.readFile(realFile, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            res.writeHead(200, {
                'Content-Type': MIME[path.extname(realFile).toLowerCase()],
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Cache-Control': 'no-store'
            });
            res.end(req.method === 'HEAD' ? undefined : data);
        });
    });
});
server.listen(PORT, '127.0.0.1', () =>
    console.log('Server: http://127.0.0.1:' + PORT));
