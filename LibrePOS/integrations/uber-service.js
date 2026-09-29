import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { UberClient } from './uber-client.js';
import { normalizeUberOrder, mapUberOrder, acceptUberLocally, cancelUberLocally, completeUberLocally, reviseUberLocally, buildUberCommandText, isUberOrder } from '../src/uber-orders.js';

export const UBER_DEFAULTS = { enabled: false, environment: 'sandbox', storeId: '', clientId: '', clientSecret: '', publicWebhookUrl: '', autoAccept: false, autoPrint: false, taxMode: 'included', prepMinutes: 20, mappings: {} };
export const DENY_REASONS = ['STORE_CLOSED', 'POS_NOT_READY', 'POS_OFFLINE', 'ITEM_AVAILABILITY', 'MISSING_ITEM', 'MISSING_INFO', 'PRICING', 'CAPACITY', 'ADDRESS', 'SPECIAL_INSTRUCTIONS', 'OTHER'];
export const CANCEL_REASONS = ['OUT_OF_ITEMS', 'KITCHEN_CLOSED', 'CUSTOMER_CALLED_TO_CANCEL', 'RESTAURANT_TOO_BUSY', 'CANNOT_COMPLETE_CUSTOMER_NOTE', 'OTHER'];
const ORDER_EVENTS = new Set(['orders.notification', 'orders.scheduled.notification', 'orders.release', 'orders.failure', 'orders.cancel', 'orders.customer_order_edit', 'order.fulfillment_issues.resolved', 'orders.fulfillment_issues.resolved']);
const finalStates = new Set(['cancelled', 'delivered', 'denied']);
const orderContent = order => JSON.stringify([order.items.map(item => [item.mappingKey, item.name, item.optionsText, item.qty, item.total, item.note]), order.totals.total, order.totals.iva, order.discount.amount, order.comments]);

