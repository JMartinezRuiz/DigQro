import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer as createHttpServer, get } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPrivateRequest } from "../private-paths.js";

const SECRET = "dato-privado-de-prueba";

const baseState = (users) => ({
  settings: {}, users, orders: [], sales: [{ id: "sale-1", total: 123, note: SECRET }], cancellations: [], inventory: [],
  ingredientCategories: [], inventoryMovements: [], expenses: [], menuProducts: [], extraCatalog: [], attendance: [], cashSessions: [],
});

const testUsers = () => [
  { id: "admin", username: "admin", name: "Admin", role: "Administrador", functions: ["admin"], active: true, password: "admin-pass" },
  { id: "caja", username: "caja", name: "Caja", role: "Caja", functions: ["caja"], active: true, password: "caja-pass" },
];

// Raw request: fetch would normalize dot segments and encodings before sending them.
function rawGet(port, target) {
  return new Promise((resolve, reject) => {
    const request = get({ host: "127.0.0.1", port, path: target }, (response) => {
      let body = "";
      response.setEncoding("latin1");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body }));
    });
    request.on("error", reject);
  });
}

async function startApi(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "librepos-data-access-"));
  const previous = process.env.LIBREPOS_DATA_DIR;
  process.env.LIBREPOS_DATA_DIR = dir;
  let createSyncMiddleware;
  try {
    ({ createSyncMiddleware } = await import(`../sync-store.js?access=${Date.now()}-${Math.random()}`));
  } finally {
    if (previous === undefined) delete process.env.LIBREPOS_DATA_DIR;
    else process.env.LIBREPOS_DATA_DIR = previous;
  }
  const middleware = createSyncMiddleware();
  const server = createHttpServer((req, res) => void middleware(req, res, () => res.end("app")));
  t.after(async () => {
    middleware.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const cookie = (await fetch(origin)).headers.get("set-cookie").split(";")[0];
  const call = (method, endpoint, session = "", payload) => fetch(`${origin}${endpoint}`, {
    method,
    headers: { cookie, "Content-Type": "application/json", "X-LibrePOS-Session": session },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const login = async (username, password) => (await call("POST", "/api/login", "", { username, password })).json();
  return { origin, cookie, call, login };
}

async function readStream(response, untilText) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = "";
  while (!received.includes(untilText)) {
    const { value, done } = await reader.read();
    if (done) return { received, ended: true, reader };
    received += decoder.decode(value, { stream: true });
  }
  return { received, ended: false, reader };
}

test("reconoce cualquier forma de pedir la carpeta de datos", () => {
  for (const target of [
    "/.librepos/state.json",
    "/.librepos/uber/config.json",
    "/.librepos/sync-token",
    "/.librepos",
    "/.LIBREPOS/state.json",
    "/%2elibrepos/state.json",
    "/%2Elibrepos/state.json",
    "/%252elibrepos/state.json",
    "/.librepos%2fstate.json",
    "/.librepos./state.json",
    "/.librepos /state.json",
    "/.librepos/state.json::$DATA",
    "/.librepos\\state.json",
    "/x/..%2f.librepos/state.json",
    "/@fs/Users/x/LibrePOS/.librepos/state.json",
    "/src/main.js/../../.librepos/state.json",
    "/LIBREP~1/state.json",
    "/librep~2/uber/config.json",
    "/@fs/C:/LibrePOS/LIBREP~1/state.json",
    "/__open-in-editor?file=package.json",
    "/__OPEN-IN-EDITOR?file=package.json",
    "/%5f_open-in-editor?file=package.json",
    "/%E0%A4%A",
  ]) assert.equal(isPrivateRequest(target), true, target);
});

test("no bloquea los recursos que la app necesita", () => {
  for (const target of [
    "/",
    "/index.html",
    "/src/main.js",
    "/src/main.js?t=1793860000000",
    "/src/styles.css?direct",
    "/assets/brand.jpg",
    "/assets/help/create-product-step-1.png?import",
    "/package.json?import",
    "/@vite/client",
    "/@vite/env",
    "/node_modules/.vite/deps/chunk-abc123.js?v=1a2b3c4d",
    "/api/state",
    "/api/events?clientId=client-abc&session=0f1e2d3c",
    "/api/uber/webhook",
  ]) assert.equal(isPrivateRequest(target), false, target);
});

test("sin sesión no se lee ni se escribe el estado, salvo crear el inicial en un servidor vacío", async (t) => {
  const { call, login } = await startApi(t);
  const empty = await call("GET", "/api/state");
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { version: 0, state: null });
  assert.equal((await call("GET", "/api/events")).status, 401, "ni un servidor vacío abre el flujo de avisos sin sesión");

  const created = await call("POST", "/api/state", "", { baseVersion: 0, state: baseState(testUsers()) });
  assert.equal(created.status, 200);
  const { version } = await created.json();

  for (const [method, endpoint, payload] of [
    ["GET", "/api/state"],
    ["GET", "/api/events"],
    ["GET", "/api/update/status"],
    ["POST", "/api/update/apply"],
    ["POST", "/api/state", { baseVersion: version, state: baseState(testUsers()) }],
    ["POST", "/api/state", { baseVersion: 0, state: baseState(testUsers()) }],
  ]) {
    const response = await call(method, endpoint, "", payload);
    const body = await response.text();
    assert.equal(response.status, 401, `${method} ${endpoint}`);
    assert.equal(body.includes(SECRET), false, `${method} ${endpoint} no debe devolver datos`);
  }
  for (const token of ["invented", "0".repeat(64)]) {
    assert.equal((await call("GET", "/api/state", token)).status, 401);
    assert.equal((await call("GET", `/api/events?session=${token}`)).status, 401);
  }

  const admin = await login("admin", "admin-pass");
  const unchanged = await call("GET", "/api/state", admin.sessionToken);
  assert.equal(unchanged.status, 200);
  const saved = await unchanged.json();
  assert.equal(saved.version, version, "los intentos rechazados no modificaron nada");
  assert.equal(JSON.stringify(saved.state).includes(SECRET), true);
  assert.equal(JSON.stringify(saved.state).includes("passwordHash"), false);
  assert.equal((await call("POST", "/api/state", admin.sessionToken, { baseVersion: 0, state: saved.state })).status, 409);
});

test("actualizar exige una sesión de administración", async (t) => {
  const { call, login } = await startApi(t);
  await call("POST", "/api/state", "", { baseVersion: 0, state: baseState(testUsers()) });
  const caja = await login("caja", "caja-pass");
  const denied = await call("POST", "/api/update/apply", caja.sessionToken);
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: "admin-required" });
});

