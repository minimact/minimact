// Simple HTTP server for serving test pages and compiled Minimact files
//
// Serves:
// - /test-pages/* → tests/test-pages/
// - /dist/* → src/client-runtime/dist/
// - /extensions/* → src/minimact-*/dist/

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function resolveFilePath(url) {
  // Remove query string
  const cleanUrl = url.split('?')[0];

  // Route /dist/* to client-runtime/dist/
  if (cleanUrl.startsWith('/dist/')) {
    return path.join(ROOT, 'src', 'client-runtime', cleanUrl);
  }

  // Route /extensions/punch/* to minimact-punch/dist/
  if (cleanUrl.startsWith('/extensions/punch/')) {
    return path.join(ROOT, 'src', 'minimact-punch', 'dist', cleanUrl.replace('/extensions/punch/', ''));
  }

  // Route /extensions/query/* to minimact-query/dist/
  if (cleanUrl.startsWith('/extensions/query/')) {
    return path.join(ROOT, 'src', 'minimact-query', 'dist', cleanUrl.replace('/extensions/query/', ''));
  }

  // Route /extensions/dynamic/* to minimact-dynamic/dist/
  if (cleanUrl.startsWith('/extensions/dynamic/')) {
    return path.join(ROOT, 'src', 'minimact-dynamic', 'dist', cleanUrl.replace('/extensions/dynamic/', ''));
  }

  // Route /* to test-pages/
  return path.join(ROOT, 'tests', 'test-pages', cleanUrl === '/' ? 'index.html' : cleanUrl);
}

const server = http.createServer((req, res) => {
  const filePath = resolveFilePath(req.url);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} → ${filePath}`);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${req.url}\nTried: ${filePath}`, 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`500 Server Error: ${err.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  Minimact Test Server                                 ║
║  http://localhost:${PORT}                                ║
║                                                        ║
║  Routes:                                               ║
║    /                 → tests/test-pages/               ║
║    /dist/*           → src/client-runtime/dist/*       ║
║    /extensions/*     → src/minimact-*/dist/*           ║
╚═══════════════════════════════════════════════════════╝
  `);
});
