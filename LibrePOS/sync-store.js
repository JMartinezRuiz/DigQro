import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT_DIR, ".librepos");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const TOKEN_FILE = path.join(DATA_DIR, "sync-token");
const BODY_LIMIT = 8 * 1024 * 1024;
const ACCESS_COOKIE = "librepos_sync";
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = "sha256";

let sharedState = null;
let sharedVersion = 0;
let accessToken = "";
const clients = new Set();

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
