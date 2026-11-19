import { getUpdateStatus, applyRepositoryUpdate, deviceId } from "./scripts/release-channel.js";
export { getUpdateStatus, applyRepositoryUpdate, compareAppVersions } from "./scripts/release-channel.js";
import { protectedStateChangeError } from "./payment-permission-guard.js";
import { UberService, atomicJson } from "./integrations/uber-service.js";
import { uberStateChangeError, uberActionAllowed } from "./integrations/uber-guard.js";
import { demoUberOrder } from "./integrations/uber-demo.js";
import { isPermissionsAdmin, userFunctions } from "./src/user-permissions.js";
import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { lanAccessUrls } from "./lan-access.js";
import { isPrivateRequest } from "./private-paths.js";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  migrateTicketItemPriceModeSettings,
  normalizeTicketItemPriceMode,
} from "./src/ticket-settings.js";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
// A separate directory lets local previews use demo data without touching the restaurant.
const DATA_DIR = process.env.LIBREPOS_DATA_DIR
  ? path.resolve(process.env.LIBREPOS_DATA_DIR)
  : path.join(ROOT_DIR, ".librepos");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const TOKEN_FILE = path.join(DATA_DIR, "sync-token");
const BODY_LIMIT = 8 * 1024 * 1024;
const ACCESS_COOKIE = "librepos_sync";
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = "sha256";
const RECEIPT_WIDTH = 32;
const RESTAURANT_ADDRESS = "C. 5 de Mayo 134, Centro Histórico, La Cruz, 76020 Santiago de Querétaro, Qro.";
const BRAND_IMAGE_FILE = path.join(ROOT_DIR, "assets", "brand.jpg");
const DEFAULT_TICKET_MARGIN_MM = 4;
const DEFAULT_TICKET_LOGO_WIDTH_MM = 24;
const DEFAULT_TICKET_LOGO_POSITION = "below-title";
const DEFAULT_IVA_RATE = 0.16;
const RECEIPT_LOGO_MARKER = "__LIBREPOS_LOGO__";
const RECEIPT_BRAND_TITLE = "-- LOS TATAS --";
let sharedState = null;
let sharedVersion = 0;
let accessToken = "";
const clients = new Map();
const loginSessions = new Map();
const loginFailures = new Map();
let stateWriteQueue = Promise.resolve();
const LOGIN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 60 * 1000;
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
  await atomicJson(STATE_FILE, { version: sharedVersion, state: sharedState });
}

async function saveSharedState(state, clientId = "") {
  await mkdir(DATA_DIR, { recursive: true });
  const normalized = normalizeStateForStorage(state, sharedState);
  const version = Math.max(Date.now(), sharedVersion + 1);
  await atomicJson(STATE_FILE, { version, state: normalized.state });
  sharedState = normalized.state;
  sharedVersion = version;
  broadcast({ type: "state", version: sharedVersion, state: publicState(sharedState), clientId });
  return { version: sharedVersion, state: publicState(sharedState) };
}

function mutateIntegrationState(work) {
  const pending = stateWriteQueue.then(async () => {
    await loadSharedState();
    if (!sharedState) throw new Error('Inicia LibrePOS y configura sus datos antes de recibir pedidos.');
    const draft = structuredClone(sharedState);
    await work(draft);
    if (JSON.stringify(draft) !== JSON.stringify(sharedState)) await saveSharedState(draft, 'uber-server');
  });
  stateWriteQueue = pending.catch(() => {});
  return pending;
}

const uberService = new UberService({
  dataDir: DATA_DIR,
  getState: async () => { await loadSharedState(); return structuredClone(sharedState); },
  mutateState: mutateIntegrationState,
  demo: process.env.VITE_LIBREPOS_DEMO === 'true',
  productionAllowed: process.env.UBER_ALLOW_PRODUCTION === 'true',
  print: (printer, text, settings) => printSaleReceiptTicket(printer, text, {
    marginMm: settings.ticketMarginMm, marginLeftMm: settings.ticketMarginLeftMm, marginRightMm: settings.ticketMarginRightMm,
  }),
});

