import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const installRoot = path.resolve(process.env.LIBREPOS_INSTALL_ROOT || fileURLToPath(new URL('..', import.meta.url)));
export const dataDir = path.resolve(process.env.LIBREPOS_DATA_DIR || path.join(installRoot, '.librepos'));
export const installation = createHash('sha256').update(installRoot + '\0' + dataDir).digest('hex');
const userApps = process.platform === 'win32'
  ? process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support')
  : process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
export const slots = path.join(userApps, 'LibrePOS', 'runtime', installation);
export const control = path.join(dataDir, 'updates');
const pointer = path.join(control, 'active.json');

export function releasePath(id) {
  if (id === 'bridge') return installRoot;
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Identificador de versión inválido.');
  return path.join(slots, id);
}

export async function activeRelease() {
  try {
    const p = JSON.parse(await readFile(pointer, 'utf8'));
    releasePath(p.active);
    releasePath(p.previous);
    return p;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { active: 'bridge', previous: 'bridge' };
  }
}

export async function selectRelease(active, previous) {
  releasePath(active);
  releasePath(previous);
  await mkdir(control, { recursive: true, mode: 0o700 });
  const pending = pointer + '.' + randomUUID();
  await writeFile(pending, JSON.stringify({ active, previous }), { mode: 0o600, flush: true });
  await rename(pending, pointer);
}

export async function packageVersion(root) {
  return JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
}
