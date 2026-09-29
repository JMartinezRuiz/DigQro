import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { createUberWebhookGateway } from '../scripts/uber-webhook-gateway.js';

test('webhook-only gateway preserves bytes and signature; never proxies the POS or config', async t => {
  const calls = [], body = Buffer.from('{ "event_type": "orders.notification", "mensaje": "azúcar" }');
  const signature = createHmac('sha256', 'fake').update(body).digest('hex');
  const gateway = createUberWebhookGateway({ targetPort: 5175, fetcher: async (url, options) => { calls.push({ url, options }); return new Response(null, { status: 200 }); } });
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
  t.after(() => { gateway.closeAllConnections(); gateway.close(); });
  const origin = `http://127.0.0.1:${gateway.address().port}`;
  for (const target of ['/api/state', '/', '/api/uber/config', '/api/uber/webhook?url=http://evil.test']) assert.equal((await fetch(origin + target)).status, 404);
  assert.equal((await fetch(origin + '/api/uber/webhook', { method: 'POST', body })).status, 401);
  const response = await fetch(origin + '/api/uber/webhook', { method: 'POST', headers: { 'X-Uber-Signature': signature }, body });
  assert.equal(response.status, 200); assert.equal(await response.text(), ''); assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:5175/api/uber/webhook');
  assert.deepEqual(calls[0].options.body, body); assert.equal(calls[0].options.headers['X-Uber-Signature'], signature);
});

test('server requires real sessions/roles, persists simulated flows, protects Uber state and keeps secrets private', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'librepos-uber-http-'));
  const previousDir = process.env.LIBREPOS_DATA_DIR, previousDemo = process.env.VITE_LIBREPOS_DEMO;
  process.env.LIBREPOS_DATA_DIR = dir; process.env.VITE_LIBREPOS_DEMO = 'true';
  const { createSyncMiddleware } = await import(`../sync-store.js?uber=${Date.now()}`);
  if (previousDir === undefined) delete process.env.LIBREPOS_DATA_DIR; else process.env.LIBREPOS_DATA_DIR = previousDir;
  if (previousDemo === undefined) delete process.env.VITE_LIBREPOS_DEMO; else process.env.VITE_LIBREPOS_DEMO = previousDemo;
  const middleware = createSyncMiddleware(), server = createServer((req, res) => void middleware(req, res, () => res.end('test')));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { middleware.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`, cookie = (await fetch(origin)).headers.get('set-cookie').split(';')[0];
  const post = async (endpoint, body, token = '') => {
    const response = await fetch(origin + endpoint, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json', 'X-LibrePOS-Session': token }, body: JSON.stringify(body) });
    return { status: response.status, ...await response.json() };
  };
  const users = ['admin','caja','cocina','mesero'].map(role => ({ id: role, name: role, username: role, password: 'test-only', active: true, functions: [role] }));
  let snapshot = await post('/api/state', { baseVersion: 0, state: { settings: {}, users, orders: [], sales: [], cancellations: [], inventory: [], inventoryMovements: [], ingredientCategories: [], menuProducts: [], extraCatalog: [], attendance: [], cashSessions: [], expenses: [] } });
  assert.equal(snapshot.status, 200);
  const tokens = {};
  for (const role of ['admin','caja','cocina','mesero']) tokens[role] = (await post('/api/login', { username: role, password: 'test-only' })).sessionToken;
  assert.equal((await post('/api/uber/config', { userId: 'admin' })).status, 401);
  for (const role of ['caja', 'cocina', 'mesero']) {
    for (const endpoint of ['config', 'connection', 'store', 'demo']) {
      assert.equal((await post(`/api/uber/${endpoint}`, { userId: 'admin' }, tokens[role])).status, 403);
    }
  }
  assert.equal((await post('/api/uber/demo', {}, tokens.mesero)).status, 403);
  assert.equal((await post('/api/uber/config', { enabled: false, clientSecret: 'fake-secret', clientId: 'private-client-id', publicWebhookUrl: 'https://webhook.example.test/api/uber/webhook', storeId: 'librepos-demo-store' }, tokens.admin)).status, 200);
  assert.equal((await stat(path.join(dir, 'uber/config.json'))).mode & 0o077, 0);
  const configResponse = await fetch(origin + '/api/uber/status', { headers: { cookie, 'X-LibrePOS-Session': tokens.admin } });
  assert.doesNotMatch(await configResponse.text(), /fake-secret/);
  for (const role of ['caja', 'cocina']) {
    const response = await fetch(origin + '/api/uber/status', { headers: { cookie, 'X-LibrePOS-Session': tokens[role] } });
    assert.equal(response.status, 200);
    assert.doesNotMatch(await response.text(), /fake-secret|private-client-id|webhook.example.test|librepos-demo-store/);
  }
  snapshot = await post('/api/uber/demo', {}, tokens.admin);
  assert.equal(snapshot.status, 200); assert.equal(snapshot.state.orders.length, 1);
  const id = snapshot.state.orders[0].id;
  assert.equal((await post('/api/uber/action', { action: 'accept', orderId: id }, tokens.cocina)).status, 403);
  snapshot = await post('/api/uber/action', { action: 'accept', orderId: id }, tokens.caja);
  assert.equal(snapshot.status, 200); assert.equal(snapshot.state.inventory[0].qty, 98);
  assert.equal((await post('/api/uber/action', { action: 'cancel', orderId: id }, tokens.cocina)).status, 403);
  const oldVersion = snapshot.version;
  for (const action of ['preparing', 'ready']) assert.equal((await post('/api/uber/action', { action, orderId: id }, tokens.cocina)).status, 200);
  assert.equal((await post('/api/uber/action', { action: 'delivered', orderId: id }, tokens.cocina)).status, 403);
  snapshot = await post('/api/uber/action', { action: 'delivered', orderId: id }, tokens.caja);
  assert.equal(snapshot.state.sales.length, 1); assert.equal(snapshot.state.sales[0].payment.cashDue, 0);
  assert.equal((await post('/api/state', { baseVersion: oldVersion, state: snapshot.state }, tokens.admin)).status, 409);
  const forged = structuredClone(snapshot.state); forged.sales[0].paymentMethod = 'Tarjeta';
  assert.equal((await post('/api/state', { baseVersion: snapshot.version, state: forged }, tokens.admin)).status, 403);
  const changedSettings = structuredClone(snapshot.state); changedSettings.settings.note = 'ordinary setting still saves';
  assert.equal((await post('/api/state', { baseVersion: snapshot.version, state: changedSettings }, tokens.admin)).status, 200);
  const saved = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8'));
  assert.equal(saved.state.sales[0].paymentMethod, 'Uber'); assert.doesNotMatch(JSON.stringify(saved), /fake-secret/);
  await post('/api/logout', {}, tokens.admin);
  assert.equal((await post('/api/uber/config', {}, tokens.admin)).status, 401);
});
