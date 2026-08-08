const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const MIME = {'.html':'text/html','.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.css':'text/css','.svg':'image/svg+xml'};
http.createServer((req, res) => {
    let requested;
    try { requested = decodeURIComponent(req.url.split('?')[0]); }
    catch { res.writeHead(400); res.end('Bad request'); return; }
    if (requested === '/') requested = '/loja.html';
    const fp = path.resolve(ROOT, `.${requested}`);
    if (fp !== ROOT && !fp.startsWith(`${ROOT}${path.sep}`)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, {
            'Content-Type': `${MIME[path.extname(fp)] || 'application/octet-stream'}; charset=utf-8`,
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        });
        res.end(data);
    });
}).listen(Number(process.env.PORT || 5500), '127.0.0.1', () => console.log('Server: http://127.0.0.1:5500'));
