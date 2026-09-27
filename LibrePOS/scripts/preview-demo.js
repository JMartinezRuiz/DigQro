import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";

// One disposable data directory per preview; the operational store is untouched.
const dataDirectory = await mkdtemp(path.join(tmpdir(), "librepos-demo-"));
process.env.LIBREPOS_DATA_DIR = dataDirectory;
process.env.VITE_LIBREPOS_DEMO = "true";
const server = await createServer({ server: { host: "0.0.0.0", port: 5174, strictPort: true } });
await server.listen();
console.log(`LibrePOS 2.0 · Demostración local\nDatos de prueba: ${dataDirectory}\nAcceso inicial: admin / admin`);
server.printUrls();
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, async () => { await server.close(); process.exit(0); });