async function readUberRawBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error('Webhook demasiado grande.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function broadcast(payload) {
  const data = `event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach(({ sessionToken, stopStream }, client) => {
    // A stream opened with a session that has since ended must not receive more data.
    if (!sessionUser(sessionToken)) {
      stopStream();
      client.end();
      return;
    }
    try {
      client.write(data);
    } catch {
      stopStream();
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
  const migratedTicketSettings = migrateTicketItemPriceModeSettings(next.settings);
  next.settings = migratedTicketSettings.settings;
  if (migratedTicketSettings.changed) changed = true;
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

function sessionUser(token) {
  const session = loginSessions.get(token);
  if (!session) return null;
  const user = sharedState?.users.find(item => item.id === session.userId && item.active !== false);
  if (session.expiresAt <= Date.now() || !user || user.passwordHash !== session.passwordHash) {
    loginSessions.delete(token);
    return null;
  }
  // Activity keeps the session alive, so a kitchen screen is not logged out in the middle of service.
  session.expiresAt = Date.now() + LOGIN_LIFETIME_MS;
  return user;
}

function loggedInUser(req) {
  return sessionUser(req.headers["x-librepos-session"]);
}

function loginAttemptKey(req, username) {
  return `${req.socket?.remoteAddress || ""}|${username}`;
}

function loginLocked(key) {
  const entry = loginFailures.get(key);
  return Boolean(entry && entry.count >= LOGIN_MAX_FAILURES && Date.now() < entry.lockedUntil);
}

function recordLoginFailure(key) {
  const now = Date.now();
  for (const [other, entry] of loginFailures) if (entry.lockedUntil <= now) loginFailures.delete(other);
  const entry = loginFailures.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  entry.lockedUntil = now + LOGIN_LOCK_MS;
  loginFailures.set(key, entry);
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

function serverUserHasFunction(user, functionId) {
  if (serverUserIsAdmin(user)) return true;
  if (!user || user.active === false) return false;
  const functions = Array.isArray(user.functions) ? user.functions.map((item) => String(item).toLowerCase()) : [];
  const role = stripAccents(user.role).toLowerCase();
  const target = String(functionId || "").toLowerCase();
  return functions.includes(target) || role.includes(target);
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

async function requireCashUser(res, userId) {
  await loadSharedState();
  const user = (sharedState?.users || []).find((item) => item.id === userId);
  if (!serverUserHasFunction(user, "caja")) {
    sendJson(res, 403, { error: "cash-required" });
    return false;
  }
  return true;
}

async function requirePrinterUser(res, userId) {
  await loadSharedState();
  const user = (sharedState?.users || []).find((item) => item.id === userId);
  if (!serverUserHasFunction(user, "caja") && !serverUserHasFunction(user, "mesero")) {
    sendJson(res, 403, { error: "printer-user-required" });
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
      if (path.isAbsolute(command)) {
        try {
          await access(command);
        } catch {
          continue;
        }
      }
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

function seededRandom(seed) {
  const text = String(seed || "");
  let state = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    state ^= text.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(min, max, random = Math.random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function sampleItems(items, count, random = Math.random) {
  const pool = [...items];
  const selected = [];
  while (selected.length < count && pool.length) {
    selected.push(pool.splice(randomInt(0, pool.length - 1, random), 1)[0]);
  }
  return selected;
}

function receiptMoney(value) {
  const number = roundCurrency(value);
  return `$${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(number)}`;
}

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function cleanIvaRate(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return DEFAULT_IVA_RATE;
  const normalized = rate > 1 ? rate / 100 : rate;
  return Math.max(0, Math.min(1, normalized));
}

function sharedIvaEnabled() {
  return Boolean(sharedState?.settings?.ivaEnabled);
}

function sharedIvaRate() {
  return cleanIvaRate(sharedState?.settings?.ivaRate);
}

function sharedTicketItemPriceMode() {
  return normalizeTicketItemPriceMode(sharedState?.settings?.ticketItemPriceMode);
}

function taxBreakdownForGross(value, rate = sharedIvaEnabled() ? sharedIvaRate() : 0) {
  const gross = roundCurrency(value);
  const ivaRate = cleanIvaRate(rate);
  if (!gross || !ivaRate) return { gross, netSubtotal: gross, iva: 0, ivaRate };
  const netSubtotal = roundCurrency(gross / (1 + ivaRate));
  return {
    gross,
    netSubtotal,
    iva: roundCurrency(gross - netSubtotal),
    ivaRate,
  };
}

function ivaLabel(rate = DEFAULT_IVA_RATE) {
  return `IVA ${Math.round(cleanIvaRate(rate) * 100)}%`;
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

function receiptWrap(value, width = RECEIPT_WIDTH) {
  const text = receiptSanitize(value);
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach((rawWord) => {
    let word = rawWord;
    while (word.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= width) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function receiptCenteredWrap(value) {
  return receiptWrap(value).map((line) => receiptCenter(line));
}

function cleanTicketMarginMm(value) {
  const margin = Math.round(Number(value));
  if (!Number.isFinite(margin)) return DEFAULT_TICKET_MARGIN_MM;
  return Math.max(0, Math.min(20, margin));
}

function ticketMarginsFromOptions(options = {}) {
  const fallback = typeof options === "object" && options !== null ? options.marginMm : options;
  const leftSource = typeof options === "object" && options !== null && options.marginLeftMm !== undefined ? options.marginLeftMm : fallback;
  const rightSource = typeof options === "object" && options !== null && options.marginRightMm !== undefined ? options.marginRightMm : fallback;
  return {
    leftMm: cleanTicketMarginMm(leftSource),
    rightMm: cleanTicketMarginMm(rightSource),
  };
}

function cleanTicketLogoWidthMm(value) {
  const width = Math.round(Number(value));
  if (!Number.isFinite(width)) return DEFAULT_TICKET_LOGO_WIDTH_MM;
  return Math.max(10, Math.min(48, width));
}

function cleanTicketLogoPosition(value) {
  return value === "above-title" ? "above-title" : DEFAULT_TICKET_LOGO_POSITION;
}

function marginMmToHundredthsInchRaw(value) {
  return Math.round(value * 100 / 25.4);
}

function logoWidthMmToHundredthsInch(value) {
  return Math.round(cleanTicketLogoWidthMm(value) * 100 / 25.4);
}

function marginMmToPointsRaw(value) {
  return value * 72 / 25.4;
}

async function resolveTicketLogoFile(logoDataUrl = "") {
  const dataUrl = String(logoDataUrl || "").trim();
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    return { filePath: BRAND_IMAGE_FILE, cleanup: async () => {} };
  }
  const extension = match[1].toLowerCase().startsWith("jp") ? "jpg" : "png";
  const filePath = path.join(tmpdir(), `librepos-ticket-logo-${Date.now()}-${randomBytes(4).toString("hex")}.${extension}`);
  await writeFile(filePath, Buffer.from(match[2].replace(/\s+/g, ""), "base64"));
  return {
    filePath,
    cleanup: async () => {
      await rm(filePath, { force: true });
    },
  };
}

function replaceLibrePosLineWithLogoMarker(text, includeLogo = false, logoPosition = DEFAULT_TICKET_LOGO_POSITION) {
  if (!includeLogo) return text;
  const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const normalizedLines = lines.map((line) => (isReceiptBrandTitle(line) ? receiptCenter(RECEIPT_BRAND_TITLE) : line));
  const withoutLibrePos = normalizedLines.filter((line) => line.trim() !== "LibrePOS");
  const titleIndex = withoutLibrePos.findIndex(isReceiptBrandTitle);
  if (titleIndex >= 0) {
    withoutLibrePos[titleIndex] = receiptCenter(RECEIPT_BRAND_TITLE);
    const markerIndex = cleanTicketLogoPosition(logoPosition) === "above-title" ? titleIndex : titleIndex + 1;
    withoutLibrePos.splice(markerIndex, 0, RECEIPT_LOGO_MARKER);
  }
  return withoutLibrePos.join("\n");
}

function isReceiptBrandTitle(line) {
  const title = receiptSanitize(line);
  return title === "LOS TATAS" || title === RECEIPT_BRAND_TITLE;
}

function localReceiptDate(date = new Date()) {
  return [
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  ].join(" ");
}

function normalizeFakeReceiptType(value) {
  return value === "postpaid" ? "postpaid" : "prepaid";
}

function fakeReceiptText(type = "prepaid", priceMode = sharedTicketItemPriceMode(), seed = "") {
  const receiptType = normalizeFakeReceiptType(type);
  const itemPriceMode = normalizeTicketItemPriceMode(priceMode);
  const random = seed ? seededRandom(seed) : Math.random;
  const now = new Date();
  const table = randomInt(1, 13, random);
  const folio = randomInt(1, 999, random);
  const selected = sampleItems(FAKE_RECEIPT_PRODUCTS, randomInt(3, 5, random), random);
  const lines = [];
  let subtotal = 0;
  const ivaRate = sharedIvaEnabled() ? sharedIvaRate() : 0;
  selected.forEach((product) => {
    const qty = randomInt(1, product.price > 100 ? 2 : 3, random);
    const lineTotal = qty * product.price;
    subtotal += lineTotal;
    const lineDisplayTotal = itemPriceMode === "gross" ? lineTotal : taxBreakdownForGross(lineTotal, ivaRate).netSubtotal;
    lines.push(receiptColumns(`${qty} ${product.name}`, receiptMoney(lineDisplayTotal)));
    if (product.extras.length && random() > 0.45) {
      const extra = product.extras[randomInt(0, product.extras.length - 1, random)];
      subtotal += extra.price;
      const extraDisplayPrice = itemPriceMode === "gross" ? extra.price : taxBreakdownForGross(extra.price, ivaRate).netSubtotal;
      lines.push(receiptColumns(`  + ${extra.name}`, receiptMoney(extraDisplayPrice)));
    }
  });
  const discountOptions = [
    { label: "Fidelidad 10%", rate: 0.1 },
    { label: "Fidelidad 15%", rate: 0.15 },
    { label: "Fidelidad 20%", rate: 0.2 },
    { label: "Desc. locatario 10%", rate: 0.1 },
  ];
  const discount = receiptType === "postpaid" ? discountOptions[randomInt(0, discountOptions.length - 1, random)] : null;
  const discountAmount = discount ? roundCurrency(subtotal * discount.rate) : 0;
  const discountedSubtotal = roundCurrency(subtotal - discountAmount);
  const tax = taxBreakdownForGross(discountedSubtotal, ivaRate);
  const tipRate = [10, 12, 15][randomInt(0, 2, random)];
  const tip = receiptType === "postpaid" ? roundCurrency(discountedSubtotal * tipRate / 100) : 0;
  const total = roundCurrency(discountedSubtotal + tip);
  const card = random() > 0.5;
  const paid = card ? total : Math.ceil(total / 50) * 50;
  const change = Math.max(0, paid - total);
  return [
    receiptCenter(RECEIPT_BRAND_TITLE),
    receiptCenter("LibrePOS"),
    ...receiptCenteredWrap(RESTAURANT_ADDRESS),
    receiptCenter(receiptType === "postpaid" ? "PRUEBA POSTPAGO" : "PRUEBA PREPAGO"),
    receiptRule(),
    receiptColumns("Folio", folio),
    localReceiptDate(now),
    receiptColumns(`Mesa ${table}`, "Mesero Ivanna"),
    receiptRule(),
    ...lines,
    receiptRule(),
    discount ? receiptColumns("Consumo antes", receiptMoney(subtotal)) : null,
    discount ? receiptColumns(discount.label, `-${receiptMoney(discountAmount)}`) : null,
    receiptColumns("Subtotal s/IVA", receiptMoney(tax.netSubtotal)),
    receiptColumns(ivaLabel(tax.ivaRate), receiptMoney(tax.iva)),
    receiptType === "postpaid" ? receiptColumns("Consumo", receiptMoney(discountedSubtotal)) : null,
    receiptType === "postpaid" ? receiptColumns(`Propina ${tipRate}%`, receiptMoney(tip)) : null,
    receiptColumns("TOTAL", receiptMoney(total)),
    receiptType === "prepaid" ? receiptCenter("Pendiente de pago") : null,
    receiptType === "postpaid" ? receiptColumns(card ? "Pago tarjeta" : "Pago efectivo", receiptMoney(paid)) : null,
    receiptType === "postpaid" && !card ? receiptColumns("Cambio", receiptMoney(change)) : null,
    receiptRule(),
    receiptCenter("Gracias por su visita"),
    "",
    "",
    "",
  ].filter((line) => line !== null).join("\n");
}

function receiptHeaderText() {
  return [
    receiptCenter(RECEIPT_BRAND_TITLE),
    receiptCenter("LibrePOS"),
    ...receiptCenteredWrap(RESTAURANT_ADDRESS),
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

async function printWithCups(printerName, filePath, { marginMm = null, marginLeftMm = null, marginRightMm = null } = {}) {
  const args = ["-d", printerName, "-t", "LibrePOS test"];
  if (marginLeftMm !== null || marginRightMm !== null || marginMm !== null) {
    const margins = ticketMarginsFromOptions({ marginMm, marginLeftMm, marginRightMm });
    args.push(
      "-o",
      `page-left=${Math.round(marginMmToPointsRaw(margins.leftMm))}`,
      "-o",
      `page-right=${Math.round(marginMmToPointsRaw(margins.rightMm))}`,
    );
  }
  args.push(filePath);
  await execFile("lp", args, {
    timeout: 20000,
    maxBuffer: 128 * 1024,
  });
  return { method: "cups-lp" };
}

function pdfNumber(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function pdfEscapeText(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfObject(number, body) {
  return Buffer.from(`${number} 0 obj\n${body}\nendobj\n`, "binary");
}

function pdfStreamObject(number, dictionary, stream) {
  return Buffer.concat([
    Buffer.from(`${number} 0 obj\n<< ${dictionary} /Length ${stream.length} >>\nstream\n`, "binary"),
    stream,
    Buffer.from("\nendstream\nendobj\n", "binary"),
  ]);
}

function pdfDocument(objects) {
  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const buffers = [header];
  const offsets = [0];
  let offset = header.length;
  objects.forEach((object, index) => {
    offsets[index + 1] = offset;
    buffers.push(object);
    offset += object.length;
  });
  const xrefOffset = offset;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((item) => `${String(item).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    "",
  ].join("\n");
  return Buffer.concat([...buffers, Buffer.from(xref, "binary")]);
}

function jpegDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (startOfFrameMarkers.has(marker) && offset + 7 <= buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

async function resolveTicketLogoJpeg(logoDataUrl = "") {
  const logoFile = await resolveTicketLogoFile(logoDataUrl);
  const extraCleanupFiles = [];
  const cleanup = async () => {
    await Promise.all(extraCleanupFiles.map((file) => rm(file, { force: true })));
    await logoFile.cleanup();
  };
  try {
    let filePath = logoFile.filePath;
    if (path.extname(filePath).toLowerCase() === ".png") {
      const jpegPath = path.join(tmpdir(), `librepos-ticket-logo-${Date.now()}-${randomBytes(4).toString("hex")}.jpg`);
      await execFile("sips", ["-s", "format", "jpeg", filePath, "--out", jpegPath], { timeout: 15000, maxBuffer: 512 * 1024 });
      extraCleanupFiles.push(jpegPath);
      filePath = jpegPath;
    }
    const buffer = await readFile(filePath);
    const dimensions = jpegDimensions(buffer);
    if (!dimensions) {
      await cleanup();
      return null;
    }
    return {
      buffer,
      ...dimensions,
      cleanup,
    };
  } catch {
    await cleanup();
    return null;
  }
}

async function createReceiptPdfFile(text, options = {}) {
  const { logoDataUrl = "", logoWidthMm = DEFAULT_TICKET_LOGO_WIDTH_MM } = options;
  const margins = ticketMarginsFromOptions(options);
  const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const logo = lines.some((line) => line === RECEIPT_LOGO_MARKER) ? await resolveTicketLogoJpeg(logoDataUrl) : null;
  const paperWidth = 58 * 72 / 25.4;
  const leftMargin = marginMmToPointsRaw(margins.leftMm);
  const rightMargin = marginMmToPointsRaw(margins.rightMm);
  const availableWidth = Math.max(1, paperWidth - leftMargin - rightMargin);
  const logoWidth = Math.min(logoWidthMmToHundredthsInch(logoWidthMm) * 72 / 100, availableWidth);
  const logoHeight = logo ? Math.max(1, logoWidth * (logo.height / logo.width)) : 0;
  const fontSize = Math.min(7, Math.max(5.4, availableWidth / (RECEIPT_WIDTH * 0.6)));
  const lineHeight = Math.ceil(fontSize + 2);
  const topMargin = 8;
  const bottomMargin = 18;
  const contentHeight = lines.reduce((height, line) => {
    if (line === RECEIPT_LOGO_MARKER) return height + (logo ? logoHeight + 6 : 0);
    return height + lineHeight;
  }, 0);
  const pageHeight = Math.max(260, topMargin + contentHeight + bottomMargin);
  const contentCommands = [];
  let cursorTop = pageHeight - topMargin;
  lines.forEach((line) => {
    if (line === RECEIPT_LOGO_MARKER) {
      if (logo) {
        const x = leftMargin + Math.max(0, (availableWidth - logoWidth) / 2);
        const y = cursorTop - logoHeight;
        contentCommands.push(`q ${pdfNumber(logoWidth)} 0 0 ${pdfNumber(logoHeight)} ${pdfNumber(x)} ${pdfNumber(y)} cm /Im1 Do Q`);
        cursorTop -= logoHeight + 6;
      }
      return;
    }
    const y = cursorTop - fontSize;
    contentCommands.push(`BT /F1 ${pdfNumber(fontSize)} Tf 1 0 0 1 ${pdfNumber(leftMargin)} ${pdfNumber(y)} Tm (${pdfEscapeText(line)}) Tj ET`);
    cursorTop -= lineHeight;
  });
  const content = Buffer.from(`${contentCommands.join("\n")}\n`, "binary");
  const resources = logo
    ? "<< /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >>"
    : "<< /Font << /F1 5 0 R >> >>";
  const objects = [
    pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    pdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    pdfObject(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(paperWidth)} ${pdfNumber(pageHeight)}] /Resources ${resources} /Contents 4 0 R >>`),
    pdfStreamObject(4, "", content),
    pdfObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"),
  ];
  if (logo) {
    objects.push(pdfStreamObject(6, `/Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, logo.buffer));
  }
  const filePath = path.join(tmpdir(), `librepos-receipt-${Date.now()}-${randomBytes(4).toString("hex")}.pdf`);
  try {
    await writeFile(filePath, pdfDocument(objects));
  } finally {
    if (logo) await logo.cleanup();
  }
  return filePath;
}

