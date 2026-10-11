#!/usr/bin/env node
/* Servidor de desenvolvimento estático para www/ + endpoint /api/enviar simulado.
 * Uso: node scripts/serve.js [porta]   (padrão 8080)
 * O /api/enviar apenas registra o payload no console e responde {success:true},
 * permitindo testar todo o fluxo do app sem o Worker/email real.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || process.argv[2] || 8080;
const ROOT = path.resolve(__dirname, '..', 'www');
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/api/enviar' && req.method === 'POST') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try { console.log('[api/enviar] recebido:', JSON.stringify(JSON.parse(body).aluno)); } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, mock: true }));
    });
    return;
  }

  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found: ' + url); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Prova ACLS em http://localhost:${PORT}  (Ctrl+C para parar)`));
