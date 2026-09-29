import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

// Real sandbox API access with an isolated POS database, not a simulated demo.
process.env.LIBREPOS_DATA_DIR = process.env.LIBREPOS_TEST_DATA_DIR || await mkdtemp(path.join(tmpdir(), 'librepos-uber-sandbox-'));
process.env.VITE_LIBREPOS_DEMO = 'false';
process.env.UBER_ALLOW_PRODUCTION = 'false';
const server = await createServer({ server: { host: '127.0.0.1', port: 5175, strictPort: true } });
await server.listen();
console.log(`LibrePOS · Pruebas Uber aisladas\nDatos: ${process.env.LIBREPOS_DATA_DIR}\nAcceso inicial: admin / admin\nPasarela: LIBREPOS_PORT=5175 npm run uber:webhook`);
server.printUrls();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0); });