async function printReceiptWithCupsDocument(printerName, text, options = {}) {
  const marginMm = typeof options === "object" && options !== null ? options.marginMm : options;
  const marginLeftMm = typeof options === "object" && options !== null ? options.marginLeftMm : null;
  const marginRightMm = typeof options === "object" && options !== null ? options.marginRightMm : null;
  const hasLogoMarker = String(text || "").split(/\r\n|\r|\n/).some((line) => line === RECEIPT_LOGO_MARKER);
  const filePath = hasLogoMarker
    ? await createReceiptPdfFile(text, options)
    : path.join(tmpdir(), `librepos-receipt-${Date.now()}-${randomBytes(4).toString("hex")}.txt`);
  if (!hasLogoMarker) await writeFile(filePath, text, "utf8");
  try {
    const result = await printWithCups(printerName, filePath, {
      marginMm: hasLogoMarker ? null : marginMm,
      marginLeftMm: hasLogoMarker ? null : marginLeftMm,
      marginRightMm: hasLogoMarker ? null : marginRightMm,
    });
    return { method: hasLogoMarker ? "cups-lp-pdf-logo" : result.method };
  } finally {
    await rm(filePath, { force: true });
  }
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

function windowsLegacyReceiptText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => (line === RECEIPT_LOGO_MARKER ? RECEIPT_BRAND_TITLE : line))
    .join("\n");
}

async function printReceiptWithWindowsFallback(printerName, text, options = {}, method = "windows-out-printer-receipt-fallback") {
  try {
    return await printReceiptWithWindowsDocument(printerName, text, options);
  } catch (documentError) {
    try {
      const fallback = await printTextWithWindowsLegacy(printerName, windowsLegacyReceiptText(text), method);
      return {
        method: fallback?.method || method,
        fallbackFrom: compactError(documentError),
      };
    } catch (fallbackError) {
      throw new Error(`windows-receipt-print-failed document=${compactError(documentError)} legacy=${compactError(fallbackError)}`);
    }
  }
}

async function printWithWindowsLegacy(printerName) {
  return printTextWithWindowsLegacy(printerName, legacyTicketText(), "windows-out-printer-legacy");
}

