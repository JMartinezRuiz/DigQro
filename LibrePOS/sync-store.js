import { createHash, randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import http from "node:http";
import https from "node:https";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT_DIR, ".librepos");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const TOKEN_FILE = path.join(DATA_DIR, "sync-token");
const VERSION_FILE = path.join(DATA_DIR, "app-version.json");
const UPDATE_SOURCE_FILE = path.join(DATA_DIR, "update-source.json");
const BODY_LIMIT = 8 * 1024 * 1024;
const ACCESS_COOKIE = "librepos_sync";
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = "sha256";
const UPDATE_REPO_OWNER = "JMartinezRuiz";
const UPDATE_REPO_NAME = "DigQro";
const UPDATE_BRANCH = "main";
const UPDATE_PROJECT_PREFIX = "LibrePOS/";
const UPDATE_REPO_URL = `https://github.com/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}`;
const DEFAULT_UPDATE_MIRRORS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const PRESERVED_UPDATE_DIRS = new Set([".git", ".librepos", ".vite", "node_modules", "dist"]);
const PRESERVED_UPDATE_FILES = new Set([".DS_Store", ".env", ".env.local"]);
const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "LibrePOS-Updater",
  "X-GitHub-Api-Version": "2022-11-28",
};

let sharedState = null;
let sharedVersion = 0;
let accessToken = "";
let updateInProgress = false;
const clients = new Set();
const execFile = promisify(execFileCallback);

async function loadSharedState() {
  if (sharedState) return;
  try {
    const data = JSON.parse(await readFile(STATE_FILE, "utf8"));
    const normalized = normalizeStateForStorage(data.state || null);
    sharedState = normalized.state;
    sharedVersion = Number(data.version) || 0;
    if (normalized.changed) {
      await writeStateFile();
    }
  } catch {
    sharedState = null;
    sharedVersion = 0;
  }
}

async function ensureAccessToken() {
  if (accessToken) return accessToken;
  await mkdir(DATA_DIR, { recursive: true });
  try {
    accessToken = (await readFile(TOKEN_FILE, "utf8")).trim();
  } catch {
    accessToken = randomBytes(32).toString("hex");
    await writeFile(TOKEN_FILE, accessToken);
  }
  return accessToken;
}

async function writeStateFile() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify({ version: sharedVersion, state: sharedState }, null, 2));
}

async function saveSharedState(state, clientId = "") {
  await mkdir(DATA_DIR, { recursive: true });
  const normalized = normalizeStateForStorage(state);
  sharedState = normalized.state;
  sharedVersion = Math.max(Date.now(), sharedVersion + 1);
  await writeStateFile();
  broadcast({ type: "state", version: sharedVersion, state: publicState(sharedState), clientId });
  return { version: sharedVersion, state: publicState(sharedState) };
}

