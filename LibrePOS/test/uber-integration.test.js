import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { UberService, verifyUberSignature } from '../integrations/uber-service.js';
import { UberClient } from '../integrations/uber-client.js';
import { demoUberOrder } from '../integrations/uber-demo.js';
import { normalizeUberOrder, mapUberOrder, modifierKey, acceptUberLocally, cancelUberLocally, completeUberLocally, reviseUberLocally, buildUberCommandText } from '../src/uber-orders.js';
import { summarizePayments, correctSalePayment } from '../src/payment-records.js';
import { uberStateChangeError } from '../integrations/uber-guard.js';

const storeId = 'librepos-demo-store';
const money = amount => ({ amount, currency_code: 'MXN' });
const now = '2026-09-28T18:00:00.000Z';
const mappings = { 'demo-cafe-uber|': { productId: 'coffee', selections: {}, extraIds: [] } };
const stateFixture = () => ({ settings: { commandPrinterName: 'FAKE' }, users: [], orders: [], sales: [], cancellations: [], inventoryMovements: [],
  inventory: [{ id: 'stock-coffee', name: 'CAFÉ DE PRUEBA', qty: 100, unitCost: 10, unit: 'PZ' }],
  menuProducts: [{ id: 'coffee', name: 'Café de prueba', price: 10, options: [], recipe: [{ itemId: 'stock-coffee', name: 'CAFÉ DE PRUEBA', qty: 1 }] }],
  extraCatalog: [], cashSessions: [{ id: 'cash', status: 'open', openedAt: now, openingCash: 500 }], expenses: [], ingredientCategories: [], attendance: [] });
const normalized = id => normalizeUberOrder(demoUberOrder(id || 'order-1'), { storeId, now });
const signature = (body, secret = 'fake-secret') => createHmac('sha256', secret).update(body).digest('hex');
const eventBody = (id, type = 'orders.notification', orderId = 'order-1') => Buffer.from(JSON.stringify({ event_id: id, event_type: type, meta: { resource_id: orderId, user_id: storeId }, resource_href: 'http://internal.example/never-fetch' }));

async function harness(t) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'uber-test-'));
  let state = stateFixture(), saves = 0, printed = 0, accepts = 0, cancelCalls = 0;
  const raw = demoUberOrder('order-1');
  const client = {
    order: async id => { assert.equal(id, raw.id); return structuredClone(raw); },
    accept: async () => { accepts++; raw.current_state = 'ACCEPTED'; },
    deny: async () => {}, cancel: async () => { cancelCalls++; raw.current_state = 'CANCELED'; },
  };
  const hooks = { dataDir, getState: async () => structuredClone(state), mutateState: async work => { const next = structuredClone(state); await work(next); state = next; saves++; },
    print: async () => { printed++; return { printedAt: now }; }, client, now: () => now };
  const service = new UberService(hooks);
  await service.configure({ enabled: true, storeId, clientId: 'fake-client', clientSecret: 'fake-secret', mappings, environment: 'sandbox' });
  t.after(async () => { service.stop(); await rm(dataDir, { recursive: true, force: true }); });
  return { service, hooks, raw, client, dataDir, get state() { return state; }, get accepts() { return accepts; }, get printed() { return printed; }, get saves() { return saves; }, get cancelCalls() { return cancelCalls; } };
}

