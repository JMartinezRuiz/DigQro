// This entry point stays with the original installation; each release runs in its own directory.
import { access, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { activeRelease, dataDir, installRoot, releasePath } from './release-layout.js';

let choices = ['bridge'];
try {
  const p = await activeRelease();
  choices = [...new Set([p.active, p.previous, 'bridge'])];
} catch { console.error('No se pudo leer el selector. Arrancando la instalación base.'); }
let started = false;
for (const id of choices) {
  const root = releasePath(id);
  const entry = path.join(root, 'node_modules/vite/bin/vite.js');
  try {
    await Promise.all(['sync-store.js', 'index.html', entry].map(f => access(path.resolve(root, f))));
  } catch { continue; }
  process.env.LIBREPOS_INSTALL_ROOT = installRoot;
  process.env.LIBREPOS_DATA_DIR = dataDir;
  // Vite validates its allowed root against the canonical Windows path.
  process.chdir(await realpath(root));
  process.argv = [process.execPath, entry, '--host', '0.0.0.0', ...process.argv.slice(2)];
  await import(pathToFileURL(entry).href);
  started = true;
  break;
}
if (!started) throw new Error('No hay una instalación lista. Ejecuta el instalador en la carpeta original.');