async function printReceiptWithWindowsDocument(printerName, text, options = {}) {
  const logoDataUrl = typeof options === "object" && options !== null ? options.logoDataUrl : "";
  const logoWidthMm = typeof options === "object" && options !== null ? options.logoWidthMm : DEFAULT_TICKET_LOGO_WIDTH_MM;
  const margins = ticketMarginsFromOptions(options);
  const leftMargin = marginMmToHundredthsInchRaw(margins.leftMm);
  const rightMargin = marginMmToHundredthsInchRaw(margins.rightMm);
  const logoWidth = logoWidthMmToHundredthsInch(logoWidthMm);
  const hasLogoMarker = String(text || "").split(/\r\n|\r|\n/).some((line) => line === RECEIPT_LOGO_MARKER);
  const logoFile = hasLogoMarker ? await resolveTicketLogoFile(logoDataUrl) : { filePath: "", cleanup: async () => {} };
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "Add-Type -AssemblyName System.Drawing",
    "$printer = $args[0]",
    "$text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($args[1]))",
    "$lines = $text -replace \"`r`n\", \"`n\" -replace \"`r\", \"`n\" -split \"`n\"",
    "$paperWidth = 228",
    "$leftMargin = [int]$args[2]",
    "$rightMargin = [int]$args[3]",
    "$logoPath = [string]$args[4]",
    "$logoWidthTarget = [int]$args[5]",
    `$logoMarker = '${RECEIPT_LOGO_MARKER}'`,
    "$logo = $null",
    "if ($logoPath -and (Test-Path -LiteralPath $logoPath)) { $logo = [System.Drawing.Image]::FromFile($logoPath) }",
    "$availableWidth = [Math]::Max(1, $paperWidth - $leftMargin - $rightMargin)",
    "$targetLogoWidth = [Math]::Max(1, [Math]::Min($logoWidthTarget, $availableWidth))",
    "$targetLogoHeight = 0",
    "if ($logo -ne $null) { $targetLogoHeight = [Math]::Max(1, [Math]::Round($targetLogoWidth * ([double]$logo.Height / [double]$logo.Width))) }",
    "$logoLineCount = @($lines | Where-Object { $_ -eq $logoMarker }).Count",
    "$paperHeight = [Math]::Max(550, (($lines.Count + 8) * 14) + (($targetLogoHeight + 8) * $logoLineCount))",
    "$doc = New-Object System.Drawing.Printing.PrintDocument",
    "$doc.PrinterSettings.PrinterName = $printer",
    "if (-not $doc.PrinterSettings.IsValid) { throw \"printer-not-valid:$printer\" }",
    "$doc.DocumentName = 'LibrePOS cuenta 58mm'",
    "$doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('LibrePOS 58mm', $paperWidth, $paperHeight)",
    "$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins($leftMargin, $rightMargin, 2, 2)",
    `$fontSize = [Math]::Min(7.0, [Math]::Max(5.4, (($availableWidth * 72.0 / 100.0) / (${RECEIPT_WIDTH} * 0.6))))`,
    "$font = New-Object System.Drawing.Font('Courier New', $fontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)",
    "$brush = [System.Drawing.Brushes]::Black",
    "$script:lineIndex = 0",
    "$doc.add_PrintPage({",
    "  param($sender, $event)",
    "  $x = $leftMargin",
    "  $y = 2",
    "  $lineHeight = [Math]::Ceiling($font.GetHeight($event.Graphics)) + 1",
    "  $bottom = $event.PageBounds.Height - 4",
    "  while ($script:lineIndex -lt $lines.Count) {",
    "    $line = [string]$lines[$script:lineIndex]",
    "    if ($line -eq $logoMarker) {",
    "      if ($logo -ne $null) {",
    "        if ($y + $targetLogoHeight + 6 -gt $bottom -and $y -gt 2) {",
    "          $event.HasMorePages = $true",
    "          return",
    "        }",
    "        $logoX = $leftMargin + [Math]::Max(0, [Math]::Round(($availableWidth - $targetLogoWidth) / 2))",
    "        $rect = [System.Drawing.RectangleF]::new([float]$logoX, [float]$y, [float]$targetLogoWidth, [float]$targetLogoHeight)",
    "        $event.Graphics.DrawImage($logo, $rect)",
    "        $y += $targetLogoHeight + 6",
    "      }",
    "      $script:lineIndex += 1",
    "      continue",
    "    }",
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
    "try { $doc.Print(); Write-Output ('windows-printdocument-58mm:' + $printer) } finally { $font.Dispose(); if ($logo -ne $null) { $logo.Dispose() }; $doc.Dispose() }",
  ].join("\n");
  try {
    await runPowerShell(script, [
      printerName,
      Buffer.from(text, "utf8").toString("base64"),
      String(leftMargin),
      String(rightMargin),
      logoFile.filePath,
      String(logoWidth),
    ], { timeout: 30000, maxBuffer: 1024 * 1024 });
    return { method: hasLogoMarker ? "windows-printdocument-logo" : "windows-printdocument" };
  } finally {
    await logoFile.cleanup();
  }
}

async function printLogoWithWindowsDocument(printerName, options = {}) {
  const logoDataUrl = typeof options === "object" && options !== null ? options.logoDataUrl : "";
  const logoWidthMm = typeof options === "object" && options !== null ? options.logoWidthMm : DEFAULT_TICKET_LOGO_WIDTH_MM;
  const margins = ticketMarginsFromOptions(options);
  const leftMargin = marginMmToHundredthsInchRaw(margins.leftMm);
  const rightMargin = marginMmToHundredthsInchRaw(margins.rightMm);
  const logoWidth = logoWidthMmToHundredthsInch(logoWidthMm);
  const logoFile = await resolveTicketLogoFile(logoDataUrl);
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "Add-Type -AssemblyName System.Drawing",
    "$printer = $args[0]",
    "$imagePath = $args[1]",
    "$leftMargin = [int]$args[2]",
    "$rightMargin = [int]$args[3]",
    "$logoWidthTarget = [int]$args[4]",
    "if (-not (Test-Path -LiteralPath $imagePath)) { throw \"logo-not-found:$imagePath\" }",
    "$image = [System.Drawing.Image]::FromFile($imagePath)",
    "$doc = New-Object System.Drawing.Printing.PrintDocument",
    "$doc.PrinterSettings.PrinterName = $printer",
    "if (-not $doc.PrinterSettings.IsValid) { throw \"printer-not-valid:$printer\" }",
    "$doc.DocumentName = 'LibrePOS logo'",
    "$paperWidth = 228",
    "$availableWidth = [Math]::Max(1, $paperWidth - $leftMargin - $rightMargin)",
    "$targetWidth = [Math]::Max(1, [Math]::Min($logoWidthTarget, $availableWidth))",
    "$imageHeight = [Math]::Max(1, [Math]::Round($targetWidth * ([double]$image.Height / [double]$image.Width)))",
    "$paperHeight = [Math]::Max(260, $imageHeight + 28)",
    "$doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('LibrePOS logo', $paperWidth, $paperHeight)",
    "$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins($leftMargin, $rightMargin, 2, 2)",
    "$doc.add_PrintPage({",
    "  param($sender, $event)",
    "  $x = $leftMargin + [Math]::Max(0, [Math]::Round(($availableWidth - $targetWidth) / 2))",
    "  $y = 8",
    "  $rect = [System.Drawing.RectangleF]::new([float]$x, [float]$y, [float]$targetWidth, [float]$imageHeight)",
    "  $event.Graphics.DrawImage($image, $rect)",
    "  $event.HasMorePages = $false",
    "})",
    "try { $doc.Print(); Write-Output ('windows-print-logo:' + $printer) } finally { $image.Dispose(); $doc.Dispose() }",
  ].join("\n");
  try {
    await runPowerShell(script, [printerName, logoFile.filePath, String(leftMargin), String(rightMargin), String(logoWidth)], { timeout: 30000, maxBuffer: 1024 * 1024 });
    return { method: "windows-print-logo" };
  } finally {
    await logoFile.cleanup();
  }
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

