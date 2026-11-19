import path from 'node:path';
import { createHash, randomBytes, randomUUID, verify } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile, link, rm, rename, access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { activeRelease, control, installRoot, dataDir, installation, slots, releasePath, selectRelease, packageVersion } from './release-layout.js';

const run = promisify(execFile);
const runningRoot = fileURLToPath(new URL('..', import.meta.url));
const origin = 'https://vps-5e3d8516.vps.ovh.us/librepos/v1/';
const publicKey = new URL('./release-signing.pub', import.meta.url);
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9a-zA-Z.-]+))?$/;

export function compareAppVersions(left, right) {
  const normalize = (value) => String(value || "").trim().replace(/^v/i, "");
  const parse = (value) => {
    const match = normalize(value).match(/^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) return null;
    return {
      numbers: match[1].split(".").map((part) => Number(part)),
      prerelease: match[2] || "",
    };
  };
  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return normalize(left).localeCompare(normalize(right), "en", { numeric: true });
  const length = Math.max(a.numbers.length, b.numbers.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a.numbers[index] || 0) - (b.numbers[index] || 0);
    if (difference) return difference < 0 ? -1 : 1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, "en", { numeric: true });
}

async function deviceToken() {
  const file = path.join(control, 'device');
  await mkdir(control, { recursive: true, mode: 0o700 });
  try { return await readFile(file, 'utf8'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const temp = file + '.' + randomUUID();
  await writeFile(temp, randomBytes(32).toString('hex'), { mode: 0o600 });
  try { await link(temp, file); }
  catch (e) { if (e.code !== 'EEXIST') throw e; }
  finally { await rm(temp, { force: true }); }
  return readFile(file, 'utf8');
}

export async function deviceId() { return digest(await deviceToken()); }

async function download(name, limit, timeout) {
  const response = await fetch(origin + name, {
    redirect: 'error', signal: AbortSignal.timeout(timeout),
    headers: { Authorization: 'Bearer ' + await deviceToken(), 'Cache-Control': 'no-cache' },
  });
  if (!response.ok || Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('download-channel-' + response.status);
  }
  const parts = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > limit) throw new Error('download-size');
    parts.push(chunk);
  }
  return Buffer.concat(parts, bytes);
}

export function verifyManifest(envelope, key) {
  const payload = Buffer.from(envelope.payload, 'base64');
  if (!verify(null, payload, key, Buffer.from(envelope.signature, 'base64'))) throw new Error('Firma de versión no válida.');
  const m = JSON.parse(payload);
  if (m.product !== 'LibrePOS' || m.format !== 1 || !semver.test(m.version) || !/^[a-f0-9]{64}$/.test(m.sha256)
    || !Number.isSafeInteger(m.bytes) || m.bytes < 1 || m.bytes > 192 * 1024 * 1024) throw new Error('Manifiesto inválido.');
  return m;
}

async function latest() {
  const envelope = JSON.parse(await download('manifest.json', 16384, 15000));
  return verifyManifest(envelope, await readFile(publicKey));
}

export async function getUpdateStatus() {
  const [p, m, running] = await Promise.all([activeRelease(), latest(), packageVersion(runningRoot)]);
  const selected = await packageVersion(releasePath(p.active));
  return { available: compareAppVersions(selected, m.version) < 0, localPackageVersion: running,
    remotePackageVersion: m.version, localCommit: 'v' + running, remoteCommit: 'v' + m.version,
    restartRequired: selected !== running, checkedAt: new Date().toISOString() };
}

async function noOpenRegister() {
  let data;
  try { data = JSON.parse(await readFile(path.join(dataDir, 'state.json'), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return; throw e; }
  if (data.state?.cashSessions?.some(s => s.status === 'open')) throw new Error('cash-register-open');
}

async function withUpdateLock(work) {
  // The OS releases this per-installation lock on crash, including when the CLI and UI race.
  const lock = createServer(socket => socket.destroy());
  const port = 36000 + parseInt(installation.slice(0, 4), 16) % 24000;
  await new Promise((resolve, reject) => {
    lock.once('error', e => reject(e.code === 'EADDRINUSE' ? new Error('update-in-progress') : e));
    lock.listen(port, '127.0.0.1', resolve);
  });
  try { return await work(); }
  finally { lock.close(); }
}

export async function applyRepositoryUpdate({ repair = false } = {}) {
  return withUpdateLock(async () => {
    await noOpenRegister();
    const p = await activeRelease();
    const m = await latest();
    const current = await packageVersion(releasePath(p.active));
    if (compareAppVersions(current, m.version) >= 0 && !(repair && current === m.version)) {
      return { updated: false, available: false, remoteCommit: 'v' + m.version };
    }
    const bytes = await download('packages/' + m.sha256 + '.zip', m.bytes, 180000);
    if (bytes.length !== m.bytes || digest(bytes) !== m.sha256) throw new Error('El paquete no coincide con la firma.');
    await mkdir(slots, { recursive: true, mode: 0o700 });
    const stage = await mkdtemp(path.join(slots, 'stage-'));
    try {
      const zip = path.join(stage, 'release.zip');
      const source = path.join(stage, 'app');
      await mkdir(source);
      await writeFile(zip, bytes);
      if (process.platform === 'win32') {
        await run('powershell.exe', ['-NoProfile','-NonInteractive','-Command', "$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:LP_ZIP -DestinationPath $env:LP_STAGE"], {
          env: { ...process.env, LP_ZIP: zip, LP_STAGE: source }, timeout: 150000 });
      } else {
        await run('unzip', ['-q', zip, '-d', source], { timeout: 150000 });
      }
      if (await packageVersion(source) !== m.version) throw new Error('Versión interna incorrecta.');
      const opts = { cwd: source, timeout: 180000, maxBuffer: 4*1024*1024 };
      const ci = ['ci','--include=dev','--no-audit','--no-fund','--prefer-offline'];
      if (process.platform === 'win32') await run('cmd.exe', ['/d','/c','npm',...ci], opts);
      else await run('npm', ci, opts);
      await run(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], opts);
      await run(process.execPath, ['--input-type=module','-e',"await import('./sync-store.js')"], opts);
      await noOpenRegister();
      // Use a fresh slot even when reinstalling an identical signed archive.
      const id = digest(randomBytes(32));
      await rename(source, releasePath(id));
      await selectRelease(id, p.active);
      return { updated: true, available: false, remoteCommit: 'v' + m.version, restartRequired: true };
    } finally { await rm(stage, { recursive: true, force: true }); }
  });
}

export async function rollback() {
  return withUpdateLock(async () => {
    await noOpenRegister();
    const p = await activeRelease();
    await access(path.join(releasePath(p.previous), 'sync-store.js'));
    await selectRelease(p.previous, p.active);
  });
}