function broadcast(payload) {
  const data = `event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(data);
    } catch {
      clients.delete(client);
    }
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > BODY_LIMIT) {
        reject(new Error("payload-too-large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function hashPassword(password, salt = randomBytes(16).toString("hex"), iterations = PASSWORD_ITERATIONS) {
  return {
    passwordHash: pbkdf2Sync(String(password), salt, iterations, PASSWORD_KEYLEN, PASSWORD_DIGEST).toString("hex"),
    passwordSalt: salt,
    passwordIterations: iterations,
  };
}

function verifyPassword(user, password) {
  if (!user || user.active === false) return false;
  if (user.passwordHash && user.passwordSalt) {
    const iterations = Number(user.passwordIterations) || PASSWORD_ITERATIONS;
    const attempted = hashPassword(password, user.passwordSalt, iterations).passwordHash;
    try {
      return timingSafeEqual(Buffer.from(attempted, "hex"), Buffer.from(user.passwordHash, "hex"));
    } catch {
      return false;
    }
  }
  return typeof user.password === "string" && user.password === String(password);
}

function normalizeStateForStorage(state) {
  if (!state || typeof state !== "object") return { state: null, changed: false };
  let changed = false;
  const next = structuredClone(state);
  const users = Array.isArray(next.users) ? next.users : [];
  next.users = users.map((user) => {
    const normalized = { ...user };
    if (typeof normalized.password === "string" && normalized.password) {
      Object.assign(normalized, hashPassword(normalized.password));
      delete normalized.password;
      changed = true;
    }
    if (!normalized.passwordHash && normalized.username === "admin") {
      Object.assign(normalized, hashPassword("admin"));
      changed = true;
    }
    return normalized;
  });
  return { state: next, changed };
}

function publicState(state) {
  if (!state || typeof state !== "object") return state;
  const copy = structuredClone(state);
  copy.users = Array.isArray(copy.users)
    ? copy.users.map(({ password, passwordHash, passwordSalt, passwordIterations, ...user }) => user)
    : [];
  return copy;
}

function validateStatePayload(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "missing-state";
  const arrayKeys = ["users", "orders", "sales", "cancellations", "inventory", "inventoryMovements", "expenses", "attendance"];
  for (const key of arrayKeys) {
    if (!Array.isArray(state[key])) return `invalid-${key}`;
  }
  if (!state.settings || typeof state.settings !== "object" || Array.isArray(state.settings)) return "invalid-settings";
  return "";
}

function cookieValue(req, name) {
  const cookie = req.headers.cookie || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function requestOriginAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function setAccessCookie(res) {
  const token = await ensureAccessToken();
  res.setHeader("Set-Cookie", `${ACCESS_COOKIE}=${token}; Path=/; SameSite=Lax`);
  return token;
}

async function requireAccess(req, res) {
  const token = await ensureAccessToken();
  if (!requestOriginAllowed(req)) {
    sendJson(res, 403, { error: "origin-not-allowed" });
    return false;
  }
  if (cookieValue(req, ACCESS_COOKIE) !== token) {
    sendJson(res, 403, { error: "sync-access-required" });
    return false;
  }
  return true;
}

function githubApiUrl(pathname) {
  return `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}${pathname}`;
}

function githubRawUrl(githubPath) {
  const encodedPath = githubPath.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/${UPDATE_BRANCH}/${encodedPath}`;
}

