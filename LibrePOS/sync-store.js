import { createHash, randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import https from "node:https";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { networkInterfaces, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT_DIR, ".librepos");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const TOKEN_FILE = path.join(DATA_DIR, "sync-token");
const VERSION_FILE = path.join(DATA_DIR, "app-version.json");
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
const PRESERVED_UPDATE_DIRS = new Set([".git", ".librepos", ".vite", "node_modules", "dist"]);
const PRESERVED_UPDATE_FILES = new Set([".DS_Store", ".env", ".env.local"]);
const IGNORED_LOCAL_UPDATE_DIRS = new Set(["__pycache__"]);
const IGNORED_LOCAL_UPDATE_EXTENSIONS = new Set([".pyc", ".pyo"]);
const RECEIPT_WIDTH = 32;
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
  const normalized = normalizeStateForStorage(state, sharedState);
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

function cleanUsername(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-MX");
}

function sameUsername(left, right) {
  return cleanUsername(left) === cleanUsername(right);
}

function normalizeStateForStorage(state, existingState = null) {
  if (!state || typeof state !== "object") return { state: null, changed: false };
  let changed = false;
  const next = structuredClone(state);
  const rawUsers = Array.isArray(next.users) ? next.users : [];
  const users = rawUsers.filter((user) => user.active !== false);
  if (users.length !== rawUsers.length) changed = true;
  const existingUsers = Array.isArray(existingState?.users) ? existingState.users : [];
  next.users = users.map((user) => {
    const normalized = { ...user };
    const existing = existingUsers.find((item) => item.id === normalized.id || sameUsername(item.username, normalized.username));
    const password = typeof normalized.password === "string" ? normalized.password.trim() : "";
    if (password) {
      Object.assign(normalized, hashPassword(password));
      delete normalized.password;
      changed = true;
    } else if (typeof normalized.password === "string") {
      delete normalized.password;
      changed = true;
    }
    if (!normalized.passwordHash && existing?.passwordHash && existing?.passwordSalt) {
      normalized.passwordHash = existing.passwordHash;
      normalized.passwordSalt = existing.passwordSalt;
      normalized.passwordIterations = existing.passwordIterations;
    }
    if (!normalized.passwordHash && sameUsername(normalized.username, "admin")) {
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
  const arrayKeys = [
    "users",
    "orders",
    "sales",
    "cancellations",
    "inventory",
    "ingredientCategories",
    "inventoryMovements",
    "expenses",
    "menuProducts",
    "extraCatalog",
    "attendance",
    "cashSessions",
  ];
  for (const key of arrayKeys) {
    if (!Array.isArray(state[key])) return `invalid-${key}`;
  }
  if (!state.settings || typeof state.settings !== "object" || Array.isArray(state.settings)) return "invalid-settings";
  return "";
}

function lanAccessUrls(req) {
  const host = String(req.headers.host || "localhost:5173");
  const port = host.includes(":") ? host.split(":").pop() : "5173";
  const urls = [`http://localhost:${port}/`];
  Object.values(networkInterfaces()).forEach((entries = []) => {
    entries.forEach((entry) => {
      if (entry.family !== "IPv4" || entry.internal || !entry.address) return;
      const url = `http://${entry.address}:${port}/`;
      if (!urls.includes(url)) urls.push(url);
    });
  });
  const preferredUrl = urls.find((url) => !url.includes("localhost")) || urls[0];
  return { preferredUrl, urls };
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

function githubRawUrl(githubPath, ref = UPDATE_BRANCH) {
  const encodedRef = String(ref || UPDATE_BRANCH).split("/").map(encodeURIComponent).join("/");
  const encodedPath = githubPath.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/${encodedRef}/${encodedPath}`;
}

function requestUrl(url, { json = true, headers = {}, timeout = 25000 } = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    const target = url instanceof URL ? url : new URL(url);
    const req = https.request(
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

async function readLocalPackageVersion() {
  try {
    const data = JSON.parse(await readFile(path.join(ROOT_DIR, "package.json"), "utf8"));
    return typeof data.version === "string" ? data.version.trim() : "";
  } catch {
    return "";
  }
}

async function fetchRemotePackageVersion(ref = UPDATE_BRANCH) {
  try {
    const buffer = await requestGithub(githubRawUrl(`${UPDATE_PROJECT_PREFIX}package.json`, ref), {
      json: false,
      headers: { Accept: "application/octet-stream" },
    });
    const data = JSON.parse(buffer.toString("utf8"));
    return typeof data.version === "string" ? data.version.trim() : "";
  } catch {
    return "";
  }
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

export async function getUpdateStatus() {
  const [storedLocal, remote] = await Promise.all([readLocalAppVersion(), fetchLatestRemoteVersion()]);
  let local = storedLocal;
  let localIncludesRemote = false;
  let localPackageVersion = "";
  let remotePackageVersion = "";
  if (remote?.commitSha && storedLocal.source === "git" && !sameCommit(storedLocal.commitSha, remote.commitSha)) {
    localIncludesRemote = await gitCommitIncludes(remote.commitSha, storedLocal.commitSha);
  }
  if (remote?.commitSha && !localIncludesRemote && !sameCommit(storedLocal.commitSha, remote.commitSha)) {
    try {
      const remoteFiles = await fetchRemoteProjectFiles(remote.commitSha);
      local = (await readLocalVersionFromFiles(remoteFiles, remote.commitSha)) || storedLocal;
    } catch {
      local = storedLocal;
    }
    if (!sameCommit(local.commitSha, remote.commitSha)) {
      [localPackageVersion, remotePackageVersion] = await Promise.all([readLocalPackageVersion(), fetchRemotePackageVersion(remote.commitSha)]);
      if (localPackageVersion && remotePackageVersion && localPackageVersion === remotePackageVersion) {
        local = { commitSha: remote.commitSha, source: "package-version", updatedAt: "", packageVersion: localPackageVersion };
      }
    }
    if (sameCommit(local.commitSha, remote.commitSha) && local.source !== "version-file") {
      try {
        await writeLocalAppVersion(remote.commitSha);
      } catch (error) {
        updateLog("No se pudo escribir marcador local de version", { error: compactError(error) });
      }
    }
  }
  const available = Boolean(remote?.commitSha && !localIncludesRemote && (!local.commitSha || !sameCommit(local.commitSha, remote.commitSha)));
  return {
    available,
    repoUrl: UPDATE_REPO_URL,
    branch: UPDATE_BRANCH,
    projectPath: UPDATE_PROJECT_PREFIX.replace(/\/$/, ""),
    localCommit: local.commitSha,
    localSource: local.source,
    localIncludesRemote,
    localUpdatedAt: local.updatedAt,
    localPackageVersion: localPackageVersion || local.packageVersion || "",
    remotePackageVersion,
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
  const details = [
    error?.message,
    error?.stderr,
    error?.stdout,
    error?.code ? `code:${error.code}` : "",
  ].filter(Boolean).join(" ");
  return String(details || error || "unknown").replace(/\s+/g, " ").slice(0, 700);
}

function stripAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function serverUserIsAdmin(user) {
  if (!user || user.active === false) return false;
  const functions = Array.isArray(user.functions) ? user.functions.map((item) => String(item).toLowerCase()) : [];
  const role = stripAccents(user.role).toLowerCase();
  return functions.includes("admin") || role.includes("admin");
}

async function requireAdminUser(res, userId) {
  await loadSharedState();
  const user = (sharedState?.users || []).find((item) => item.id === userId);
  if (!serverUserIsAdmin(user)) {
    sendJson(res, 403, { error: "admin-required" });
    return false;
  }
  return true;
}

function printerLines(stdout) {
  return String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const TICKET_PRINTER_TERMS = [
  "ticket",
  "receipt",
  "thermal",
  "termica",
  "termico",
  "pos",
  "epson",
  "star",
  "bixolon",
  "xprinter",
  "x-printer",
  "citizen",
  "zebra",
  "tm-t",
  "tmt",
  "80mm",
  "58mm",
];

function compactPrinterText(value) {
  return stripAccents(value).toLowerCase();
}

function ticketPrinterScore(printer) {
  const haystack = compactPrinterText([
    printer.name,
    printer.driverName,
    printer.portName,
    printer.deviceUri,
  ].filter(Boolean).join(" "));
  return TICKET_PRINTER_TERMS.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function decoratePrinter(printer) {
  const score = ticketPrinterScore(printer);
  return {
    name: String(printer.name || "").trim(),
    isDefault: Boolean(printer.isDefault),
    isTicketLikely: score > 0,
    source: printer.source || "system",
    driverName: printer.driverName || "",
    portName: printer.portName || "",
    deviceUri: printer.deviceUri || "",
    printerStatus: printer.printerStatus || "",
    workOffline: Boolean(printer.workOffline),
  };
}

function sortPrinters(printers) {
  return printers
    .map(decoratePrinter)
    .filter((printer) => printer.name)
    .sort((left, right) => {
      if (left.isTicketLikely !== right.isTicketLikely) return left.isTicketLikely ? -1 : 1;
      if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
      return left.name.localeCompare(right.name, "es");
    });
}

function defaultPrinterFromLpstat(stdout) {
  const text = String(stdout || "").trim();
  return text.match(/:\s*(.+)$/)?.[1]?.trim() || "";
}

function cupsPrinterDevices(stdout) {
  const devices = new Map();
  printerLines(stdout).forEach((line) => {
    const match = line.match(/^(?:device|dispositivo)\s+(?:for|para)\s+(.+?):\s*(.+)$/i);
    if (match) devices.set(match[1].trim(), match[2].trim());
  });
  return devices;
}

async function listCupsPrinters() {
  const [printerResult, defaultResult, deviceResult] = await Promise.allSettled([
    execFile("lpstat", ["-e"], { timeout: 5000, maxBuffer: 128 * 1024 }),
    execFile("lpstat", ["-d"], { timeout: 5000, maxBuffer: 128 * 1024 }),
    execFile("lpstat", ["-v"], { timeout: 5000, maxBuffer: 256 * 1024 }),
  ]);
  if (printerResult.status === "rejected") throw printerResult.reason;
  const defaultName = defaultResult.status === "fulfilled" ? defaultPrinterFromLpstat(defaultResult.value.stdout) : "";
  const devices = deviceResult.status === "fulfilled" ? cupsPrinterDevices(deviceResult.value.stdout) : new Map();
  return sortPrinters(printerLines(printerResult.value.stdout).map((name) => ({
    name,
    isDefault: Boolean(defaultName && name === defaultName),
    deviceUri: devices.get(name) || "",
    source: "cups",
  })));
}

function powerShellCandidates() {
  if (process.platform !== "win32") return ["pwsh", "pwsh.exe", "powershell", "powershell.exe"];
  const windowsDir = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
  return [
    path.join(windowsDir, "Sysnative", "WindowsPowerShell", "v1.0", "powershell.exe"),
    path.join(windowsDir, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    "powershell.exe",
    "powershell",
    "pwsh.exe",
    "pwsh",
  ].filter((command, index, list) => command && list.indexOf(command) === index);
}

async function runPowerShell(script, args = [], options = {}) {
  const scriptPath = path.join(tmpdir(), `librepos-powershell-${Date.now()}-${randomBytes(4).toString("hex")}.ps1`);
  await writeFile(scriptPath, script, "utf8");
  const attempts = [];
  try {
    for (const command of powerShellCandidates()) {
      const commandArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args];
      if (process.platform !== "win32" && command.startsWith("pwsh")) {
        commandArgs.splice(1, 2);
      }
      try {
        return await execFile(command, commandArgs, {
          timeout: options.timeout ?? 10000,
          maxBuffer: options.maxBuffer ?? 512 * 1024,
          windowsHide: true,
        });
      } catch (error) {
        attempts.push(`${command}: ${compactError(error)}`);
        if (error?.code !== "ENOENT") {
          const wrapped = new Error(`powershell-failed ${attempts.join(" | ")}`);
          wrapped.stderr = error.stderr;
          wrapped.stdout = error.stdout;
          wrapped.code = error.code;
          throw wrapped;
        }
      }
    }
    throw new Error(`powershell-not-found ${attempts.join(" | ")}`);
  } finally {
    try {
      await rm(scriptPath, { force: true });
    } catch {
      // Best effort cleanup.
    }
  }
}

async function listWindowsPrinters() {
  const { stdout } = await runPowerShell("Get-CimInstance Win32_Printer | Select-Object Name,Default,DriverName,PortName,PrinterStatus,WorkOffline | ConvertTo-Json -Compress");
  if (!stdout.trim()) return [];
  const parsed = JSON.parse(stdout);
  return sortPrinters((Array.isArray(parsed) ? parsed : [parsed]).map((printer) => ({
    name: String(printer.Name || "").trim(),
    isDefault: Boolean(printer.Default),
    driverName: String(printer.DriverName || "").trim(),
    portName: String(printer.PortName || "").trim(),
    printerStatus: String(printer.PrinterStatus || "").trim(),
    workOffline: Boolean(printer.WorkOffline),
    source: "windows",
  })));
}

export async function listSystemPrinters() {
  try {
    const printers = process.platform === "win32" ? await listWindowsPrinters() : await listCupsPrinters();
    return { printers, platform: process.platform };
  } catch (error) {
    return { printers: [], platform: process.platform, error: compactError(error) };
  }
}

function testTicketText(printerName) {
  return [
    "LibrePOS",
    "------------------------",
    "test",
    "------------------------",
    `Impresora: ${printerName}`,
    new Date().toLocaleString("es-MX"),
    "",
    "",
  ].join("\n");
}

function legacyTicketText() {
  return "PRUEBA IMPRESORA BT\nHola desde PowerShell\n\n\n";
}

const FAKE_RECEIPT_PRODUCTS = [
  { name: "Bocoles maiz", price: 165, extras: [{ name: "Extra queso", price: 20 }, { name: "Salsa verde", price: 10 }] },
  { name: "Enchiladas rojas", price: 180, extras: [{ name: "Cecina", price: 45 }, { name: "Aguacate", price: 25 }] },
  { name: "Tamales hoja platano", price: 45, extras: [{ name: "Crema", price: 12 }] },
  { name: "Zacahuil", price: 95, extras: [{ name: "Salsa extra", price: 10 }] },
  { name: "Molotes platano", price: 120, extras: [{ name: "Queso extra", price: 20 }] },
  { name: "Cafe de olla", price: 35, extras: [] },
  { name: "Agua mineral", price: 45, extras: [{ name: "Limon", price: 8 }] },
  { name: "Hojuelas", price: 65, extras: [{ name: "Miel extra", price: 15 }] },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sampleItems(items, count) {
  const pool = [...items];
  const selected = [];
  while (selected.length < count && pool.length) {
    selected.push(pool.splice(randomInt(0, pool.length - 1), 1)[0]);
  }
  return selected;
}

function receiptMoney(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("es-MX")}`;
}

function receiptSanitize(value) {
  return stripAccents(value)
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function receiptCenter(value, width = RECEIPT_WIDTH) {
  const text = receiptSanitize(value).slice(0, width);
  const left = Math.max(0, Math.floor((width - text.length) / 2));
  return `${" ".repeat(left)}${text}`;
}

function receiptRule(char = "-") {
  return char.repeat(RECEIPT_WIDTH);
}

function receiptColumns(left, right, width = RECEIPT_WIDTH) {
  const cleanRight = receiptSanitize(right);
  const maxLeft = Math.max(1, width - cleanRight.length - 1);
  const cleanLeft = receiptSanitize(left).slice(0, maxLeft);
  const spaces = Math.max(1, width - cleanLeft.length - cleanRight.length);
  return `${cleanLeft}${" ".repeat(spaces)}${cleanRight}`;
}

function localReceiptDate(date = new Date()) {
  return [
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  ].join(" ");
}

function fakeReceiptText() {
  const now = new Date();
  const table = randomInt(1, 13);
  const folio = `PRB-${randomInt(1000, 9999)}`;
  const selected = sampleItems(FAKE_RECEIPT_PRODUCTS, randomInt(3, 5));
  const lines = [];
  let subtotal = 0;
  selected.forEach((product) => {
    const qty = randomInt(1, product.price > 100 ? 2 : 3);
    const lineTotal = qty * product.price;
    subtotal += lineTotal;
    lines.push(receiptColumns(`${qty} ${product.name}`, receiptMoney(lineTotal)));
    if (product.extras.length && Math.random() > 0.45) {
      const extra = product.extras[randomInt(0, product.extras.length - 1)];
      subtotal += extra.price;
      lines.push(receiptColumns(`  + ${extra.name}`, receiptMoney(extra.price)));
    }
  });
  const tipRate = [10, 12, 15][randomInt(0, 2)];
  const tip = Math.round(subtotal * tipRate / 100);
  const total = subtotal + tip;
  const card = Math.random() > 0.5;
  const paid = card ? total : Math.ceil(total / 50) * 50;
  const change = Math.max(0, paid - total);
  return [
    receiptCenter("LOS TATAS"),
    receiptCenter("LibrePOS"),
    receiptCenter("CUENTA DE PRUEBA"),
    receiptRule(),
    receiptColumns("Folio", folio),
    localReceiptDate(now),
    receiptColumns(`Mesa ${table}`, "Mesero Ivanna"),
    receiptRule(),
    ...lines,
    receiptRule(),
    receiptColumns("Subtotal", receiptMoney(subtotal)),
    receiptColumns(`Propina ${tipRate}%`, receiptMoney(tip)),
    receiptColumns("TOTAL", receiptMoney(total)),
    receiptColumns(card ? "Pago tarjeta" : "Pago efectivo", receiptMoney(paid)),
    card ? null : receiptColumns("Cambio", receiptMoney(change)),
    receiptRule(),
    receiptCenter("Gracias por su visita"),
    receiptCenter("Ticket 58mm"),
    "",
    "",
    "",
  ].filter((line) => line !== null).join("\n");
}

function receiptHeaderText() {
  return [
    receiptCenter("LOS TATAS"),
    receiptCenter("LibrePOS"),
    receiptCenter("CUENTA DE PRUEBA"),
    "",
    "",
  ].join("\n");
}

function windowsTicketPayload(printerName) {
  const text = testTicketText(printerName).replace(/\n/g, "\r\n");
  return Buffer.concat([
    Buffer.from([0x1b, 0x40]),
    Buffer.from(text, "ascii"),
    Buffer.from("\r\n\r\n\r\n", "ascii"),
    Buffer.from([0x1d, 0x56, 0x42, 0x00]),
  ]);
}

async function printWithCups(printerName, filePath) {
  await execFile("lp", ["-d", printerName, "-t", "LibrePOS test", filePath], {
    timeout: 20000,
    maxBuffer: 128 * 1024,
  });
  return { method: "cups-lp" };
}

async function printWithWindowsRaw(printerName, payload) {
  const script = String.raw`
$ErrorActionPreference = "Stop"
$printerName = $args[0]
$payload = [Convert]::FromBase64String($args[1])
$printer = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $printerName } | Select-Object -First 1
if (-not $printer) { throw "printer-not-found:$printerName" }
if ($printer.WorkOffline) { throw "printer-offline:$printerName" }
Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public class LibrePosRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);

  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static void Send(string printerName, byte[] bytes) {
    IntPtr hPrinter = IntPtr.Zero;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) Fail("OpenPrinter");
    try {
      DOCINFOA docInfo = new DOCINFOA();
      docInfo.pDocName = "LibrePOS test";
      docInfo.pDataType = "RAW";
      if (!StartDocPrinter(hPrinter, 1, docInfo)) Fail("StartDocPrinter");
      bool pageStarted = false;
      try {
        if (!StartPagePrinter(hPrinter)) Fail("StartPagePrinter");
        pageStarted = true;
        IntPtr unmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, unmanagedBytes, bytes.Length);
          int written = 0;
          if (!WritePrinter(hPrinter, unmanagedBytes, bytes.Length, out written)) Fail("WritePrinter");
          if (written != bytes.Length) throw new Exception("WritePrinter wrote " + written + " of " + bytes.Length + " bytes");
        } finally {
          Marshal.FreeCoTaskMem(unmanagedBytes);
        }
      } finally {
        if (pageStarted) EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
  }

  private static void Fail(string operation) {
    int error = Marshal.GetLastWin32Error();
    throw new Win32Exception(error, operation + " failed: " + new Win32Exception(error).Message);
  }
}
"@
[LibrePosRawPrinter]::Send($printerName, $payload)
Write-Output ("printed:" + $printerName + ":" + $printer.PortName)
`;
  await runPowerShell(script, [printerName, payload.toString("base64")], { timeout: 25000, maxBuffer: 1024 * 1024 });
  return { method: "windows-raw-spooler" };
}

async function printWithWindowsTextFallback(printerName, payload) {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$printer = $args[0]",
    "$text = [Text.Encoding]::ASCII.GetString([Convert]::FromBase64String($args[1]))",
    "$text | Out-Printer -Name $printer",
  ].join("; ");
  await runPowerShell(script, [printerName, payload.toString("base64")], { timeout: 25000, maxBuffer: 1024 * 1024 });
  return { method: "windows-out-printer" };
}

async function printWithWindows(printerName) {
  const payload = windowsTicketPayload(printerName);
  try {
    return await printWithWindowsRaw(printerName, payload);
  } catch (rawError) {
    try {
      return await printWithWindowsTextFallback(printerName, payload);
    } catch (fallbackError) {
      throw new Error(`windows-print-failed raw=${compactError(rawError)} fallback=${compactError(fallbackError)}`);
    }
  }
}

async function printTextWithWindowsLegacy(printerName, text, method = "windows-out-printer-legacy") {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$printer = $args[0]",
    "$text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($args[1]))",
    "$text | Out-Printer -Name $printer",
    `Write-Output ("${method}:" + $printer)`,
  ].join("\n");
  await runPowerShell(script, [printerName, Buffer.from(text, "utf8").toString("base64")], { timeout: 25000, maxBuffer: 1024 * 1024 });
  return { method };
}

async function printWithWindowsLegacy(printerName) {
  return printTextWithWindowsLegacy(printerName, legacyTicketText(), "windows-out-printer-legacy");
}

async function printReceiptWithWindowsDocument(printerName, text) {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "Add-Type -AssemblyName System.Drawing",
    "$printer = $args[0]",
    "$text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($args[1]))",
    "$lines = $text -replace \"`r`n\", \"`n\" -replace \"`r\", \"`n\" -split \"`n\"",
    "$doc = New-Object System.Drawing.Printing.PrintDocument",
    "$doc.PrinterSettings.PrinterName = $printer",
    "if (-not $doc.PrinterSettings.IsValid) { throw \"printer-not-valid:$printer\" }",
    "$doc.DocumentName = 'LibrePOS cuenta 58mm'",
    "$paperWidth = 228",
    "$paperHeight = [Math]::Max(550, ($lines.Count + 8) * 14)",
    "$doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('LibrePOS 58mm', $paperWidth, $paperHeight)",
    "$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(2, 2, 2, 2)",
    "$font = New-Object System.Drawing.Font('Courier New', 7.0, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)",
    "$brush = [System.Drawing.Brushes]::Black",
    "$script:lineIndex = 0",
    "$doc.add_PrintPage({",
    "  param($sender, $event)",
    "  $x = 2",
    "  $y = 2",
    "  $lineHeight = [Math]::Ceiling($font.GetHeight($event.Graphics)) + 1",
    "  $bottom = $event.PageBounds.Height - 4",
    "  while ($script:lineIndex -lt $lines.Count) {",
    "    $line = [string]$lines[$script:lineIndex]",
    "    $event.Graphics.DrawString($line, $font, $brush, $x, $y)",
    "    $y += $lineHeight",
    "    $script:lineIndex += 1",
    "    if ($y + $lineHeight -gt $bottom -and $script:lineIndex -lt $lines.Count) {",
    "      $event.HasMorePages = $true",
    "      return",
    "    }",
    "  }",
    "  $event.HasMorePages = $false",
    "})",
    "try { $doc.Print(); Write-Output ('windows-printdocument-58mm:' + $printer) } finally { $font.Dispose(); $doc.Dispose() }",
  ].join("\n");
  await runPowerShell(script, [printerName, Buffer.from(text, "utf8").toString("base64")], { timeout: 30000, maxBuffer: 1024 * 1024 });
  return { method: "windows-printdocument-58mm" };
}

async function removeWindowsPrinter(printerName) {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$printerName = $args[0]",
    "$printer = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $printerName } | Select-Object -First 1",
    "if (-not $printer) { throw \"printer-not-found:$printerName\" }",
    "try { Remove-Printer -Name $printerName -ErrorAction Stop } catch { $result = $printer.Delete(); if ($result.ReturnValue -ne 0) { throw \"printer-delete-failed:$($result.ReturnValue) $($_.Exception.Message)\" } }",
  ].join("; ");
  await runPowerShell(script, [printerName], { timeout: 20000, maxBuffer: 512 * 1024 });
}

async function removeCupsPrinter(printerName) {
  await execFile("lpadmin", ["-x", printerName], {
    timeout: 20000,
    maxBuffer: 128 * 1024,
  });
}

export async function removeSystemPrinter(printerName) {
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  if (process.platform === "win32") {
    await removeWindowsPrinter(cleanName);
  } else {
    await removeCupsPrinter(cleanName);
  }
  return { ok: true, printerName: cleanName, removedAt: new Date().toISOString() };
}

export async function printLegacyTestTicket(printerName) {
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  let result = null;
  if (process.platform === "win32") {
    result = await printWithWindowsLegacy(cleanName);
  } else {
    const filePath = path.join(tmpdir(), `librepos-legacy-${Date.now()}-${randomBytes(4).toString("hex")}.txt`);
    await writeFile(filePath, legacyTicketText(), "utf8");
    try {
      result = await printWithCups(cleanName, filePath);
    } finally {
      await rm(filePath, { force: true });
    }
  }
  return { ok: true, printerName: cleanName, method: result?.method || "", printedAt: new Date().toISOString() };
}

function cleanReceiptPayload(value) {
  const text = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return text.slice(0, 6000);
}

export function previewFakeReceiptTicket() {
  return { ticketText: fakeReceiptText(), width: RECEIPT_WIDTH, createdAt: new Date().toISOString() };
}

export async function printFakeReceiptTicket(printerName, ticketText = "") {
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  const text = cleanReceiptPayload(ticketText) || fakeReceiptText();
  let result = null;
  if (process.platform === "win32") {
    result = await printReceiptWithWindowsDocument(cleanName, `${text}\n\n\n`);
  } else {
    const filePath = path.join(tmpdir(), `librepos-fake-receipt-${Date.now()}-${randomBytes(4).toString("hex")}.txt`);
    await writeFile(filePath, `${text}\n\n\n`, "utf8");
    try {
      result = await printWithCups(cleanName, filePath);
    } finally {
      await rm(filePath, { force: true });
    }
  }
  return { ok: true, printerName: cleanName, method: result?.method || "", printedAt: new Date().toISOString(), ticketText: text };
}

export async function printReceiptHeaderTicket(printerName) {
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  const text = receiptHeaderText();
  let result = null;
  if (process.platform === "win32") {
    result = await printReceiptWithWindowsDocument(cleanName, `${text}\n\n\n`);
  } else {
    const filePath = path.join(tmpdir(), `librepos-receipt-header-${Date.now()}-${randomBytes(4).toString("hex")}.txt`);
    await writeFile(filePath, `${text}\n\n\n`, "utf8");
    try {
      result = await printWithCups(cleanName, filePath);
    } finally {
      await rm(filePath, { force: true });
    }
  }
  return { ok: true, printerName: cleanName, method: result?.method || "", printedAt: new Date().toISOString(), ticketText: text };
}

export async function printTestTicket(printerName) {
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  let result = null;
  if (process.platform === "win32") {
    result = await printWithWindows(cleanName);
  } else {
    const filePath = path.join(tmpdir(), `librepos-test-${Date.now()}-${randomBytes(4).toString("hex")}.txt`);
    await writeFile(filePath, testTicketText(cleanName), "utf8");
    try {
      result = await printWithCups(cleanName, filePath);
    } finally {
      await rm(filePath, { force: true });
    }
  }
  return { ok: true, printerName: cleanName, method: result?.method || "", printedAt: new Date().toISOString() };
}

function updateLog(message, details = null) {
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[LibrePOS update ${new Date().toISOString()}] ${message}${suffix}`);
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

function shouldIgnoreLocalProjectPath(relativePath) {
  const parts = relativePath.split("/");
  if (parts.some((part) => IGNORED_LOCAL_UPDATE_DIRS.has(part))) return true;
  return IGNORED_LOCAL_UPDATE_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

async function fetchRemoteProjectFiles(ref = UPDATE_BRANCH) {
  const commit = await requestGithub(githubApiUrl(`/commits/${encodeURIComponent(ref)}`));
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

async function downloadRemoteProjectFiles(files, ref = UPDATE_BRANCH) {
  const downloaded = [];
  for (const file of files) {
    const buffer = await requestGithub(githubRawUrl(file.githubPath, ref), {
      json: false,
      headers: { Accept: "application/octet-stream" },
    });
    if (file.sha && gitBlobSha(buffer) !== file.sha) {
      throw new Error(`download-sha-mismatch:${file.relativePath}`);
    }
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
    if (shouldIgnoreLocalProjectPath(relativePath)) continue;
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
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm install"] : ["install"];
  updateLog("Ejecutando npm install");
  const { stdout, stderr } = await execFile(command, args, {
    cwd: ROOT_DIR,
    timeout: 180000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return { stdout: stdout.slice(-4000), stderr: stderr.slice(-4000) };
}

export async function applyRepositoryUpdate() {
  if (updateInProgress) throw new Error("update-in-progress");
  updateInProgress = true;
  try {
    updateLog("Buscando actualizacion en GitHub", { repo: `${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}`, branch: UPDATE_BRANCH });
    const status = await getUpdateStatus();
    if (!status.remoteCommit) throw new Error("remote-version-not-found");
    if (!status.available) {
      updateLog("LibrePOS ya esta actualizado", {
        localCommit: status.localCommit,
        remoteCommit: status.remoteCommit,
      });
      return { ...status, updated: false, filesUpdated: 0, installRan: false, restartRequired: false };
    }

    return await applyGithubRepositoryUpdate(status);
  } catch (error) {
    updateLog("Error al actualizar LibrePOS", { error: compactError(error) });
    throw error;
  } finally {
    updateInProgress = false;
  }
}

async function applyGithubRepositoryUpdate(status) {
  updateLog("Actualizacion iniciada", {
    localCommit: status.localCommit,
    remoteCommit: status.remoteCommit,
    remoteUrl: status.remoteUrl,
  });
  const remoteFiles = await fetchRemoteProjectFiles(status.remoteCommit);
  updateLog("Lista de archivos recibida desde GitHub", { files: remoteFiles.length });
  const downloadedFiles = await downloadRemoteProjectFiles(remoteFiles, status.remoteCommit);
  updateLog("Archivos descargados desde GitHub", { files: downloadedFiles.length });
  const remoteFileSet = new Set(downloadedFiles.map((file) => file.relativePath));
  await removeStaleProjectFiles(remoteFileSet);
  updateLog("Archivos obsoletos removidos");
  await writeDownloadedProjectFiles(downloadedFiles);
  updateLog("Archivos nuevos escritos");
  await writeLocalAppVersion(status.remoteCommit);
  let installResult = { stdout: "", stderr: "" };
  let installError = "";
  try {
    installResult = await installDependencies();
  } catch (error) {
    installError = compactError(error);
    updateLog("npm install fallo despues de escribir archivos", { error: installError });
  }
  updateLog("Actualizacion completada. Cierra y abre LibrePOS para cargar la nueva version.", {
    remoteCommit: status.remoteCommit,
  });
  return {
    ...status,
    updated: true,
    filesUpdated: downloadedFiles.length,
    installRan: true,
    installError,
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

      if (url.pathname === "/api/access-info" && req.method === "GET") {
        sendJson(res, 200, lanAccessUrls(req));
        return;
      }

      if (url.pathname === "/api/printers" && req.method === "GET") {
        if (!(await requireAdminUser(res, url.searchParams.get("userId")))) return;
        sendJson(res, 200, await listSystemPrinters());
        return;
      }

      if (url.pathname === "/api/printers/test" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requireAdminUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printTestTicket(payload.printerName));
        } catch (error) {
          sendJson(res, 500, { error: "printer-print-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/printers/test-legacy" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requireAdminUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printLegacyTestTicket(payload.printerName));
        } catch (error) {
          sendJson(res, 500, { error: "printer-legacy-print-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/printers/fake-receipt" && req.method === "GET") {
        if (!(await requireAdminUser(res, url.searchParams.get("userId")))) return;
        sendJson(res, 200, previewFakeReceiptTicket());
        return;
      }

      if (url.pathname === "/api/printers/fake-receipt/print" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requireAdminUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printFakeReceiptTicket(payload.printerName, payload.ticketText));
        } catch (error) {
          sendJson(res, 500, { error: "printer-fake-receipt-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/printers/receipt-header/print" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requireAdminUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printReceiptHeaderTicket(payload.printerName));
        } catch (error) {
          sendJson(res, 500, { error: "printer-header-print-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/printers/remove" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requireAdminUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await removeSystemPrinter(payload.printerName));
        } catch (error) {
          sendJson(res, 500, { error: "printer-remove-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/update/status" && req.method === "GET") {
        sendJson(res, 200, await getUpdateStatus());
        return;
      }

      if (url.pathname === "/api/update/apply" && req.method === "POST") {
        if (updateInProgress) {
          sendJson(res, 409, { error: "update-in-progress" });
          return;
        }
        sendJson(res, 200, await applyRepositoryUpdate());
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
        const username = cleanUsername(payload.username);
        const password = String(payload.password || "");
        const user = (sharedState?.users || []).find((item) => item.active !== false && sameUsername(item.username, username));
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
