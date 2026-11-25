"use strict";
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = fs.realpathSync(__dirname);
const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
};
const TEXT_EXTS = new Set(['.html', '.js', '.json', '.css', '.svg']);
const IMMUTABLE_CACHE_EXTS = new Set(['.css', '.js', '.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg', '.ico', '.woff2']);

const HOST = process.env.HOST || '127.0.0.1';
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
        // Decode BEFORE URL/path normalization; encoded '..' must not disappear
        // when constructing a URL object. Refuse traversal, not merely missing
        // files. Query parameters never become part of the disk path.
        const rawPath = String(req.url || '/').split(/[?#]/, 1)[0];
        pathname = decodeURIComponent(rawPath);
        if (!pathname.startsWith('/') || pathname.split('/').includes('..')) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
    } catch {
        res.writeHead(400);
        res.end('Bad request');
        return;
    }

    if (pathname === '/' || pathname === '/index.html') pathname = '/loja.html';
    const segments = pathname.split('/').filter(Boolean);
    const ext = path.extname(pathname).toLowerCase();
    if (segments.some(segment => segment.startsWith('.')) || !Object.hasOwn(MIME, ext)) {
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
            const realExt = path.extname(realFile).toLowerCase();
            const isText = TEXT_EXTS.has(realExt);
            const headers = {
                'Content-Type': MIME[realExt] + (isText ? '; charset=utf-8' : ''),
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
                'Cache-Control': IMMUTABLE_CACHE_EXTS.has(realExt) ? 'public, max-age=3600' : 'no-store'
            };

            const acceptEncoding = String(req.headers['accept-encoding'] || '');
            if (req.method === 'GET' && isText && data.length > 1024 && /\bgzip\b/i.test(acceptEncoding)) {
                zlib.gzip(data, { level: 6 }, (gzErr, compressed) => {
                    if (gzErr) {
                        res.writeHead(200, headers);
                        res.end(data);
                        return;
                    }
                    headers['Content-Encoding'] = 'gzip';
                    headers['Vary'] = 'Accept-Encoding';
                    res.writeHead(200, headers);
                    res.end(compressed);
                });
                return;
            }

            res.writeHead(200, headers);
            res.end(req.method === 'HEAD' ? undefined : data);
        });
    });
});

server.listen(PORT, HOST, () =>
    console.log('Server: http://' + HOST + ':' + PORT));