function requestUrl(url, { json = true, headers = {}, timeout = 25000 } = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    const target = url instanceof URL ? url : new URL(url);
    const transport = target.protocol === "http:" ? http : https;
    const req = transport.request(
      target,
      {
        method: "GET",
        headers,
      },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
          res.resume();
          if (redirects >= 5) {
            reject(new Error("download-redirect-limit"));
            return;
          }
          resolve(requestUrl(new URL(res.headers.location, target), { json, headers, timeout }, redirects + 1));
          return;
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          if (status < 200 || status >= 300) {
            reject(new Error(`download-${status}: ${body.toString("utf8").slice(0, 240)}`));
            return;
          }
          if (!json) {
            resolve(body);
            return;
          }
          try {
            resolve(JSON.parse(body.toString("utf8")));
          } catch {
            reject(new Error("download-invalid-json"));
          }
        });
      },
    );
    req.setTimeout(timeout, () => {
      req.destroy(new Error("download-timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

function requestGithub(url, { json = true, headers = {} } = {}) {
  return requestUrl(url, {
    json,
    headers: { ...GITHUB_API_HEADERS, ...headers },
  });
}

async function readLocalAppVersion() {
  try {
    const version = JSON.parse(await readFile(VERSION_FILE, "utf8"));
    if (version?.commitSha) {
      return { commitSha: String(version.commitSha), source: "version-file", updatedAt: version.updatedAt || "" };
    }
  } catch {
    // Older installs do not have this file yet.
  }

  try {
    const { stdout } = await execFile("git", ["log", "-n", "1", "--format=%H", "--", "."], {
      cwd: ROOT_DIR,
      timeout: 5000,
      maxBuffer: 64 * 1024,
    });
    const commitSha = stdout.trim();
    if (commitSha) return { commitSha, source: "git", updatedAt: "" };
  } catch {
    // ZIP installs normally do not have git metadata.
  }

  return { commitSha: null, source: "unknown", updatedAt: "" };
}

async function writeLocalAppVersion(commitSha) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    VERSION_FILE,
    JSON.stringify(
      {
        commitSha,
        branch: UPDATE_BRANCH,
        repo: `${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}`,
        projectPath: UPDATE_PROJECT_PREFIX.replace(/\/$/, ""),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

async function fetchLatestRemoteVersion() {
  const commitsUrl = new URL(githubApiUrl("/commits"));
  commitsUrl.searchParams.set("sha", UPDATE_BRANCH);
  commitsUrl.searchParams.set("path", UPDATE_PROJECT_PREFIX.replace(/\/$/, ""));
  commitsUrl.searchParams.set("per_page", "1");
  const commits = await requestGithub(commitsUrl);
  const latest = Array.isArray(commits) ? commits[0] : null;
  if (!latest?.sha) return null;
  return {
    commitSha: latest.sha,
    htmlUrl: latest.html_url || `${UPDATE_REPO_URL}/commit/${latest.sha}`,
    date: latest.commit?.committer?.date || latest.commit?.author?.date || "",
  };
}

async function getUpdateStatus(options = {}) {
  if (options.source === "mirror") return getMirrorUpdateStatus();
  try {
    return await getGithubUpdateStatus();
  } catch (error) {
    try {
      const mirrorStatus = await getMirrorUpdateStatus();
      return { ...mirrorStatus, githubError: compactError(error) };
    } catch (mirrorError) {
      throw new Error(`update-source-unreachable: github=${compactError(error)} mirror=${compactError(mirrorError)}`);
    }
  }
}

async function getGithubUpdateStatus() {
  const [storedLocal, remote] = await Promise.all([readLocalAppVersion(), fetchLatestRemoteVersion()]);
  let local = storedLocal;
  let localIncludesRemote = false;
  if (remote?.commitSha && storedLocal.source === "git" && !sameCommit(storedLocal.commitSha, remote.commitSha)) {
    localIncludesRemote = await gitCommitIncludes(remote.commitSha, storedLocal.commitSha);
  }
  if (remote?.commitSha && !localIncludesRemote && !sameCommit(storedLocal.commitSha, remote.commitSha)) {
    try {
      const remoteFiles = await fetchRemoteProjectFiles();
      local = (await readLocalVersionFromFiles(remoteFiles, remote.commitSha)) || storedLocal;
    } catch {
      local = storedLocal;
    }
  }
  const available = Boolean(remote?.commitSha && !localIncludesRemote && (!local.commitSha || !sameCommit(local.commitSha, remote.commitSha)));
  return {
    source: "github",
    available,
    repoUrl: UPDATE_REPO_URL,
    branch: UPDATE_BRANCH,
    projectPath: UPDATE_PROJECT_PREFIX.replace(/\/$/, ""),
    localCommit: local.commitSha,
    localSource: local.source,
    localIncludesRemote,
    localUpdatedAt: local.updatedAt,
    remoteCommit: remote?.commitSha || null,
    remoteUrl: remote?.htmlUrl || UPDATE_REPO_URL,
    remoteDate: remote?.date || "",
    checkedAt: new Date().toISOString(),
  };
}

function sameCommit(left, right) {
  if (!left || !right) return false;
  const a = String(left);
  const b = String(right);
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function compactError(error) {
  return String(error?.message || error || "unknown").replace(/\s+/g, " ").slice(0, 280);
}

async function gitCommitIncludes(ancestorCommit, descendantCommit) {
  if (!ancestorCommit || !descendantCommit) return false;
  try {
    await execFile("git", ["merge-base", "--is-ancestor", ancestorCommit, descendantCommit], {
      cwd: ROOT_DIR,
      timeout: 5000,
      maxBuffer: 64 * 1024,
    });
    return true;
  } catch {
    return false;
  }
}

function gitBlobSha(buffer) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${buffer.length}\0`))
    .update(buffer)
    .digest("hex");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalizeMirrorUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function readUpdateMirrorUrls() {
  const urls = [];
  if (process.env.LIBREPOS_UPDATE_MIRROR) {
    urls.push(...process.env.LIBREPOS_UPDATE_MIRROR.split(","));
  }
  try {
    const config = JSON.parse(await readFile(UPDATE_SOURCE_FILE, "utf8"));
    if (Array.isArray(config.mirrorUrls)) urls.push(...config.mirrorUrls);
    if (config.mirrorUrl) urls.push(config.mirrorUrl);
  } catch {
    // The built-in local mirror is used when no custom source is configured.
  }
  urls.push(...DEFAULT_UPDATE_MIRRORS);
  urls.push(...localInterfaceMirrorUrls());
  return [...new Set(urls.map(normalizeMirrorUrl).filter(Boolean))];
}

function localInterfaceMirrorUrls() {
  const urls = [];
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family !== "IPv4" || address.internal) continue;
      urls.push(`http://${address.address}:3000`);
    }
  }
  return urls;
}

function lanMirrorCandidates(knownUrls) {
  const known = new Set(knownUrls);
  const candidates = [];
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family !== "IPv4" || address.internal) continue;
      const parts = address.address.split(".");
      if (parts.length !== 4) continue;
      const prefix = parts.slice(0, 3).join(".");
      for (let host = 1; host <= 254; host += 1) {
        const url = `http://${prefix}.${host}:3000`;
        if (!known.has(url)) candidates.push(url);
      }
    }
  }
  return [...new Set(candidates)];
}

function parseMirrorCommit(name) {
  const matches = String(name || "").matchAll(/(?:^|[-_])([0-9a-f]{7,40})(?=[-_.])/gi);
  for (const match of matches) {
    if (/[a-f]/i.test(match[1])) return match[1].toLowerCase();
  }
  return null;
}

function findMirrorPackage(files) {
  const zips = files
    .filter((file) => /^LibrePOS-Windows-.*\.zip$/i.test(file.name || ""))
    .filter((file) => !/\.sha256$/i.test(file.name || ""))
    .sort((a, b) => {
      const priority = Number(/auto-update/i.test(b.name || "")) - Number(/auto-update/i.test(a.name || ""));
      if (priority) return priority;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  const pack = zips[0];
  if (!pack) return null;
  const shaFile = files.find((file) => file.name === `${pack.name}.sha256`);
  return {
    name: pack.name,
    packageUrl: pack.downloadUrl,
    shaUrl: shaFile?.downloadUrl || "",
    commitSha: parseMirrorCommit(pack.name),
    date: pack.createdAt || "",
  };
}

async function fetchMirrorPackageInfo(mirrorUrl) {
  const apiUrl = new URL("/api/items", `${mirrorUrl}/`);
  const payload = await requestUrl(apiUrl, { headers: { Accept: "application/json" }, timeout: 1500 });
  const pack = findMirrorPackage(Array.isArray(payload.files) ? payload.files : []);
  if (!pack?.packageUrl) throw new Error("mirror-package-not-found");
  return { mirrorUrl, ...pack };
}

async function probeMirrorUrl(mirrorUrl) {
  try {
    const apiUrl = new URL("/api/items", `${mirrorUrl}/`);
    const payload = await requestUrl(apiUrl, { headers: { Accept: "application/json" }, timeout: 450 });
    return Array.isArray(payload.files);
  } catch {
    return false;
  }
}

async function discoverLanMirrorUrls(knownUrls) {
  const candidates = lanMirrorCandidates(knownUrls);
  const found = [];
  let cursor = 0;
  const workerCount = Math.min(48, candidates.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < candidates.length && found.length < 4) {
        const mirrorUrl = candidates[cursor];
        cursor += 1;
        if (await probeMirrorUrl(mirrorUrl)) found.push(mirrorUrl);
      }
    }),
  );
  return found;
}