test('v2 preserves Uber prices and notes; payment never requests physical cash', () => {
  const order = normalized();
  assert.equal(order.items[0].unitPrice, 40);
  assert.equal(order.totals.total, 80); assert.equal(order.totals.iva, 11.03);
  assert.equal(order.paymentMethod, 'Uber'); assert.equal(order.payment.cashDue, 0); assert.equal(order.payment.cardDue, 0);
  assert.match(buildUberCommandText(order), /PAGO UBER - NO COBRAR/);
  assert.match(buildUberCommandText(order), /Sin azúcar/);
  assert.match(buildUberCommandText(order), /Preparar para llevar/);
});
test('tax-exclusive prices and merchant promotions reconcile to line gross once', () => {
  const raw = demoUberOrder('tax');
  raw.payment.charges.sub_total_promo_applied = money(7200);
  raw.payment.charges.tax_promo_applied = money(993);
  const included = normalizeUberOrder(raw, { storeId });
  const excluded = normalizeUberOrder(raw, { storeId, taxMode: 'excluded' });
  assert.equal(included.totals.total, 72); assert.equal(included.discount.amount, 8);
  assert.equal(excluded.totals.total, 81.93); assert.equal(excluded.items[0].total, 91.03);
  assert.equal(excluded.discount.amount, 9.10);
});
test('unsupported cash, currency, store, delivery or malformed totals stop import', () => {
  const cases = [raw => raw.payment.charges.cash_amount_due = money(1), raw => raw.payment.charges.sub_total.currency_code = 'USD',
    raw => raw.store.id = 'other', raw => raw.type = 'DELIVERY_BY_RESTAURANT', raw => raw.cart.items[0].quantity = 1.5,
    raw => raw.payment.charges.sub_total.amount = 9000];
  for (const mutate of cases) { const raw = demoUberOrder('bad'); mutate(raw); assert.throws(() => normalizeUberOrder(raw, { storeId })); }
});
test('nested modifiers keep readable instructions and exact variant identities', () => {
  const raw = demoUberOrder('variants'), line = raw.cart.items[0];
  line.selected_modifier_groups = [{ id: 'g', title: 'Tamaño', selected_items: [{ id: 'large', title: 'Grande', quantity: 1,
    selected_modifier_groups: [{ id: 'milk', title: 'Leche', selected_items: [{ id: 'oat', title: 'Avena', quantity: 2 }] }] }] }];
  const order = normalizeUberOrder(raw, { storeId });
  assert.match(order.items[0].optionsText, /Leche: Avena ×2/);
  assert.equal(modifierKey(line), 'demo-cafe-uber|g/large*1|g/large/milk/oat*2');
  assert.notEqual(modifierKey(line), 'demo-cafe-uber|');
  assert.equal(mapUberOrder(order, stateFixture(), mappings).length, 1);
});
test('mapping enforces variants, stock and recipe snapshots without changing remote prices', () => {
  const state = stateFixture(), order = normalized();
  assert.deepEqual(mapUberOrder(order, state, mappings), []);
  assert.equal(order.items[0].unitPrice, 40); assert.equal(order.items[0].unitCostSnapshot, 10);
  state.inventory[0].qty = 1;
  assert.match(mapUberOrder(order, state, mappings).join(), /insuficiente/);
  mapUberOrder(order, state, {}); assert.deepEqual(order.items[0].inventoryUsage, [], 'invalid remapping clears stale deductions');
  state.menuProducts[0].options = [{ id: 'size', type: 'single', required: true, choices: [{ label: 'Grande' }] }];
  assert.match(mapUberOrder(order, state, mappings).join(), /variante/);
});
test('accept/complete/retries deduct inventory and create sale exactly once; Uber excluded from cash', () => {
  const state = stateFixture(), order = normalized(); state.orders.push(order);
  mapUberOrder(order, state, mappings);
  acceptUberLocally(state, order, now); acceptUberLocally(state, order, now);
  assert.equal(state.inventory[0].qty, 98); assert.equal(state.inventoryMovements.length, 1); assert.equal(state.sales.length, 0);
  completeUberLocally(state, order, now); completeUberLocally(state, order, now);
  assert.equal(state.sales.length, 1); assert.equal(state.sales[0].cashSessionId, 'cash');
  const totals = summarizePayments([...state.sales, { paymentMethod: 'Tarjeta', totals: { total: 15 } }, { paymentMethod: 'Efectivo', totals: { total: 20 } }], { subtotal: sale => sale.totals.total, tip: () => 0 });
  assert.equal(totals.cash, 20); assert.equal(totals.card, 15); assert.equal(totals.uber, 80); assert.equal(totals.total, 115);
  assert.throws(() => correctSalePayment(state.sales[0], {}, {}), /pago Uber/);
});
test('cancellation restores untouched ingredients once and retains already prepared consumption', () => {
  for (const prepared of [false, true]) {
    const state = stateFixture(), order = normalized(); state.orders.push(order); mapUberOrder(order, state, mappings); acceptUberLocally(state, order, now);
    if (prepared) order.commandBatches[0].status = 'preparing';
    cancelUberLocally(state, order, now, 'cancel'); cancelUberLocally(state, order, now, 'duplicate');
    assert.equal(state.inventory[0].qty, prepared ? 98 : 100); assert.equal(state.cancellations.length, 1); assert.equal(state.sales.length, 0);
  }
});
test('revisions reconcile ingredient deltas and closed Uber amounts without affecting counted cash', () => {
  const state = stateFixture(), order = normalized(); state.orders.push(order); mapUberOrder(order, state, mappings); acceptUberLocally(state, order, now);
  completeUberLocally(state, order, now);
  Object.assign(state.cashSessions[0], { status: 'closed', uberSales: 80, totalSales: 80, expectedCash: 500, countedCash: 500, iva: 11.03 });
  const raw = demoUberOrder('order-1'); raw.cart.items[0].quantity = 3; raw.cart.items[0].price.total_price = money(12000); raw.payment.charges.sub_total = money(12000);
  const revision = normalizeUberOrder(raw, { storeId });
  order.uber.pendingRevision = { items: revision.items, totals: revision.totals, payment: revision.payment, discount: revision.discount, comments: revision.comments };
  reviseUberLocally(state, order, mappings, now, 'admin');
  assert.equal(state.inventory[0].qty, 97); assert.equal(state.sales.length, 1); assert.equal(state.sales[0].totals.total, 120);
  assert.equal(state.cashSessions[0].uberSales, 120); assert.equal(state.cashSessions[0].totalSales, 120); assert.equal(state.cashSessions[0].countedCash, 500); assert.equal(state.cashSessions[0].expectedCash, 500);
});
test('signature authenticates exact raw bytes, rejects invalid length and changed bodies', () => {
  const body = eventBody('sig'), signed = signature(body);
  assert.equal(verifyUberSignature(body, signed, 'fake-secret'), true);
  for (const bad of ['', 'bad', signed.toUpperCase(), 'a'.repeat(62)]) assert.equal(verifyUberSignature(body, bad, 'fake-secret'), false);
  assert.equal(verifyUberSignature(Buffer.concat([body, Buffer.from(' ')]), signed, 'fake-secret'), false);
});
test('webhook ACK is durable before processing, deduplicates across restart and ignores hostile href', async t => {
  const h = await harness(t), body = eventBody('event-1');
  assert.equal((await h.service.receive(body, 'bad')).status, 401);
  assert.equal((await h.service.receive(body, signature(body))).status, 200);
  assert.equal(h.state.orders.length, 0);
  assert.equal(JSON.parse(await readFile(path.join(h.dataDir, 'uber/inbox.json'), 'utf8')).length, 1);
  const restarted = new UberService(h.hooks); await restarted.init();
  assert.equal((await restarted.receive(body, signature(body))).status, 200); assert.equal(restarted.events.length, 1);
  await restarted.tick(); assert.equal(h.state.orders.length, 1); assert.equal(restarted.events[0].status, 'done');
  assert.equal(h.state.inventory[0].qty, 100, 'manual receipt does not consume stock');
});
test('notification retries cannot double-accept or print; API timeout is reconciled from remote ACCEPTED', async t => {
  const h = await harness(t); await h.service.importOrder(h.raw);
  h.client.accept = async () => { h.raw.current_state = 'ACCEPTED'; throw new Error('timeout after Uber accepted'); };
  await assert.rejects(h.service.action({ orderId: 'uber-order-1', action: 'accept' }, 'admin'), /timeout/);
  assert.equal(h.state.inventory[0].qty, 100);
  await h.service.fetchOrder('order-1'); await h.service.fetchOrder('order-1');
  assert.equal(h.state.inventory[0].qty, 98);
  await h.service.printOrder('uber-order-1', 'uber'); await h.service.printOrder('uber-order-1', 'uber');
  assert.equal(h.printed, 1);
  for (const action of ['preparing', 'ready', 'delivered']) await h.service.action({ orderId: 'uber-order-1', action }, 'admin');
  await assert.rejects(h.service.action({ orderId: 'uber-order-1', action: 'delivered' }, 'admin'));
  assert.equal(h.state.sales.length, 1);
});
test('accept preflight prevents remote acceptance without matching catalog or stock', async t => {
  const h = await harness(t); h.service.config.mappings = {}; await h.service.importOrder(h.raw);
  await assert.rejects(h.service.action({ orderId: 'uber-order-1', action: 'accept' }, 'admin'), /Relaciona/);
  assert.equal(h.accepts, 0); assert.equal(h.state.inventory[0].qty, 100); assert.equal(h.state.orders[0].uber.state, 'blocked');
});
test('scheduled orders cannot enter kitchen until orders.release', async t => {
  const h = await harness(t); await h.service.importOrder(h.raw, true);
  await assert.rejects(h.service.action({ orderId: 'uber-order-1', action: 'accept' }, 'admin'), /aún/);
  await h.service.processEvent({ type: 'orders.release', orderId: 'order-1' });
  await h.service.action({ orderId: 'uber-order-1', action: 'accept' }, 'admin'); assert.equal(h.accepts, 1);
});
test('out-of-order cancellation is a tombstone; late notification cannot resurrect order', async t => {
  const h = await harness(t);
  for (const [id, type] of [['cancel', 'orders.cancel'], ['notify', 'orders.notification']]) {
    const body = eventBody(id, type); await h.service.receive(body, signature(body));
  }
  await h.service.tick(); await h.service.tick();
  assert.equal(h.state.orders.length, 0); assert.equal(h.state.inventory[0].qty, 100);
});
test('manual tablet acceptance after POS denial is reconciled without a duplicate', async t => {
  const h = await harness(t); await h.service.importOrder(h.raw);
  await h.service.action({ orderId: 'uber-order-1', action: 'deny', reason: 'OTHER', details: 'Prueba rechazo' }, 'admin');
  h.raw.current_state = 'ACCEPTED'; await h.service.fetchOrder('order-1'); await h.service.fetchOrder('order-1');
  assert.equal(h.state.orders[0].status, 'open'); assert.equal(h.state.orders[0].uber.state, 'accepted'); assert.equal(h.state.inventory[0].qty, 98);
});
test('remote edits hold cooking and monetary data until explicit review', async t => {
  const h = await harness(t); await h.service.importOrder(h.raw); await h.service.action({ orderId: 'uber-order-1', action: 'accept' }, 'admin');
  h.raw.cart.special_instructions = 'Atención alergia: avisar a cocina'; await h.service.fetchOrder('order-1');
  assert.equal(h.state.orders[0].uber.state, 'changed');
  await assert.rejects(h.service.action({ orderId: 'uber-order-1', action: 'preparing' }, 'admin'));
  await h.service.action({ orderId: 'uber-order-1', action: 'review-change' }, 'admin');
  assert.match(h.state.orders[0].comments, /alergia/); assert.equal(h.state.inventory[0].qty, 98);
});
test('late FINISHED notification requires deliberate reconciliation and skips kitchen', async t => {
  const h = await harness(t); h.raw.current_state = 'FINISHED'; await h.service.importOrder(h.raw);
  assert.equal(h.state.orders[0].uber.state, 'completed_remote'); assert.equal(h.state.sales.length, 0);
  await h.service.action({ orderId: 'uber-order-1', action: 'reconcile-finished' }, 'admin');
  assert.equal(h.state.sales.length, 1); assert.equal(h.state.inventory[0].qty, 98); assert.equal(h.state.orders[0].status, 'closed');
});
test('secrets stay server-side and production requires an explicit server setting', async t => {
  const h = await harness(t), status = await h.service.status();
  assert.equal(status.config.clientSecret, undefined); assert.equal(status.config.hasClientSecret, true);
  assert.doesNotMatch(JSON.stringify(status), /fake-secret/);
  await assert.rejects(h.service.configure({ ...status.config, environment: 'production' }), /Producción/);
  await h.service.configure({ ...status.config, enabled: false, clientSecret: '' });
  assert.equal(h.service.config.clientSecret, 'fake-secret');
  const body = eventBody('disabled'); assert.equal((await h.service.receive(body, signature(body))).status, 503);
});
test('developer webhook URL is validated, persisted and never replaces the fixed API host', async t => {
  const h = await harness(t), { config } = await h.service.status();
  const url = 'https://webhook.example.test/api/uber/webhook';
  await h.service.configure({ ...config, publicWebhookUrl: `  ${url}  ` });
  assert.equal((await h.service.status()).config.publicWebhookUrl, url);
  assert.equal(JSON.parse(await readFile(h.service.configFile, 'utf8')).publicWebhookUrl, url);
  for (const invalid of ['not-a-url', 'http://example.test/api/uber/webhook', 'https://user:pass@example.test/api/uber/webhook', 'https://example.test/api/state', url + '?token=secret', url + '#fragment']) {
    await assert.rejects(h.service.configure({ ...config, publicWebhookUrl: invalid }), /webhook/i);
    assert.equal(h.service.config.publicWebhookUrl, url);
  }
  const { publicWebhookUrl, ...oldClientConfig } = config;
  await h.service.configure(oldClientConfig);
  assert.equal(h.service.config.publicWebhookUrl, url);
  assert.equal(h.service.config.clientSecret, 'fake-secret');
  await h.service.configure({ ...config, publicWebhookUrl: '' });
  assert.equal((await h.service.status()).config.publicWebhookUrl, '');
});
test('generic state saves cannot forge, delete or reclassify Uber but can record receipt printing', () => {
  const before = stateFixture(), order = normalized(); before.orders.push(order); before.sales.push({ ...structuredClone(order), id: 'sale' });
  for (const mutate of [s => s.orders = [], s => s.sales = [], s => s.sales[0].paymentMethod = 'Efectivo', s => s.orders[0].items[0].qty++, s => s.sales[0].source = 'pos']) {
    const next = structuredClone(before); mutate(next); assert.ok(uberStateChangeError(before, next));
  }
  const next = structuredClone(before); next.sales[0].postpaidReceiptPrintedAt = now; assert.equal(uberStateChangeError(before, next), '');
  assert.ok(uberStateChangeError(stateFixture(), before));
});
test('OAuth uses sandbox, refreshes on 401 and calls only fixed documented endpoints', async () => {
  const urls = [], config = { clientId: 'client', clientSecret: 'secret', environment: 'sandbox', storeId: 'store/id' };
  let orderCalls = 0;
  const client = new UberClient(() => config, async (url, options) => {
    urls.push({ url, options });
    if (url.includes('oauth')) return new Response(JSON.stringify({ access_token: 'fake-token', expires_in: 3600 }));
    if (url.includes('/v2/') && orderCalls++ === 0) return new Response('', { status: 401 });
    return options.method === 'POST' ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ id: 'abc', status: 'ONLINE' }));
  });
  await client.order('abc'); await client.accept('abc', 'UE-abc', 123); await client.deny('abc', 'OTHER', 'test'); await client.cancel('abc', 'OTHER', 'test'); await client.setStoreStatus('PAUSED', now); await client.storeStatus();
  assert.equal(urls.filter(row => row.url.includes('oauth')).length, 4, 'normal token refresh plus separate store-write scope');
  assert.ok(urls.every(row => row.url.startsWith('https://test-api.uber.com/') || row.url === 'https://sandbox-login.uber.com/oauth/v2/token'));
  assert.ok(urls.some(row => row.url.endsWith('/v1/eats/store/store%2Fid/status')));
  assert.ok(urls.some(row => row.options.body instanceof URLSearchParams && row.options.body.get('scope') === 'eats.store.status.write'));
  assert.deepEqual(JSON.parse(urls.find(row => row.url.endsWith('/accept_pos_order')).options.body).fields_relayed, { order_special_instructions: true, item_special_instructions: true, promotions: true });
});