export async function atomicJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(temp, file);
}
export function verifyUberSignature(rawBody, signature, secret) {
  if (!secret || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function publicUberConfig(config) {
  const { clientSecret, ...safe } = config;
  return { ...safe, hasClientSecret: Boolean(clientSecret), apiVersion: 'Get Order v2 / Order actions v1', webhookPath: '/api/uber/webhook' };
}

export class UberService {
  constructor({ dataDir, getState, mutateState, print, client, demo = false, productionAllowed = false, now = () => new Date().toISOString() }) {
    this.configFile = path.join(dataDir, 'uber', 'config.json'); this.inboxFile = path.join(dataDir, 'uber', 'inbox.json');
    this.getState = getState; this.mutateState = mutateState; this.print = print; this.demo = demo; this.productionAllowed = productionAllowed; this.now = now;
    this.config = { ...UBER_DEFAULTS }; this.events = []; this.files = Promise.resolve(); this.actions = Promise.resolve(); this.lastPoll = 0;
    this.client = client || new UberClient(() => this.config);
  }
  async init() {
    if (!this.initializing) this.initializing = (async () => {
      try { this.config = { ...UBER_DEFAULTS, ...JSON.parse(await readFile(this.configFile, 'utf8')) }; } catch (e) { if (e.code !== 'ENOENT') throw e; }
      try { this.events = JSON.parse(await readFile(this.inboxFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (this.config.environment === 'production' && !this.productionAllowed) this.config.enabled = false;
      for (const event of this.events) if (event.status === 'processing') event.status = 'pending';
    })();
    await this.initializing;
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick().catch(error => { this.lastError = error.message; }), 3000); this.timer.unref?.();
  }
  stop() { clearInterval(this.timer); this.timer = null; }
  async persistInbox() {
    const snapshot = structuredClone(this.events);
    const pending = this.files.then(() => atomicJson(this.inboxFile, snapshot));
    this.files = pending.catch(() => {}); return pending;
  }
  async status() {
    await this.init();
    return { config: publicUberConfig(this.config), demo: this.demo, productionAllowed: this.productionAllowed, lastError: this.lastError || '',
      events: this.events.slice(-80).reverse().map(({ eventId, orderId, type, status, attempts, error, receivedAt }) => ({ eventId, orderId, type, status, attempts, error, receivedAt })) };
  }
  async configure(input) {
    await this.init();
    const environment = input.environment || this.config.environment;
    if (!['sandbox', 'production'].includes(environment)) throw new Error('Entorno Uber inválido.');
    if (environment === 'production' && !this.productionAllowed) throw new Error('Producción requiere UBER_ALLOW_PRODUCTION=true y validación previa con Uber.');
    if (this.demo && input.enabled) throw new Error('La demo utiliza pedidos simulados; conecta el sandbox en una instancia de pruebas separada.');
    const next = { ...this.config, environment, enabled: input.enabled === true, autoAccept: input.autoAccept === true, autoPrint: input.autoPrint === true,
      storeId: String(input.storeId || '').trim(), clientId: String(input.clientId || '').trim(),
      clientSecret: input.clientSecret ? String(input.clientSecret).trim() : this.config.clientSecret,
      publicWebhookUrl: String(input.publicWebhookUrl ?? this.config.publicWebhookUrl).trim(),
      taxMode: input.taxMode === 'excluded' ? 'excluded' : 'included', prepMinutes: Number(input.prepMinutes || 20),
      mappings: input.mappings ?? this.config.mappings };
    if (next.publicWebhookUrl) {
      let url; try { url = new URL(next.publicWebhookUrl); } catch { throw new Error('Introduce una URL HTTPS válida para el webhook.'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/api/uber/webhook') throw new Error('El webhook debe usar HTTPS y terminar en /api/uber/webhook, sin credenciales ni parámetros.');
      next.publicWebhookUrl = url.href;
    }
    if (!Number.isFinite(next.prepMinutes) || next.prepMinutes < 1 || next.prepMinutes > 120) throw new Error('Preparación: entre 1 y 120 minutos.');
    if (!next.mappings || typeof next.mappings !== 'object' || Array.isArray(next.mappings)) throw new Error('Las relaciones del catálogo deben ser un objeto JSON.');
    if (next.enabled && (!next.storeId || !next.clientId || !next.clientSecret)) throw new Error('Faltan tienda, client ID o client secret.');
    const state = await this.getState();
    const active = state?.orders.some(order => isUberOrder(order) && !finalStates.has(order.uber.state));
    const changesStore = next.storeId !== this.config.storeId || next.environment !== this.config.environment;
    if (changesStore && (active || this.events.some(event => ['pending', 'processing', 'retry'].includes(event.status)))) throw new Error('Finaliza los pedidos y eventos Uber antes de cambiar tienda o entorno.');
    if (changesStore && this.config.storeId) next.mappings = {};
    await atomicJson(this.configFile, next); this.config = next; this.client.cachedToken = null;
    return this.status();
  }
  async receive(raw, signature) {
    await this.init();
    if (!this.config.enabled) return { status: 503, error: 'Integración Uber desactivada.' };
    if (!verifyUberSignature(raw, signature, this.config.clientSecret)) return { status: 401, error: 'Firma Uber inválida.' };
    let payload; try { payload = JSON.parse(raw.toString('utf8')); } catch { return { status: 400, error: 'JSON inválido.' }; }
    const type = payload.event_type, eventId = payload.event_id;
    if (typeof eventId !== 'string' || !eventId || typeof type !== 'string') return { status: 400, error: 'Falta event_id o event_type.' };
    const existing = this.events.find(event => event.eventId === eventId);
    if (existing) { await this.persistInbox(); return { status: 200 }; }
    const orderId = payload.meta?.resource_id;
    if (ORDER_EVENTS.has(type) && (typeof orderId !== 'string' || !orderId || payload.meta?.user_id !== this.config.storeId)) return { status: 400, error: 'Pedido o tienda inválidos.' };
    const event = { eventId, type, environment: this.config.environment, orderId: orderId || '', storeId: payload.meta?.user_id || '', receivedAt: this.now(), attempts: 0, status: ORDER_EVENTS.has(type) ? 'pending' : 'ignored' };
    // Never fetch resource_href: IDs are resolved against our fixed Uber API host.
    this.events.push(event);
    if (type === 'store.deprovisioned' && payload.meta?.user_id === this.config.storeId) {
      this.config.enabled = false; this.lastError = 'Uber revocó el acceso a la tienda.'; await atomicJson(this.configFile, this.config);
    }
    await this.persistInbox(); return { status: 200 };
  }
  serialize(work) { const pending = this.actions.then(work); this.actions = pending.catch(() => {}); return pending; }
  async tick() {
    await this.init();
    if (this.ticking || !this.config.enabled) return;
    this.ticking = true;
    try { await this.serialize(async () => {
      const due = this.events.find(event => ['pending','retry'].includes(event.status) && (!event.retryAt || Date.parse(event.retryAt) <= Date.now()));
      if (due) {
        due.status = 'processing'; due.attempts++; await this.persistInbox();
        try { await this.processEvent(due); due.status = 'done'; due.error = ''; }
        catch (error) { due.error = error.message; due.status = due.attempts >= 8 ? 'failed' : 'retry'; due.retryAt = new Date(Date.now() + Math.min(60000, 1000 * 2 ** due.attempts)).toISOString(); }
        await this.persistInbox();
      }
      if (Date.now() - this.lastPoll > 60000) {
        this.lastPoll = Date.now();
        const state = await this.getState();
        const candidates = (state?.orders || []).filter(order => isUberOrder(order) && order.uber.storeId === this.config.storeId && (order.uber.environment || 'sandbox') === this.config.environment && !order.uber.simulated && order.uber.state !== 'cancelled' && order.uber.remoteState !== 'FINISHED' && Date.now() - Date.parse(order.uber.receivedAt) < 48 * 3600000);
        const offset = (this.pollCursor || 0) % (candidates.length || 1);
        const batch = [...candidates.slice(offset), ...candidates.slice(0, offset)].slice(0, 30);
        this.pollCursor = offset + batch.length;
        for (const order of batch) {
          try { await this.fetchOrder(order.uber.orderId); } catch (error) { this.lastError = error.message; }
        }
      }
      const state = await this.getState();
      for (const order of (state?.orders || []).filter(order => isUberOrder(order) && ['received','blocked'].includes(order.uber.state))) {
        if (this.config.autoAccept) { try { await this.accept(order.id, 'uber'); } catch (error) { this.lastError = error.message; } }
      }
      if (this.config.autoPrint) for (const order of (state?.orders || []).filter(order => isUberOrder(order) && order.status === 'open' && order.uber.printState === 'pending')) await this.printOrder(order.id, 'uber');
    }); } finally { this.ticking = false; }
  }
  async processEvent(event) {
    if (event.environment && (event.environment !== this.config.environment || event.storeId !== this.config.storeId)) return;
    if (['orders.failure','orders.cancel'].includes(event.type)) {
      await this.mutateState(state => {
        const order = state.orders.find(order => isUberOrder(order) && order.uber.orderId === event.orderId);
        if (order) cancelUberLocally(state, order, this.now(), 'Cancelación notificada por Uber.');
      }); return;
    }
    // A previously received cancellation is a tombstone even if delivery was out of order.
    if (this.events.some(e => e.orderId === event.orderId && ['orders.failure','orders.cancel'].includes(e.type))) return;
    await this.fetchOrder(event.orderId, event.type === 'orders.scheduled.notification', event.type === 'orders.release');
  }
  async fetchOrder(id, scheduled = false, release = false) {
    const raw = await this.client.order(id);
    if (raw.id !== id) throw new Error('Uber devolvió otro identificador de pedido.');
    if (raw.store?.id === this.config.storeId && ['CANCELED', 'CANCELLED', 'DENIED'].includes(raw.current_state)) {
      await this.mutateState(state => { const old = state.orders.find(order => order.uber?.orderId === id); if (old) cancelUberLocally(state, old, this.now(), `Estado confirmado por Uber: ${raw.current_state}`); });
      return;
    }
    try { await this.importOrder(raw, scheduled, release); }
    catch (error) {
      // Never let a previously accepted order continue cooking an unrecognized revision.
      await this.mutateState(state => {
        const old = state.orders.find(order => order.uber?.orderId === id);
        if (old && !['cancelled', 'denied'].includes(old.uber.state)) {
          old.uber.state = old.uber.commandedAt ? 'changed' : 'blocked';
          old.uber.issues = [error.message]; old.uber.pendingRevision = null;
        }
      });
      throw error;
    }
  }
  async importOrder(raw, scheduled = false, release = false) {
    const saved = (await this.getState())?.orders.find(order => order.uber?.orderId === raw.id);
    const imported = normalizeUberOrder(raw, { ...this.config, taxMode: saved?.uber.commandedAt ? saved.uber.taxMode : this.config.taxMode, now: this.now(), scheduled });
    await this.mutateState(state => {
      const old = state.orders.find(order => order.id === imported.id);
      if (this.events.some(e => e.orderId === raw.id && ['orders.failure','orders.cancel'].includes(e.type))) {
        if (old) cancelUberLocally(state, old, this.now(), 'Cancelación notificada por Uber.'); return;
      }
      if (!old) { state.orders.unshift(imported); mapUberOrder(imported, state, this.config.mappings); if (imported.uber.issues.length && !scheduled && imported.status === 'open') imported.uber.state = 'blocked'; }
      const order = old || imported;
      if (['CANCELED','CANCELLED','DENIED'].includes(raw.current_state)) { cancelUberLocally(state, order, this.now(), `Estado confirmado por Uber: ${raw.current_state}`); return; }
      if (order.uber.state === 'cancelled') return;
      const changed = old && orderContent(old) !== orderContent(imported);
      if (changed && old.uber.commandedAt) {
        old.uber.state = 'changed'; old.uber.issues = ['Uber cambió los productos. Revisa el pedido en Uber Eats antes de continuar.'];
        old.uber.pendingRevision = { items: imported.items, totals: imported.totals, comments: imported.comments, payment: imported.payment, discount: imported.discount };
      } else if (old && !old.uber.commandedAt && !finalStates.has(old.uber.state)) {
        Object.assign(old, { items: imported.items, totals: imported.totals, payment: imported.payment, comments: imported.comments, discount: imported.discount });
        mapUberOrder(old, state, this.config.mappings);
        old.uber.taxMode = this.config.taxMode;
        if (release || (!scheduled && old.uber.state !== 'scheduled')) old.uber.state = old.uber.issues.length ? 'blocked' : 'received';
      }
      order.uber.remoteState = raw.current_state; order.uber.lastSyncedAt = this.now();
      order.uber.readyAt = imported.uber.readyAt;
      order.uber.charges = imported.uber.charges; order.uber.promotions = imported.uber.promotions;
      if (raw.current_state === 'FINISHED' && order.uber.commandedAt && order.uber.state !== 'changed') completeUberLocally(state, order, this.now());
      if (raw.current_state === 'FINISHED' && !order.uber.commandedAt) { order.uber.state = 'completed_remote'; order.uber.issues.push('Uber finalizó el pedido antes de registrarlo en el POS. Revisa el catálogo y confirma su registro una sola vez.'); }
      if (raw.current_state === 'ACCEPTED' && !order.uber.commandedAt && order.uber.state !== 'scheduled') {
        Object.assign(order, { items: imported.items, totals: imported.totals, payment: imported.payment, comments: imported.comments, discount: imported.discount });
        if (!mapUberOrder(order, state, this.config.mappings).length) acceptUberLocally(state, order, this.now());
        else { order.status = 'open'; order.uber.state = 'blocked'; }
      }
    });
  }
  async accept(id, actor) {
    const before = await this.getState(); const found = before.orders.find(order => order.id === id);
    if (!found) throw new Error('Pedido no encontrado.');
    if (found.uber.commandedAt) return;
    if (!['received','blocked'].includes(found.uber.state)) throw new Error('Este pedido aún no puede aceptarse.');
    // Preflight is persisted so missing mappings are visible without accepting at Uber.
    await this.mutateState(state => { const order = state.orders.find(order => order.id === id); mapUberOrder(order, state, this.config.mappings); order.uber.state = order.uber.issues.length ? 'blocked' : 'received'; });
    await this.mutateState(async state => {
      const order = state.orders.find(order => order.id === id);
      if (mapUberOrder(order, state, this.config.mappings).length) throw new Error(order.uber.issues.join(' '));
      if (!order.uber.simulated) {
        const remote = await this.client.order(order.uber.orderId);
        const checked = normalizeUberOrder(remote, { ...this.config });
        if (orderContent(checked) !== orderContent(order)) throw new Error('El pedido cambió en Uber. Actualiza antes de aceptar.');
        if (remote.current_state !== 'ACCEPTED') {
          if (remote.current_state !== 'CREATED') throw new Error(`Uber indica ${remote.current_state}. Actualiza el pedido.`);
          await this.client.accept(order.uber.orderId, order.orderNumber, Math.floor(Date.now()/1000) + this.config.prepMinutes * 60);
        }
      }
      acceptUberLocally(state, order, this.now()); order.uber.history.at(-1).by = actor;
    });
  }
  async action(input, actor) {
    await this.init();
    return this.serialize(async () => {
      if (input.action === 'retry-event') { const event = this.events.find(e => e.eventId === input.eventId); if (!event) throw new Error('Evento no encontrado.'); event.status = 'pending'; event.attempts = 0; event.retryAt = ''; await this.persistInbox(); return; }
      const state = await this.getState(); const order = state.orders.find(order => isUberOrder(order) && order.id === input.orderId);
      if (!order) throw new Error('Pedido Uber no encontrado.');
      if (!order.uber.simulated && !this.config.enabled) throw new Error('Habilita la conexión Uber antes de gestionar pedidos.');
      if (input.action === 'refresh') { if (!order.uber.simulated) await this.fetchOrder(order.uber.orderId); return; }
      if (input.action === 'accept') return this.accept(order.id, actor);
      if (input.action === 'reconcile-finished') {
        if (order.uber.state !== 'completed_remote') throw new Error('Este pedido no necesita registro tardío.');
        if (!order.uber.simulated) await this.fetchOrder(order.uber.orderId);
        await this.mutateState(draft => {
          const current = draft.orders.find(o => o.id === order.id);
          if (current.uber.remoteState !== 'FINISHED' || current.uber.commandedAt) throw new Error('El estado cambió; consulta Uber.');
          if (mapUberOrder(current, draft, this.config.mappings).length) throw new Error(current.uber.issues.join(' '));
          acceptUberLocally(draft, current, this.now()); completeUberLocally(draft, current, this.now(), actor);
        }); return;
      }
      if (input.action === 'review-change') {
        if (order.uber.state !== 'changed') throw new Error('No hay cambios pendientes.');
        if (!order.uber.simulated) await this.fetchOrder(order.uber.orderId);
        await this.mutateState(draft => {
          const current = draft.orders.find(o => o.id === order.id);
          if (current.uber.state !== 'changed') throw new Error('El estado cambió; revisa el pedido actualizado.');
          reviseUberLocally(draft, current, this.config.mappings, this.now(), actor);
        }); return;
      }
      if (input.action === 'print') return this.printOrder(order.id, actor, true);
      if (input.action === 'deny' || input.action === 'cancel') {
        const deny = input.action === 'deny';
        const codes = deny ? DENY_REASONS : CANCEL_REASONS;
        if (!codes.includes(input.reason) || String(input.details || '').trim().length < 5) throw new Error('Selecciona un motivo y explica la decisión (mínimo 5 caracteres).');
        if (deny && order.uber.commandedAt) throw new Error('El pedido ya fue aceptado; usa Cancelar en Uber.');
        if (finalStates.has(order.uber.state)) throw new Error('El pedido ya finalizó.');
        if (!order.uber.simulated) await (deny ? this.client.deny(order.uber.orderId, input.reason, input.details) : this.client.cancel(order.uber.orderId, input.reason, input.details));
        await this.mutateState(draft => {
          const current = draft.orders.find(o => o.id === order.id);
          if (deny) { current.uber.state = 'denied'; current.status = 'cancelled'; current.uber.history.push({ at: this.now(), action: 'denied', by: actor, reason: input.details }); }
          else cancelUberLocally(draft, current, this.now(), input.details);
        }); return;
      }
      const transitions = { preparing: ['accepted'], ready: ['preparing'], delivered: ['ready'] };
      if (!transitions[input.action]?.includes(order.uber.state)) throw new Error('Transición de preparación inválida.');
      await this.mutateState(draft => {
        const current = draft.orders.find(o => o.id === order.id);
        if (input.action === 'delivered') completeUberLocally(draft, current, this.now(), actor);
        else { current.uber.state = input.action; current.uber.history.push({ at: this.now(), action: input.action, by: actor });
          for (const batch of current.commandBatches.filter(batch => !["cancelled", "delivered"].includes(batch.status))) { batch.status = input.action; batch.updatedAt = this.now(); batch.updatedBy = actor; batch[input.action === 'ready' ? 'readyAt' : 'startedAt'] = this.now(); }
        }
      });
    });
  }
  async connection() {
    await this.init();
    if (this.demo) throw new Error('La demo no conecta con Uber.');
    const store = await this.client.storeStatus();
    return { ok: true, store, checkedAt: this.now(), detail: 'OAuth y lectura de tienda correctos. Aún falta probar un pedido y su webhook.' };
  }
  async storeStatus(status, minutes = 30) {
    await this.init();
    if (!this.config.enabled || this.demo) throw new Error('Habilita la integración en una instancia de pruebas.');
    if (!['ONLINE', 'PAUSED'].includes(status)) throw new Error('Estado de tienda inválido.');
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) throw new Error('Duración de pausa inválida.');
    await this.client.setStoreStatus(status, status === 'PAUSED' ? new Date(Date.now() + minutes * 60000).toISOString() : undefined);
    return { ok: true, store: await this.client.storeStatus() };
  }
  async printOrder(id, actor, force = false) {
    const state = await this.getState(), order = state.orders.find(order => order.id === id);
    if (!order?.uber.commandedAt) throw new Error('Acepta el pedido antes de imprimir.');
    if (!force && order.uber.printState !== 'pending') return;
    const printer = state.settings.commandPrinterName;
    if (!printer) { await this.mutateState(draft => { const current = draft.orders.find(o => o.id === id); current.uber.printState = 'failed'; current.uber.printError = 'Configura la impresora de comandas.'; }); return; }
    await this.mutateState(draft => { draft.orders.find(o => o.id === id).uber.printState = 'printing'; });
    try {
      const printed = await this.print(printer, buildUberCommandText(order), state.settings);
      await this.mutateState(draft => { const current = draft.orders.find(o => o.id === id); current.uber.printState = 'printed'; current.uber.printError = ''; for (const batch of current.commandBatches) { batch.printedAt = printed.printedAt || this.now(); batch.printedBy = actor; } });
    } catch {
      await this.mutateState(draft => { const current = draft.orders.find(o => o.id === id); current.uber.printState = 'failed'; current.uber.printError = 'No se confirmó la impresión. Revisa el papel antes de reimprimir.'; });
    }
  }
  async simulate(raw) {
    if (!this.demo) throw new Error('Los pedidos simulados solo están disponibles en la demo aislada.');
    await this.init();
    this.config.storeId = 'librepos-demo-store';
    await atomicJson(this.configFile, this.config);
    await this.importOrder(raw);
    await this.mutateState(state => { state.orders.find(order => order.uber?.orderId === raw.id).uber.simulated = true; });
  }
}