async function getMirrorUpdateStatus() {
  const local = await readLocalAppVersion();
  const errors = [];
  const knownUrls = await readUpdateMirrorUrls();
  for (const mirrorUrl of knownUrls) {
    try {
      const pack = await fetchMirrorPackageInfo(mirrorUrl);
      const available = Boolean(!pack.commitSha || !sameCommit(local.commitSha, pack.commitSha));
      return {
        source: "mirror",
        available,
        repoUrl: UPDATE_REPO_URL,
        mirrorUrl,
        packageName: pack.name,
        packageUrl: pack.packageUrl,
        shaUrl: pack.shaUrl,
        branch: UPDATE_BRANCH,
        projectPath: UPDATE_PROJECT_PREFIX.replace(/\/$/, ""),
        localCommit: local.commitSha,
        localSource: local.source,
        localIncludesRemote: false,
        localUpdatedAt: local.updatedAt,
        remoteCommit: pack.commitSha,
        remoteUrl: pack.packageUrl,
        remoteDate: pack.date,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      errors.push(`${mirrorUrl}: ${compactError(error)}`);
    }
  }
  for (const mirrorUrl of await discoverLanMirrorUrls(knownUrls)) {
    try {
      const pack = await fetchMirrorPackageInfo(mirrorUrl);
      const available = Boolean(!pack.commitSha || !sameCommit(local.commitSha, pack.commitSha));
      return {
        source: "mirror",
        available,
        repoUrl: UPDATE_REPO_URL,
        mirrorUrl,
        packageName: pack.name,
        packageUrl: pack.packageUrl,
        shaUrl: pack.shaUrl,
        branch: UPDATE_BRANCH,
        projectPath: UPDATE_PROJECT_PREFIX.replace(/\/$/, ""),
        localCommit: local.commitSha,
        localSource: local.source,
        localIncludesRemote: false,
        localUpdatedAt: local.updatedAt,
        remoteCommit: pack.commitSha,
        remoteUrl: pack.packageUrl,
        remoteDate: pack.date,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      errors.push(`${mirrorUrl}: ${compactError(error)}`);
    }
  }
  throw new Error(`mirror-unreachable: ${errors.join(" | ")}`);
}

async function readMirrorSha(status) {
  if (!status.shaUrl) return "";
  try {
    const buffer = await requestUrl(status.shaUrl, { json: false, headers: { Accept: "text/plain" } });
    const match = buffer.toString("utf8").match(/[a-f0-9]{64}/i);
    return match ? match[0].toLowerCase() : "";
  } catch {
    return "";
  }
}

async function extractLibrePosZip(buffer) {
  const zipModule = await import("adm-zip");
  const AdmZip = zipModule.default || zipModule;
  const zip = new AdmZip(buffer);
  const files = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const entryName = entry.entryName.replaceAll("\\", "/");
    const relativePath = safeRemoteRelativePath(entryName);
    if (!relativePath) continue;
    files.push({
      relativePath,
      buffer: entry.getData(),
    });
  }
  if (!files.length) throw new Error("mirror-package-empty");
  return files;
}

async function readLocalVersionFromFiles(remoteFiles, remoteCommit) {
  const localFiles = new Set(await listLocalProjectFiles());
  if (localFiles.size !== remoteFiles.length) return null;
  for (const file of remoteFiles) {
    if (!localFiles.has(file.relativePath)) return null;
    const targetPath = path.join(ROOT_DIR, ...file.relativePath.split("/"));
    assertInsideRoot(targetPath);
    const buffer = await readFile(targetPath);
    if (gitBlobSha(buffer) !== file.sha) return null;
  }
  return { commitSha: remoteCommit, source: "files", updatedAt: "" };
}

function safeRemoteRelativePath(githubPath) {
  if (!githubPath.startsWith(UPDATE_PROJECT_PREFIX)) return null;
  const relativePath = githubPath.slice(UPDATE_PROJECT_PREFIX.length);
  if (!relativePath || relativePath.includes("\\")) return null;
  const normalized = path.posix.normalize(relativePath);
  if (!normalized || normalized === "." || normalized.startsWith("../") || path.isAbsolute(normalized)) return null;
  const rootName = normalized.split("/")[0];
  if (PRESERVED_UPDATE_DIRS.has(rootName) || PRESERVED_UPDATE_FILES.has(normalized)) return null;
  return normalized;
}

async function fetchRemoteProjectFiles() {
  const commit = await requestGithub(githubApiUrl(`/commits/${UPDATE_BRANCH}`));
  const treeSha = commit?.commit?.tree?.sha;
  if (!treeSha) throw new Error("github-tree-not-found");
  const treeUrl = new URL(githubApiUrl(`/git/trees/${treeSha}`));
  treeUrl.searchParams.set("recursive", "1");
  const tree = await requestGithub(treeUrl);
  if (tree.truncated) throw new Error("github-tree-truncated");
  const files = (Array.isArray(tree.tree) ? tree.tree : [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => ({ githubPath: entry.path, relativePath: safeRemoteRelativePath(entry.path), sha: entry.sha }))
    .filter((entry) => entry.relativePath);
  if (!files.length) throw new Error("github-project-empty");
  return files;
}

function assertInsideRoot(targetPath) {
  const relativePath = path.relative(ROOT_DIR, targetPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("unsafe-update-path");
  }
}

async function downloadRemoteProjectFiles(files) {
  const downloaded = [];
  for (const file of files) {
    const buffer = await requestGithub(githubRawUrl(file.githubPath), {
      json: false,
      headers: { Accept: "application/octet-stream" },
    });
    downloaded.push({ ...file, buffer });
  }
  return downloaded;
}

async function listLocalProjectFiles(baseDir = ROOT_DIR, prefix = "") {
  const entries = await readdir(baseDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const rootName = relativePath.split("/")[0];
    if (PRESERVED_UPDATE_DIRS.has(rootName) || PRESERVED_UPDATE_FILES.has(relativePath)) continue;
    const absolutePath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listLocalProjectFiles(absolutePath, relativePath));
      continue;
    }
    if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(relativePath);
    }
  }
  return files;
}