test("los avisos solo llegan mientras la sesión sigue viva", async (t) => {
  const { call, login } = await startApi(t);
  await call("POST", "/api/state", "", { baseVersion: 0, state: baseState(testUsers()) });
  const admin = await login("admin", "admin-pass");
  const caja = await login("caja", "caja-pass");

  const stream = await call("GET", `/api/events?session=${caja.sessionToken}`);
  assert.equal(stream.status, 200);
  const hello = await readStream(stream, SECRET);
  assert.equal(hello.ended, false, "con sesión recibe el estado");

  const next = { ...admin.state, settings: { note: "primer-cambio" } };
  const first = await (await call("POST", "/api/state", admin.sessionToken, { baseVersion: admin.version, state: next })).json();
  const decoder = new TextDecoder();
  let received = "";
  while (!received.includes("primer-cambio")) {
    const { value, done } = await hello.reader.read();
    assert.equal(done, false);
    received += decoder.decode(value, { stream: true });
  }

  await call("POST", "/api/logout", caja.sessionToken);
  const second = { ...first.state, settings: { note: "cambio-tras-salir" } };
  assert.equal((await call("POST", "/api/state", admin.sessionToken, { baseVersion: first.version, state: second })).status, 200);
  let afterLogout = "";
  for (;;) {
    const { value, done } = await hello.reader.read();
    if (done) break;
    afterLogout += decoder.decode(value, { stream: true });
  }
  assert.equal(afterLogout.includes("cambio-tras-salir"), false, "el flujo se cierra sin enviar el cambio");
  assert.equal((await call("GET", "/api/state", caja.sessionToken)).status, 401);
});

test("cambiar la contraseña o desactivar a la persona termina su sesión", async (t) => {
  const { call, login } = await startApi(t);
  await call("POST", "/api/state", "", { baseVersion: 0, state: baseState(testUsers()) });
  const admin = await login("admin", "admin-pass");
  const caja = await login("caja", "caja-pass");
  assert.equal((await call("GET", "/api/state", caja.sessionToken)).status, 200);

  const nextUsers = admin.state.users.map((user) => (user.id === "caja" ? { ...user, password: "caja-nueva" } : user));
  const changed = await call("POST", "/api/state", admin.sessionToken, { baseVersion: admin.version, state: { ...admin.state, users: nextUsers } });
  assert.equal(changed.status, 200);
  assert.equal((await call("GET", "/api/state", caja.sessionToken)).status, 401);

  const current = await changed.json();
  const renewed = await login("caja", "caja-nueva");
  assert.equal((await call("GET", "/api/state", renewed.sessionToken)).status, 200);
  const inactive = current.state.users.map((user) => (user.id === "caja" ? { ...user, active: false } : user));
  assert.equal((await call("POST", "/api/state", admin.sessionToken, { baseVersion: current.version, state: { ...current.state, users: inactive } })).status, 200);
  assert.equal((await call("GET", "/api/state", renewed.sessionToken)).status, 401);
});