test('structured allergies survive on the kitchen ticket; fees, substitutions and another manager require review', () => {
  const raw = demoUberOrder('special');
  raw.cart.items[0].special_requests = [{ allergy: { allergens_to_exclude: [{ type: 'MILK' }, { type: 'OTHER', freeform_text: 'Canela' }], allergy_instructions: 'Consultar antes de preparar' } }];
  const order = normalizeUberOrder(raw, { storeId });
  assert.match(buildUberCommandText(order), /ALERGIA: MILK · Canela · Consultar antes de preparar/);
  for (const mutate of [r => r.payment.charges.bag_fee = money(500), r => r.cart.fulfillment_issues = [{ fulfillment_issue_type: 'OUT_OF_ITEM' }], r => r.order_manager_client_id = 'other-pos']) {
    const changed = structuredClone(raw); mutate(changed); assert.throws(() => normalizeUberOrder(changed, { storeId, clientId: 'ours' }));
  }
});
test('unsupported revised payload holds an existing kitchen order instead of silently continuing', async t => {
  const h = await harness(t); await h.service.importOrder(h.raw); await h.service.action({ orderId: 'uber-order-1', action: 'accept' }, 'admin');
  h.raw.cart.fulfillment_issues = [{ fulfillment_issue_type: 'OUT_OF_ITEM' }];
  await assert.rejects(h.service.fetchOrder('order-1'), /sustituciones/);
  assert.equal(h.state.orders[0].uber.state, 'changed'); assert.equal(h.state.inventory[0].qty, 98); assert.equal(h.state.sales.length, 0);
});
test('base recipe and repeated extras aggregate one inventory movement; reordered local variants block acceptance', () => {
  const state = stateFixture(), order = normalized();
  state.extraCatalog = [{ id: 'extra', name: 'Café extra', inventoryItemId: 'stock-coffee', inventoryItemName: 'CAFÉ DE PRUEBA', qty: 1 }];
  const relations = { 'demo-cafe-uber|': { productId: 'coffee', selections: {}, extraIds: ['extra'], extraQuantities: { extra: 2 } } };
  assert.deepEqual(mapUberOrder(order, state, relations), []); acceptUberLocally(state, order, now);
  assert.equal(state.inventory[0].qty, 94); assert.equal(state.inventoryMovements.length, 1);
  state.menuProducts[0].options = [{ id: 'size', label: 'Tamaño', type: 'single', required: true, choices: [{ label: 'Chico' }, { label: 'Grande' }] }];
  relations['demo-cafe-uber|'] = { productId: 'coffee', selections: { size: 0 }, choiceLabels: { size: ['Grande'] } };
  assert.match(mapUberOrder(normalized(), state, relations).join(), /Cambió la variante/);
});