async function removeStaleProjectFiles(remoteFiles) {
  const localFiles = await listLocalProjectFiles();
  await Promise.all(
    localFiles
      .filter((relativePath) => !remoteFiles.has(relativePath))
      .map(async (relativePath) => {
        const targetPath = path.join(ROOT_DIR, ...relativePath.split("/"));
        assertInsideRoot(targetPath);
        await rm(targetPath, { force: true });
      }),
  );
}

async function writeDownloadedProjectFiles(files) {
  for (const file of files) {
    const targetPath = path.join(ROOT_DIR, ...file.relativePath.split("/"));
    assertInsideRoot(targetPath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.buffer);
  }
}

async function installDependencies() {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const { stdout, stderr } = await execFile(command, ["install"], {
    cwd: ROOT_DIR,
    timeout: 180000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return { stdout: stdout.slice(-4000), stderr: stderr.slice(-4000) };
}

async function applyRepositoryUpdate(options = {}) {
  if (updateInProgress) throw new Error("update-in-progress");
  updateInProgress = true;
  try {
    const status = await getUpdateStatus(options);
    if (!status.remoteCommit && status.source !== "mirror") throw new Error("remote-version-not-found");
    if (!status.available) {
      return { ...status, updated: false, filesUpdated: 0, installRan: false, restartRequired: false };
    }
    if (status.source === "mirror") {
      return applyMirrorRepositoryUpdate(status);
    }

    try {
      return await applyGithubRepositoryUpdate(status);
    } catch (error) {
      const mirrorStatus = await getMirrorUpdateStatus();
      if (!mirrorStatus.available) throw error;
      return applyMirrorRepositoryUpdate({ ...mirrorStatus, githubError: compactError(error) });
    }
  } finally {
    updateInProgress = false;
  }
}

async function applyGithubRepositoryUpdate(status) {
  const remoteFiles = await fetchRemoteProjectFiles();
  const downloadedFiles = await downloadRemoteProjectFiles(remoteFiles);
  const remoteFileSet = new Set(downloadedFiles.map((file) => file.relativePath));
  await removeStaleProjectFiles(remoteFileSet);
  await writeDownloadedProjectFiles(downloadedFiles);
  const installResult = await installDependencies();
  await writeLocalAppVersion(status.remoteCommit);
  return {
    ...status,
    updated: true,
    filesUpdated: downloadedFiles.length,
    installRan: true,
    installLog: installResult.stderr || installResult.stdout,
    restartRequired: true,
    updatedAt: new Date().toISOString(),
  };
}

async function applyMirrorRepositoryUpdate(status) {
  const packageBuffer = await requestUrl(status.packageUrl, {
    json: false,
    headers: { Accept: "application/zip, application/octet-stream" },
    timeout: 60000,
  });
  const expectedSha = await readMirrorSha(status);
  if (expectedSha && sha256(packageBuffer) !== expectedSha) {
    throw new Error("mirror-sha-mismatch");
  }
  const downloadedFiles = await extractLibrePosZip(packageBuffer);
  const remoteFileSet = new Set(downloadedFiles.map((file) => file.relativePath));
  await removeStaleProjectFiles(remoteFileSet);
  await writeDownloadedProjectFiles(downloadedFiles);
  const installResult = await installDependencies();
  if (status.remoteCommit) await writeLocalAppVersion(status.remoteCommit);
  return {
    ...status,
    updated: true,
    filesUpdated: downloadedFiles.length,
    installRan: true,
    installLog: installResult.stderr || installResult.stdout,
    restartRequired: true,
    updatedAt: new Date().toISOString(),
  };
}

export function createSyncMiddleware() {
  return async function syncMiddleware(req, res, next) {
    const url = new URL(req.url || "/", "http://localhost");
    if (!url.pathname.startsWith("/api/")) {
      await setAccessCookie(res);
      next();
      return;
    }

    if (req.headers.origin && requestOriginAllowed(req)) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      if (await requireAccess(req, res)) {
        res.statusCode = 204;
        res.end();
      }
      return;
    }

    try {
      if (!(await requireAccess(req, res))) return;

      if (url.pathname === "/api/update/status" && req.method === "GET") {
        sendJson(res, 200, await getUpdateStatus({ source: url.searchParams.get("source") || "" }));
        return;
      }

      if (url.pathname === "/api/update/apply" && req.method === "POST") {
        if (updateInProgress) {
          sendJson(res, 409, { error: "update-in-progress" });
          return;
        }
        sendJson(res, 200, await applyRepositoryUpdate({ source: url.searchParams.get("source") || "" }));
        return;
      }

      if (url.pathname === "/api/login" && req.method === "POST") {
        await loadSharedState();
        if (!sharedState) {
          sendJson(res, 404, { error: "state-not-ready" });
          return;
        }
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        const username = String(payload.username || "").trim();
        const password = String(payload.password || "");
        const user = (sharedState?.users || []).find((item) => item.active !== false && item.username === username);
        if (!verifyPassword(user, password)) {
          sendJson(res, 401, { error: "invalid-login" });
          return;
        }
        if (user.password) {
          const normalized = normalizeStateForStorage(sharedState);
          sharedState = normalized.state;
          await writeStateFile();
        }
        sendJson(res, 200, { userId: user.id, version: sharedVersion, state: publicState(sharedState) });
        return;
      }

      if (url.pathname === "/api/state" && req.method === "GET") {
        await loadSharedState();
        sendJson(res, 200, { version: sharedVersion, state: publicState(sharedState) });
        return;
      }

      if (url.pathname === "/api/state" && req.method === "POST") {
        await loadSharedState();
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        const validationError = validateStatePayload(payload.state);
        if (validationError) {
          sendJson(res, 400, { error: validationError });
          return;
        }
        const baseVersion = Number(payload.baseVersion);
        if (!Number.isFinite(baseVersion)) {
          sendJson(res, 400, { error: "missing-base-version", version: sharedVersion, state: publicState(sharedState) });
          return;
        }
        if (baseVersion !== sharedVersion) {
          sendJson(res, 409, { error: "version-mismatch", version: sharedVersion, state: publicState(sharedState) });
          return;
        }
        const saved = await saveSharedState(payload.state, String(payload.clientId || ""));
        sendJson(res, 200, saved);
        return;
      }

      if (url.pathname === "/api/events" && req.method === "GET") {
        await loadSharedState();
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        res.write(`event: hello\ndata: ${JSON.stringify({ version: sharedVersion, state: publicState(sharedState) })}\n\n`);
        const heartbeat = setInterval(() => {
          try {
            res.write(`event: ping\ndata: ${Date.now()}\n\n`);
          } catch {
            clearInterval(heartbeat);
            clients.delete(res);
          }
        }, 20000);
        clients.add(res);
        req.on("close", () => {
          clearInterval(heartbeat);
          clients.delete(res);
        });
        return;
      }

      sendJson(res, 404, { error: "not-found" });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "sync-error" });
    }
  };
}
