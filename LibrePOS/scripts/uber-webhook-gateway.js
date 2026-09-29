import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

// Publish this listener through an HTTPS reverse proxy/tunnel, never the POS server.
export function createUberWebhookGateway({ targetPort = 5173, fetcher = fetch } = {}) {
  return createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname !== '/api/uber/webhook' || url.search || req.method !== 'POST') { res.writeHead(404); res.end(); return; }
    if (!/^[a-f0-9]{64}$/.test(req.headers['x-uber-signature'] || '')) { res.writeHead(401); res.end(); return; }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) { res.writeHead(413); res.end(); return; } chunks.push(chunk); }
      const response = await fetcher(`http://127.0.0.1:${targetPort}/api/uber/webhook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Uber-Signature': req.headers['x-uber-signature'] },
        body: Buffer.concat(chunks), redirect: 'error', signal: AbortSignal.timeout(8000),
      });
      res.writeHead(response.status); res.end();
    } catch { res.writeHead(503); res.end(); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.UBER_WEBHOOK_PORT || 8788), targetPort = Number(process.env.LIBREPOS_PORT || 5173);
  if (![port, targetPort].every(value => Number.isInteger(value) && value > 0 && value <= 65535)) throw new Error('Puerto inválido.');
  const server = createUberWebhookGateway({ targetPort });
  server.headersTimeout = 10000; server.requestTimeout = 15000;
  server.listen(port, '127.0.0.1', () => console.log(`Pasarela Uber: http://127.0.0.1:${port}/api/uber/webhook → LibrePOS :${targetPort}\nPublica únicamente este puerto con HTTPS para registrar el webhook en Uber.`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
}
