import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { localUserPassword } from "../src/user-credentials.js";

test("new installations retain their explicitly supplied default credential", () => {
  assert.equal(localUserPassword({ id: "admin", username: "admin", password: "admin" }), "admin");
  assert.equal(localUserPassword({ id: "cashier", password: "my-custom-password" }), "my-custom-password");
  assert.equal(localUserPassword({ id: "admin", username: "admin" }), "");
});

test("resynchronizing public users preserves the changed admin password on the server", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "librepos-credentials-test-"));
  const previousDataDir = process.env.LIBREPOS_DATA_DIR;
  process.env.LIBREPOS_DATA_DIR = dataDir;
  let createSyncMiddleware;
  try {
    ({ createSyncMiddleware } = await import(`../sync-store.js?credentials=${Date.now()}`));
  } finally {
    if (previousDataDir === undefined) delete process.env.LIBREPOS_DATA_DIR;
    else process.env.LIBREPOS_DATA_DIR = previousDataDir;
  }
  const middleware = createSyncMiddleware();
  const server = createServer((req, res) => {
    void middleware(req, res, () => res.end("test"));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const bootstrap = await fetch(origin);
  const cookie = bootstrap.headers.get("set-cookie").split(";")[0];
  const request = (endpoint, payload) => fetch(`${origin}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(payload),
  });
  const state = {
    settings: {},
    users: [{ id: "admin", username: "admin", name: "Administrator", role: "Administrador", functions: ["admin"], active: true, password: "changed-test-password" }],
    orders: [], sales: [], cancellations: [], inventory: [], ingredientCategories: [],
    inventoryMovements: [], expenses: [], menuProducts: [], extraCatalog: [], attendance: [], cashSessions: [],
  };
  const initialResponse = await request("/api/state", { baseVersion: 0, state });
  assert.equal(initialResponse.status, 200);
  const publicPayload = await initialResponse.json();
  assert.equal(Object.hasOwn(publicPayload.state.users[0], "password"), false);
  assert.equal(Object.hasOwn(publicPayload.state.users[0], "passwordHash"), false);

  publicPayload.state.users = publicPayload.state.users.map((user) => ({
    ...user,
    password: localUserPassword(user),
  }));
  const repeatResponse = await request("/api/state", { baseVersion: publicPayload.version, state: publicPayload.state });
  assert.equal(repeatResponse.status, 200);
  const accepted = await request("/api/login", { username: "admin", password: "changed-test-password" });
  assert.equal(accepted.status, 200, "the public-state round trip must not replace the saved credential");
  const rejected = await request("/api/login", { username: "admin", password: "admin" });
  assert.equal(rejected.status, 401, "the default password must stay disabled after a password change");
});
