import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const candidateDistDirs = [
  path.resolve(__dirname, 'dist'),
  path.resolve(__dirname, 'apps/web/dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), 'apps/web/dist'),
];
const DIST_DIR = candidateDistDirs.find((d) => fs.existsSync(path.join(d, 'index.html'))) || candidateDistDirs[0];
const API_BACKEND_URL = process.env.VITE_API_URL || process.env.API_URL || 'https://pdiapi-production.up.railway.app';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  // Normalize URL
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // Health check endpoint
  if (pathname === '/healthz' || pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Reverse proxy API and uploads directly to Railway backend API
  if (pathname.startsWith('/api') || pathname.startsWith('/uploads')) {
    const targetUrl = new URL(req.url, API_BACKEND_URL);
    const isHttps = targetUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const proxyHeaders = { ...req.headers };
    proxyHeaders.host = targetUrl.host;
    delete proxyHeaders['content-length']; // let node recalculate or chunk

    const proxyReq = client.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          ...proxyHeaders,
          host: targetUrl.host,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err) => {
      console.error('[API Proxy Error]:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            message: 'Backend API service unavailable',
            error: { code: 'BAD_GATEWAY', detail: err.message },
          })
        );
      }
    });

    req.pipe(proxyReq, { end: true });
    return;
  }

  // Safe file path resolution within DIST_DIR
  let filePath = path.join(DIST_DIR, pathname);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, filePath);
    } else {
      // If directory, check for index.html inside
      if (!err && stats.isDirectory()) {
        const indexFile = path.join(filePath, 'index.html');
        if (fs.existsSync(indexFile)) {
          sendFile(res, indexFile);
          return;
        }
      }

      // SPA fallback: Return dist/index.html for client-side routing
      const spaFallback = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(spaFallback)) {
        sendFile(res, spaFallback);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found - Build output missing');
      }
    }
  });
});

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const cacheControl =
    ext === '.html'
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=31536000, immutable';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end(`Server Error: ${err.code}`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Content-Length': content.length,
    });
    res.end(content);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`PDI Web Server is running on http://${HOST}:${PORT}`);
  console.log(`Serving static files from: ${DIST_DIR}`);
  console.log(`Proxying /api and /uploads to: ${API_BACKEND_URL}`);
});