export function previewFakeReceiptTicket(type = "prepaid", priceMode = sharedTicketItemPriceMode(), seed = "") {
  const receiptType = normalizeFakeReceiptType(type);
  const itemPriceMode = normalizeTicketItemPriceMode(priceMode);
  const sampleSeed = String(seed || Date.now());
  return { ticketText: fakeReceiptText(receiptType, itemPriceMode, sampleSeed), type: receiptType, priceMode: itemPriceMode, seed: sampleSeed, width: RECEIPT_WIDTH, createdAt: new Date().toISOString() };
}

export async function printFakeReceiptTicket(printerName, ticketText = "", options = {}) {
  const marginMm = typeof options === "object" && options !== null ? options.marginMm : options;
  const margins = ticketMarginsFromOptions(options);
  const logoDataUrl = typeof options === "object" && options !== null ? options.logoDataUrl : "";
  const logoWidthMm = typeof options === "object" && options !== null ? options.logoWidthMm : DEFAULT_TICKET_LOGO_WIDTH_MM;
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  const text = cleanReceiptPayload(ticketText) || fakeReceiptText(options.type, options.priceMode, options.seed);
  const printOptions = { marginMm, marginLeftMm: margins.leftMm, marginRightMm: margins.rightMm, logoDataUrl, logoWidthMm };
  let result = null;
  if (process.platform === "win32") {
    result = await printReceiptWithWindowsFallback(cleanName, `${text}\n\n\n`, printOptions, "windows-out-printer-fake-receipt-fallback");
  } else {
    result = await printReceiptWithCupsDocument(cleanName, `${text}\n\n\n`, printOptions);
  }
  return { ok: true, printerName: cleanName, method: result?.method || "", type: normalizeFakeReceiptType(options.type), marginMm: margins.leftMm, marginLeftMm: margins.leftMm, marginRightMm: margins.rightMm, printedAt: new Date().toISOString(), ticketText: text };
}

export async function printReceiptHeaderTicket(printerName, options = {}) {
  const marginMm = typeof options === "object" && options !== null ? options.marginMm : options;
  const margins = ticketMarginsFromOptions(options);
  const logoDataUrl = typeof options === "object" && options !== null ? options.logoDataUrl : "";
  const logoWidthMm = typeof options === "object" && options !== null ? options.logoWidthMm : DEFAULT_TICKET_LOGO_WIDTH_MM;
  const includeLogo = Boolean(typeof options === "object" && options !== null && options.includeLogo);
  const logoPosition = typeof options === "object" && options !== null ? options.logoPosition : DEFAULT_TICKET_LOGO_POSITION;
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  const text = replaceLibrePosLineWithLogoMarker(receiptHeaderText(), includeLogo, logoPosition);
  const printOptions = { marginMm, marginLeftMm: margins.leftMm, marginRightMm: margins.rightMm, logoDataUrl, logoWidthMm };
  let result = null;
  if (process.platform === "win32") {
    result = await printReceiptWithWindowsFallback(cleanName, `${text}\n\n\n`, printOptions, "windows-out-printer-header-fallback");
  } else {
    result = await printReceiptWithCupsDocument(cleanName, `${text}\n\n\n`, printOptions);
  }
  return { ok: true, printerName: cleanName, method: result?.method || "", marginMm: margins.leftMm, marginLeftMm: margins.leftMm, marginRightMm: margins.rightMm, printedAt: new Date().toISOString(), ticketText: text };
}

export async function printLogoTestTicket(printerName, options = {}) {
  const marginMm = typeof options === "object" && options !== null ? options.marginMm : options;
  const margins = ticketMarginsFromOptions(options);
  const logoDataUrl = typeof options === "object" && options !== null ? options.logoDataUrl : "";
  const logoWidthMm = typeof options === "object" && options !== null ? options.logoWidthMm : DEFAULT_TICKET_LOGO_WIDTH_MM;
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  let result = null;
  if (process.platform === "win32") {
    result = await printLogoWithWindowsDocument(cleanName, { marginMm, marginLeftMm: margins.leftMm, marginRightMm: margins.rightMm, logoDataUrl, logoWidthMm });
  } else {
    const logoFile = await resolveTicketLogoFile(logoDataUrl);
    try {
      result = await printWithCups(cleanName, logoFile.filePath, { marginMm, marginLeftMm: margins.leftMm, marginRightMm: margins.rightMm });
    } finally {
      await logoFile.cleanup();
    }
  }
  return {
    ok: true,
    printerName: cleanName,
    method: result?.method || "",
    marginMm: margins.leftMm,
    marginLeftMm: margins.leftMm,
    marginRightMm: margins.rightMm,
    logoWidthMm: cleanTicketLogoWidthMm(logoWidthMm),
    printedAt: new Date().toISOString(),
    logoPath: logoDataUrl ? "custom" : "/assets/brand.jpg",
  };
}