test("varios intentos fallidos bloquean ese usuario durante un minuto", async (t) => {
  const { call } = await startApi(t);
  await call("POST", "/api/state", "", { baseVersion: 0, state: baseState(testUsers()) });
  const attempt = (username, password) => call("POST", "/api/login", "", { username, password });
  for (let round = 0; round < 5; round += 1) assert.equal((await attempt("admin", "mala")).status, 401);
  assert.equal((await attempt("admin", "mala")).status, 429);
  const locked = await attempt("admin", "admin-pass");
  assert.equal(locked.status, 429, "ni la contraseña correcta entra durante el bloqueo");
  assert.equal(JSON.stringify(await locked.json()).includes(SECRET), false);
  assert.equal((await attempt("caja", "caja-pass")).status, 200, "los demás usuarios siguen entrando");
  assert.equal((await attempt("caja", "mala")).status, 401);
  assert.equal((await attempt("caja", "caja-pass")).status, 200, "entrar reinicia la cuenta de fallos");
});

test("el servidor real de Vite no entrega la carpeta de datos", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "librepos-vite-root-"));
  const dataDir = await mkdtemp(path.join(tmpdir(), "librepos-vite-data-"));
  await mkdir(path.join(root, ".librepos", "uber"), { recursive: true });
  await writeFile(path.join(root, ".librepos", "state.json"), JSON.stringify({ secret: SECRET }));
  await writeFile(path.join(root, ".librepos", "sync-token"), SECRET);
  await writeFile(path.join(root, ".librepos", "uber", "config.json"), JSON.stringify({ clientSecret: SECRET }));
  await writeFile(path.join(root, "index.html"), "<!doctype html><title>app</title>");
  await writeFile(path.join(root, "visible.txt"), "contenido visible");

  const previous = process.env.LIBREPOS_DATA_DIR;
  process.env.LIBREPOS_DATA_DIR = dataDir;
  const { createServer, loadConfigFromFile } = await import("vite");
  const loaded = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    undefined,
    "silent",
  );
  const start = async (plugins) => {
    const server = await createServer({
      ...loaded.config,
      plugins,
      configFile: false,
      root,
      logLevel: "silent",
      server: { ...loaded.config.server, host: "127.0.0.1", port: 0, strictPort: false, hmr: false, watch: null },
    });
    await server.listen();
    return server;
  };
  const full = await start(loaded.config.plugins);
  const denyOnly = await start([]);
  t.after(async () => {
    await full.close();
    await denyOnly.close();
    if (previous === undefined) delete process.env.LIBREPOS_DATA_DIR;
    else process.env.LIBREPOS_DATA_DIR = previous;
    await rm(root, { recursive: true, force: true });
    await rm(dataDir, { recursive: true, force: true });
  });

  const port = full.httpServer.address().port;
  const appPage = await rawGet(port, "/");
  assert.equal(appPage.status, 200);
  assert.equal((await rawGet(port, "/visible.txt")).body, "contenido visible", "el resto de archivos sigue disponible");

  for (const target of [
    "/.librepos/state.json",
    "/.librepos/sync-token",
    "/.librepos/uber/config.json",
    "/.librepos/state.json?raw",
    "/.librepos/state.json?url",
    "/.librepos/state.json?import",
    "/.librepos/state.json?import&raw",
    "/.librepos/state.json?inline",
    "/%2elibrepos/state.json",
    "/%252elibrepos/state.json",
    "/./.librepos/state.json",
    "/visible.txt/../.librepos/state.json",
    "/x/%2e%2e/.librepos/state.json",
    "//.librepos/state.json",
    "/.LIBREPOS/state.json",
    "/.librepos./state.json",
    "/.librepos/./state.json",
    "/.librepos/state.json/",
    `/@fs${root}/.librepos/state.json`,
    `/@fs${root}/.librepos/state.json?raw`,
    `/@fs${root}/.LIBREPOS/state.json`,
  ]) {
    const response = await rawGet(port, target);
    assert.equal(response.body.includes(SECRET), false, `${target} devolvió datos`);
    assert.notEqual(response.status, 200, target);
  }

  // Second layer on its own: Vite's deny list still protects the folder if the first check were removed.
  assert.ok(loaded.config.server.fs.deny.includes("**/.librepos/**"));
  assert.ok(loaded.config.server.fs.deny.includes("**/.git/**"), "conserva las reglas por defecto de Vite");
  const denyPort = denyOnly.httpServer.address().port;
  for (const target of ["/.librepos/state.json", "/.librepos/state.json?raw", "/.librepos/state.json?import", `/@fs${root}/.librepos/state.json`]) {
    assert.equal((await rawGet(denyPort, target)).body.includes(SECRET), false, `${target} (solo lista de Vite)`);
  }
});