export async function printSaleReceiptTicket(printerName, ticketText = "", options = {}) {
  const marginMm = typeof options === "object" && options !== null ? options.marginMm : options;
  const margins = ticketMarginsFromOptions(options);
  const logoDataUrl = typeof options === "object" && options !== null ? options.logoDataUrl : "";
  const logoWidthMm = typeof options === "object" && options !== null ? options.logoWidthMm : DEFAULT_TICKET_LOGO_WIDTH_MM;
  const cleanName = String(printerName || "").trim();
  if (!cleanName) throw new Error("printer-required");
  const text = cleanReceiptPayload(ticketText);
  if (!text.trim()) throw new Error("ticket-required");
  const printOptions = { marginMm, marginLeftMm: margins.leftMm, marginRightMm: margins.rightMm, logoDataUrl, logoWidthMm };
  let result = null;
  if (process.platform === "win32") {
    result = await printReceiptWithWindowsFallback(cleanName, `${text}\n\n\n`, printOptions, "windows-out-printer-sale-receipt-fallback");
  } else {
    result = await printReceiptWithCupsDocument(cleanName, `${text}\n\n\n`, printOptions);
  }
  return { ok: true, printerName: cleanName, method: result?.method || "", marginMm: margins.leftMm, marginLeftMm: margins.leftMm, marginRightMm: margins.rightMm, printedAt: new Date().toISOString(), ticketText: text };
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

export function createSyncMiddleware() {
  uberService.start();
  const middleware = async function syncMiddleware(req, res, next) {
    if (isPrivateRequest(req.url)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname === '/api/uber/webhook') {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      try {
        const result = await uberService.receive(await readUberRawBody(req), req.headers['x-uber-signature']);
        if (result.status === 200) { res.statusCode = 200; res.end(); }
        else sendJson(res, result.status, { error: result.error });
      } catch { sendJson(res, 503, { error: 'No se pudo guardar el webhook. Uber debe reintentar.' }); }
      return;
    }
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-LibrePOS-Session");
    if (req.method === "OPTIONS") {
      if (await requireAccess(req, res)) {
        res.statusCode = 204;
        res.end();
      }
      return;
    }

    try {
      if (!(await requireAccess(req, res))) return;

      if (url.pathname.startsWith('/api/uber/')) {
        await loadSharedState();
        const user = loggedInUser(req);
        if (!user) { sendJson(res, 401, { error: 'Inicia sesión para gestionar Uber Eats.' }); return; }
        const roles = userFunctions(user);
        if (!roles.some(role => ['admin', 'caja', 'cocina'].includes(role))) { sendJson(res, 403, { error: 'Uber requiere funciones de caja, cocina o administración.' }); return; }
        try {
          if (url.pathname === '/api/uber/status' && req.method === 'GET') {
            const status = await uberService.status();
            if (!isPermissionsAdmin(user)) status.config = { enabled: status.config.enabled, environment: status.config.environment, autoAccept: status.config.autoAccept, autoPrint: status.config.autoPrint };
            sendJson(res, 200, status); return;
          }
          if (req.method !== 'POST') { sendJson(res, 405, { error: 'Método no permitido.' }); return; }
          const payload = JSON.parse(await readBody(req) || '{}');
          if (url.pathname === '/api/uber/action') {
            if (!uberActionAllowed(user, payload.action, userFunctions)) { sendJson(res, 403, { error: 'Solo caja o administración pueden aceptar, entregar o cancelar pedidos Uber.' }); return; }
            await uberService.action(payload, user.id);
            sendJson(res, 200, { ok: true, version: sharedVersion, state: publicState(sharedState) }); return;
          }
          if (!isPermissionsAdmin(user)) { sendJson(res, 403, { error: 'Solo administración puede configurar la integración.' }); return; }
          if (url.pathname === '/api/uber/config') { sendJson(res, 200, await uberService.serialize(() => uberService.configure(payload))); return; }
          if (url.pathname === '/api/uber/connection') { sendJson(res, 200, await uberService.serialize(() => uberService.connection())); return; }
          if (url.pathname === '/api/uber/store') { sendJson(res, 200, await uberService.serialize(() => uberService.storeStatus(payload.status, Number(payload.minutes || 30)))); return; }
          if (url.pathname === '/api/uber/demo' && uberService.demo) {
            await uberService.serialize(async () => {
              await uberService.init();
              await mutateIntegrationState(draft => {
                if (!draft.menuProducts.some(p => p.id === 'demo-cafe-pos')) draft.menuProducts.push({ id: 'demo-cafe-pos', name: 'Café de prueba', section: 'Bebidas', subsection: 'Pruebas', station: 'Barra', price: 40, active: true, options: [], recipe: [{ itemId: 'demo-cafe-stock', name: 'CAFÉ DE PRUEBA', qty: 1 }], variantRecipes: {} });
                if (!draft.inventory.some(i => i.id === 'demo-cafe-stock')) draft.inventory.push({ id: 'demo-cafe-stock', name: 'CAFÉ DE PRUEBA', category: 'PRUEBAS', unit: 'PZ', qty: 100, unitCost: 10, totalCost: 1000 });
              });
              uberService.config.mappings['demo-cafe-uber|'] = { productId: 'demo-cafe-pos', selections: {}, extraIds: [] };
              await uberService.simulate(demoUberOrder(`demo-${randomBytes(5).toString('hex')}`));
            });
            sendJson(res, 200, { ok: true, version: sharedVersion, state: publicState(sharedState) }); return;
          }
          sendJson(res, 404, { error: 'Ruta Uber no disponible.' });
        } catch (error) { sendJson(res, 400, { error: error.message }); }
        return;
      }

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
        sendJson(res, 200, previewFakeReceiptTicket(url.searchParams.get("type"), url.searchParams.get("priceMode"), url.searchParams.get("seed")));
        return;
      }

      if (url.pathname === "/api/printers/fake-receipt/print" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requireAdminUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printFakeReceiptTicket(payload.printerName, payload.ticketText, {
            marginMm: payload.marginMm,
            marginLeftMm: payload.marginLeftMm,
            marginRightMm: payload.marginRightMm,
            logoDataUrl: payload.logoDataUrl,
            logoWidthMm: payload.logoWidthMm,
            type: payload.type,
            priceMode: payload.priceMode,
            seed: payload.seed,
          }));
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
          sendJson(res, 200, await printReceiptHeaderTicket(payload.printerName, {
            marginMm: payload.marginMm,
            marginLeftMm: payload.marginLeftMm,
            marginRightMm: payload.marginRightMm,
            logoDataUrl: payload.logoDataUrl,
            logoWidthMm: payload.logoWidthMm,
            includeLogo: payload.includeLogo,
            logoPosition: payload.logoPosition,
          }));
        } catch (error) {
          sendJson(res, 500, { error: "printer-header-print-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/printers/logo/print" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requireAdminUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printLogoTestTicket(payload.printerName, {
            marginMm: payload.marginMm,
            marginLeftMm: payload.marginLeftMm,
            marginRightMm: payload.marginRightMm,
            logoDataUrl: payload.logoDataUrl,
            logoWidthMm: payload.logoWidthMm,
          }));
        } catch (error) {
          sendJson(res, 500, { error: "printer-logo-print-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/printers/sale-receipt/print" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requireCashUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printSaleReceiptTicket(payload.printerName, payload.ticketText, {
            marginMm: payload.marginMm,
            marginLeftMm: payload.marginLeftMm,
            marginRightMm: payload.marginRightMm,
            logoDataUrl: payload.logoDataUrl,
            logoWidthMm: payload.logoWidthMm,
          }));
        } catch (error) {
          sendJson(res, 500, { error: "printer-sale-receipt-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/printers/order-receipt/print" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requirePrinterUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printSaleReceiptTicket(payload.printerName, payload.ticketText, {
            marginMm: payload.marginMm,
            marginLeftMm: payload.marginLeftMm,
            marginRightMm: payload.marginRightMm,
            logoDataUrl: payload.logoDataUrl,
            logoWidthMm: payload.logoWidthMm,
          }));
        } catch (error) {
          sendJson(res, 500, { error: "printer-receipt-failed", detail: compactError(error) });
        }
        return;
      }

      if (url.pathname === "/api/printers/command/print" && req.method === "POST") {
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!(await requirePrinterUser(res, String(payload.userId || "")))) return;
        try {
          sendJson(res, 200, await printSaleReceiptTicket(payload.printerName, payload.ticketText, {
            marginMm: payload.marginMm,
            marginLeftMm: payload.marginLeftMm,
            marginRightMm: payload.marginRightMm,
          }));
        } catch (error) {
          sendJson(res, 500, { error: "printer-command-failed", detail: compactError(error) });
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
        await loadSharedState();
        if (!loggedInUser(req)) {
          sendJson(res, 401, { error: "login-required" });
          return;
        }
        const status = await getUpdateStatus();
        if (serverUserIsAdmin(loggedInUser(req))) status.deviceId = await deviceId();
        sendJson(res, 200, status);
        return;
      }

      if (url.pathname === "/api/update/apply" && req.method === "POST") {
        await loadSharedState();
        const user = loggedInUser(req);
        if (!user) {
          sendJson(res, 401, { error: "login-required" });
          return;
        }
        if (!serverUserIsAdmin(user)) {
          sendJson(res, 403, { error: "admin-required" });
          return;
        }
        try {
          sendJson(res, 200, await applyRepositoryUpdate());
        } catch (error) {
          const busy = ["cash-register-open", "update-in-progress"].includes(error.message);
          sendJson(res, busy ? 409 : 503, { error: busy ? error.message : "update-failed" });
        }
        return;
      }

      if (url.pathname === "/api/session" && req.method === "GET") {
        await loadSharedState();
        const user = loggedInUser(req);
        sendJson(res, user ? 200 : 401, { userId: user?.id || null });
        return;
      }
      if (url.pathname === "/api/logout" && req.method === "POST") {
        loginSessions.delete(req.headers["x-librepos-session"]);
        sendJson(res, 200, { ok: true });
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
        const attemptKey = loginAttemptKey(req, username);
        if (loginLocked(attemptKey)) {
          sendJson(res, 429, { error: "too-many-attempts" });
          return;
        }
        const user = (sharedState?.users || []).find((item) => item.active !== false && sameUsername(item.username, username));
        if (!verifyPassword(user, password)) {
          recordLoginFailure(attemptKey);
          sendJson(res, 401, { error: "invalid-login" });
          return;
        }
        loginFailures.delete(attemptKey);
        if (user.password) {
          const normalized = normalizeStateForStorage(sharedState);
          sharedState = normalized.state;
          await writeStateFile();
        }
        for (const [token, session] of loginSessions) if (session.expiresAt <= Date.now()) loginSessions.delete(token);
        const sessionToken = randomBytes(32).toString("hex");
        const savedUser = sharedState.users.find(item => item.id === user.id);
        loginSessions.set(sessionToken, { userId: user.id, passwordHash: savedUser.passwordHash, expiresAt: Date.now() + LOGIN_LIFETIME_MS });
        sendJson(res, 200, { userId: user.id, sessionToken, version: sharedVersion, state: publicState(sharedState) });
        return;
      }

      if (url.pathname === "/api/state" && req.method === "GET") {
        await loadSharedState();
        // An empty server answers without a session: the first device has to create the initial state.
        if (sharedState && !loggedInUser(req)) {
          sendJson(res, 401, { error: "login-required" });
          return;
        }
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
        const save = stateWriteQueue.then(async () => {
          // Checked inside the queue: every response below carries the saved state.
          const actor = loggedInUser(req);
          if (sharedState && !actor) {
            sendJson(res, 401, { error: "login-required" });
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
          const permissionError = uberStateChangeError(sharedState, payload.state) || protectedStateChangeError(sharedState, payload.state, actor);
          if (permissionError) {
            sendJson(res, 403, { error: permissionError, version: sharedVersion, state: publicState(sharedState) });
            return;
          }
          const saved = await saveSharedState(payload.state, String(payload.clientId || ""));
          sendJson(res, 200, saved);
        });
        stateWriteQueue = save.catch(() => {});
        await save;
        return;
      }

      if (url.pathname === "/api/events" && req.method === "GET") {
        await loadSharedState();
        // EventSource cannot send headers, so the stream names its session in the query string.
        const sessionToken = url.searchParams.get("session") || "";
        if (!sessionUser(sessionToken)) {
          sendJson(res, 401, { error: "login-required" });
          return;
        }
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        res.write(`event: hello\ndata: ${JSON.stringify({ version: sharedVersion, state: publicState(sharedState) })}\n\n`);
        const stopStream = () => {
          clearInterval(heartbeat);
          clients.delete(res);
        };
        const heartbeat = setInterval(() => {
          try {
            res.write(`event: ping\ndata: ${Date.now()}\n\n`);
          } catch {
            stopStream();
          }
        }, 20000);
        clients.set(res, { sessionToken, stopStream });
        req.on("close", stopStream);
        return;
      }

      sendJson(res, 404, { error: "not-found" });
    } catch (error) {
      sendJson(res, 500, { error: error?.message || "sync-error" });
    }
  };
  middleware.close = () => uberService.stop();
  return middleware;
}
