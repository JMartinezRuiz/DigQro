import { isUberOrder, UBER_STATES, uberCatalog } from './uber-orders.js';
import { isPermissionsAdmin, userFunctions } from './user-permissions.js';
import './uber.css';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);
const time = value => value ? new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Por confirmar';
const finished = order => ['delivered', 'cancelled', 'denied'].includes(order.uber.state);
let tab = 'orders', draft = null, errorText = '', busy = false, showHistory = false;
const opened = new Set();
const mappingDrafts = new Map();
const denialReasons = { STORE_CLOSED: 'Tienda cerrada', POS_NOT_READY: 'POS no preparado', ITEM_AVAILABILITY: 'Producto no disponible', PRICING: 'Precio incorrecto', CAPACITY: 'Cocina saturada', SPECIAL_INSTRUCTIONS: 'No podemos cumplir las notas', OTHER: 'Otro motivo' };
const cancelReasons = { OUT_OF_ITEMS: 'Sin productos', KITCHEN_CLOSED: 'Cocina cerrada', CUSTOMER_CALLED_TO_CANCEL: 'Cancelación solicitada por cliente', RESTAURANT_TOO_BUSY: 'Cocina saturada', CANNOT_COMPLETE_CUSTOMER_NOTE: 'No podemos cumplir las notas', OTHER: 'Otro motivo' };
export function resetUberPanel() { draft = null; mappingDrafts.clear(); opened.clear(); errorText = ''; tab = 'orders'; showHistory = false; }
export function clearUberConfigDraft() { draft = null; }

function button(action, label, order, style = 'secondary-button') {
  return `<button type="button" class="${style} compact" data-uber-action="${action}" data-order-id="${esc(order.id)}" ${busy ? 'disabled' : ''}>${label}</button>`;
}
function mappingForm(line, state, config) {
  const mapping = mappingDrafts.get(line.mappingKey) || config.mappings?.[line.mappingKey] || {};
  const catalog = uberCatalog(state).filter(product => product.active !== false);
  const product = catalog.find(product => product.id === mapping.productId);
  return `<form class="uber-mapping" data-uber-mapping="${esc(line.mappingKey)}">
    <h4>Relacionar ${esc(line.name)}</h4><p>${esc(line.optionsText || 'Sin modificadores')}</p>
    <label class="field"><span>Producto del POS</span><select name="productId" required data-uber-product><option value="">Seleccionar producto</option>${catalog.map(p => `<option value="${esc(p.id)}" ${p.id === mapping.productId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    ${(product?.options || []).map(option => option.type === 'multi'
      ? `<fieldset><legend>${esc(option.label)}</legend>${option.choices.map((choice, index) => `<label><input type="checkbox" name="option:${esc(option.id)}" value="${index}" ${(mapping.selections?.[option.id] || []).includes(index) ? 'checked' : ''} ${choice.active === false ? 'disabled' : ''}> ${esc(choice.label)}</label>`).join('')}</fieldset>`
      : `<label class="field"><span>${esc(option.label)}</span><select name="option:${esc(option.id)}" required><option value="">Seleccionar variante</option>${option.choices.map((choice, index) => `<option value="${index}" ${mapping.selections?.[option.id] === index ? 'selected' : ''} ${choice.active === false ? 'disabled' : ''}>${esc(choice.label)}</option>`).join('')}</select></label>`).join('')}
    ${(state.extraCatalog || []).some(extra => extra.active !== false) ? `<label class="field"><span>Extras locales incluidos (Ctrl / ⌘ para varios)</span><select name="extraIds" multiple>${state.extraCatalog.filter(extra => extra.active !== false).map(extra => `<option value="${esc(extra.id)}" ${(mapping.extraIds || []).includes(extra.id) ? 'selected' : ''}>${esc(extra.name)}</option>`).join('')}</select></label>` : ''}
    ${(mapping.extraIds || []).map(id => `<label class="field"><span>Cantidad por producto: ${esc(state.extraCatalog.find(extra => extra.id === id)?.name || id)}</span><input type="number" min="1" max="99" name="extra:${esc(id)}" value="${esc(mapping.extraQuantities?.[id] || 1)}" required></label>`).join('')}
    <p>Se guarda para esta combinación exacta de producto y modificadores Uber. Se conserva el precio de Uber y se usa la receta del POS.</p>
    <button class="primary-button compact" ${busy || !product ? 'disabled' : ''}>Guardar relación</button>
  </form>`;
}

function orderCard(order, state, config, user) {
  const admin = isPermissionsAdmin(user), cash = userFunctions(user).includes('caja'), stage = order.uber.state;
  const canManage = admin || cash;
  const active = !finished(order);
  const issues = order.uber.issues || [];
  return `<article class="uber-order ${issues.length ? 'needs-review' : ''}" data-uber-order="${esc(order.id)}">
    <div class="uber-card-heading"><div><span class="uber-badge">Uber Eats${order.uber.simulated ? ' · Simulado' : ''}</span><h3>#${esc(order.uber.displayId)} <small>${esc(order.customerName)}</small></h3></div><span class="uber-state">${esc(UBER_STATES[stage] || stage)}</span></div>
    <p class="uber-time">Recibido ${esc(time(order.uber.receivedAt))} · Recoger ${esc(time(order.uber.readyAt))}</p>
    <ul class="uber-items">${order.items.map(line => `<li><strong>${line.qty} × ${esc(line.name)}</strong><span>${money(line.total)}</span>${line.optionsText ? `<small>${esc(line.optionsText)}</small>` : ''}${line.note ? `<em>${esc(line.note)}</em>` : ''}</li>`).join('')}</ul>
    ${order.comments ? `<p class="uber-note">${esc(order.comments)}</p>` : ''}
    <div class="uber-total"><span>Pago Uber · No cobrar</span><strong>${money(order.totals.total)}</strong></div>
    ${order.discount.amount ? `<p>Promoción aplicada: −${money(order.discount.amount)}</p>` : ''}
    ${issues.length ? `<div class="uber-warning" role="status"><strong>Requiere revisión</strong><ul>${issues.map(issue => `<li>${esc(issue)}</li>`).join('')}</ul></div>` : ''}
    ${order.uber.pendingRevision ? `<details><summary>Cambios recibidos de Uber</summary><p>La comanda anterior puede haber cambiado. Coordina con cocina y revisa Uber Eats antes de cancelar o confirmar la revisión.</p><ul>${order.uber.pendingRevision.items.map(line => `<li>${line.qty} × ${esc(line.name)} · ${esc(line.optionsText)} · ${esc(line.note)}</li>`).join('')}</ul><p>${esc(order.uber.pendingRevision.comments)} · Nuevo total ${money(order.uber.pendingRevision.totals.total)}</p>${canManage ? button('review-change', 'Confirmar revisión y actualizar', order) : ''}</details>` : ''}
    ${order.uber.printError ? `<p class="uber-warning">${esc(order.uber.printError)}</p>` : ''}
    ${order.uber.reconciliationRequired ? '<p class="uber-warning">Revisar cancelación y liquidación con Uber. La venta permanece en el historial.</p>' : ''}
    <div class="uber-actions">
      ${canManage && ['received', 'blocked'].includes(stage) ? button('accept', 'Aceptar y comandar', order, 'primary-button') : ''}
      ${canManage && stage === 'completed_remote' ? button('reconcile-finished', 'Registrar venta finalizada', order, 'primary-button') : ''}
      ${stage === 'accepted' ? button('preparing', 'Preparar', order, 'primary-button') : ''}
      ${stage === 'preparing' ? button('ready', 'Listo para recoger', order, 'primary-button') : ''}
      ${canManage && stage === 'ready' ? button('delivered', 'Confirmar entrega', order, 'primary-button') : ''}
      ${order.uber.commandedAt && active ? button('print', order.uber.printState === 'printed' ? 'Reimprimir comanda' : 'Imprimir comanda', order) : ''}
      ${canManage && !order.uber.simulated ? button('refresh', 'Consultar Uber', order) : ''}
    </div>
    ${canManage && active ? `<details data-uber-details="${esc(order.id)}" ${opened.has(order.id) ? 'open' : ''}><summary>Revisión y cancelación</summary>
      ${admin && (!order.uber.commandedAt || order.uber.pendingRevision) ? [...new Map((order.uber.pendingRevision?.items || order.items).map(line => [line.mappingKey, line])).values()].map(line => mappingForm(line, state, config)).join('') : ''}
      <form class="uber-cancel" data-uber-cancel="${esc(order.id)}" data-action="${order.uber.commandedAt ? 'cancel' : 'deny'}"><label class="field"><span>Motivo</span><select name="reason">${Object.entries(order.uber.commandedAt ? cancelReasons : denialReasons).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label><label class="field"><span>Explicación</span><input name="details" minlength="5" maxlength="240" required placeholder="Explica el motivo a Uber"></label><button class="secondary-button compact" ${busy ? 'disabled' : ''}>${order.uber.commandedAt ? 'Cancelar en Uber' : 'Rechazar en Uber'}</button></form>
    </details>` : ''}
    ${stage === 'scheduled' ? '<p>Esperando el aviso de liberación de Uber. No se envía a cocina todavía.</p>' : ''}
  </article>`;
}

export function renderUberConfiguration(runtime) {
  const config = draft || runtime.config || {};
  const field = (name, label, type = 'text', placeholder = '') => `<label class="field ${name === 'publicWebhookUrl' ? 'developer-wide-field' : ''}"><span>${label}</span><input type="${type}" name="${name}" value="${esc(config[name] || '')}" placeholder="${esc(placeholder)}" ${type === 'password' ? 'autocomplete="new-password"' : ''}></label>`;
  const check = (name, label) => `<label class="uber-check"><input type="checkbox" name="${name}" ${config[name] ? 'checked' : ''}> ${label}</label>`;
  return `<section class="panel uber-config"><h2>Conexión con Uber Eats</h2><p>Configura la aplicación aprobada para Eats Marketplace y su tienda de pruebas. Desactivar aquí detiene el conector; no pausa la tienda en Uber.</p>
    <form data-uber-config autocomplete="off"><div class="uber-fields"><label class="field"><span>Entorno</span><select name="environment"><option value="sandbox" ${config.environment === 'sandbox' ? 'selected' : ''}>Sandbox (pruebas)</option><option value="production" ${config.environment === 'production' ? 'selected' : ''} ${runtime.productionAllowed ? '' : 'disabled'}>Producción</option></select></label>
    ${field('storeId', 'ID de tienda (Store ID)')}${field('clientId', 'Client ID')}${field('clientSecret', 'Client secret', 'password', runtime.config?.hasClientSecret ? 'Guardado; deja vacío para conservarlo' : 'Solo se guarda en el servidor')}${field('publicWebhookUrl', 'URL HTTPS pública del webhook', 'url', 'https://tu-dominio/api/uber/webhook')}
    <label class="field"><span>Preparación (minutos)</span><input type="number" min="1" max="120" name="prepMinutes" value="${esc(config.prepMinutes || 20)}" required></label>
    <label class="field"><span>Precios del subtotal Uber</span><select name="taxMode"><option value="included" ${config.taxMode !== 'excluded' ? 'selected' : ''}>Ya incluyen IVA</option><option value="excluded" ${config.taxMode === 'excluded' ? 'selected' : ''}>No incluyen IVA (sumarlo)</option></select></label></div>
    ${check('enabled', 'Habilitar recepción de pedidos')}${check('autoAccept', 'Aceptar y comandar automáticamente los pedidos validados')}${check('autoPrint', 'Imprimir automáticamente en la impresora de comandas')}
    <p>Guardar la URL no crea el túnel ni registra el webhook en Uber. El secreto permanece en el servidor; deja su campo vacío para conservar el guardado.</p><p>Confirma el IVA con un pedido sandbox antes de activar la aceptación automática. Los importes de venta no representan el depósito neto después de comisiones.</p>
    <div class="uber-actions"><button class="primary-button" ${busy ? 'disabled' : ''}>Guardar configuración</button><button type="button" class="secondary-button" data-uber-connection ${busy ? 'disabled' : ''}>Probar conexión guardada</button></div></form>

    ${runtime.connection ? `<p class="uber-notice">${esc(runtime.connection.detail || '')} Estado tienda: ${esc(runtime.connection.store?.status || 'sin confirmar')}. Comprobado ${esc(time(runtime.connection.checkedAt))}.</p>` : ''}
    <div class="uber-actions"><button type="button" class="secondary-button" data-uber-store="PAUSED" ${!runtime.config?.enabled || busy ? 'disabled' : ''}>Pausar tienda 30 min</button><button type="button" class="secondary-button" data-uber-store="ONLINE" ${!runtime.config?.enabled || busy ? 'disabled' : ''}>Reabrir tienda en Uber</button></div>
    <details><summary>Relaciones guardadas (${Object.keys(config.mappings || {}).length})</summary><p>Las relaciones se crean desde «Revisión y cancelación» en cada pedido. Esta vista permite revisar y retirar una relación si cambia la receta.</p>${Object.entries(config.mappings || {}).map(([key, mapping]) => `<p><code>${esc(key)}</code> → ${esc(mapping.productId)} <button class="secondary-button compact" type="button" data-uber-unmap="${esc(key)}">Quitar relación</button></p>`).join('') || '<p>Aún no hay relaciones.</p>'}</details>
  </section>`;
}

export function renderUberPanel(state, runtime, user) {
  // Native details toggle events are asynchronous; preserve their live state before replacing the DOM.
  document.querySelectorAll('[data-uber-details]').forEach(detail => detail.open ? opened.add(detail.dataset.uberDetails) : opened.delete(detail.dataset.uberDetails));
  const admin = isPermissionsAdmin(user), config = runtime.config || {};
  const all = state.orders.filter(isUberOrder).sort((a, b) => new Date(b.uber.receivedAt) - new Date(a.uber.receivedAt));
  const active = all.filter(order => !finished(order));
  const orders = showHistory ? all.filter(finished).slice(0, 40) : active;
  return `<div class="uber-panel" data-uber-panel><header class="uber-header"><div><span class="uber-badge">Eats Marketplace</span><h1>Uber Eats</h1><p>Pedidos, cocina y pago Uber en un mismo lugar.</p></div><div class="uber-actions"><span class="uber-state">${runtime.demo ? 'Demo aislada' : config.enabled ? `${config.environment === 'production' ? 'Producción' : 'Sandbox'} habilitado` : 'Conexión desactivada'}</span><button type="button" class="secondary-button" data-uber-refresh ${busy ? 'disabled' : ''}>Actualizar</button></div></header>
    <nav class="uber-tabs" aria-label="Secciones de Uber Eats"><button type="button" data-uber-tab="orders" aria-pressed="${tab === 'orders'}">Pedidos (${active.length})</button>${admin ? `<button type="button" data-nav="developer">Configurar en Desarrollo</button>` : ''}<button type="button" data-uber-tab="events" aria-pressed="${tab === 'events'}">Recepción</button></nav>
    ${renderUberFeedback(runtime)}
    ${tab === 'events' ? renderUberEvents(runtime, user) : tab === 'orders' ? `
    <div class="uber-notice"><strong>Pago Uber: no cobrar efectivo ni tarjeta.</strong> Preparar y marcar listo actualiza la cocina local. Confirmar entrega registra la venta; la liquidación de Uber se revisa por separado.</div>
    <div class="uber-actions uber-filter"><button type="button" class="secondary-button compact" data-uber-history>${showHistory ? 'Ver pedidos activos' : 'Ver finalizados'}</button>${runtime.demo && admin ? `<button type="button" class="primary-button compact" data-uber-demo ${busy ? 'disabled' : ''}>Crear pedido simulado</button>` : ''}</div>
    ${orders.length ? `<div class="uber-orders">${orders.map(order => orderCard(order, state, config, user)).join('')}</div>` : `<section class="panel uber-empty"><h2>${showHistory ? 'Sin pedidos finalizados' : 'Esperando pedidos de Uber'}</h2><p>${config.enabled ? 'Los pedidos aparecerán aquí cuando Uber envíe un webhook válido.' : 'Configura la conexión de pruebas para recibir el primer pedido.'}</p><p>Recibir → validar catálogo → aceptar y comandar → preparar → entregar.</p></section>`}` : ''}
  </div>`;
}

export function bindUberPanel({ state, runtime, request, refresh, render, toast }) {
  const root = document.querySelector('[data-uber-panel]');
  if (!root) return;
  const run = async work => { if (busy) return; busy = true; errorText = ''; render(); try { await work(); } catch (error) { errorText = error.message; } finally { busy = false; render(); } };
  const on = (selector, event, handler) => root.querySelectorAll(selector).forEach(element => element.addEventListener(event, handler));
  const configData = form => { const data = new FormData(form); return { ...runtime.config, environment: data.get('environment'), storeId: data.get('storeId'), clientId: data.get('clientId'), clientSecret: data.get('clientSecret'), publicWebhookUrl: data.get('publicWebhookUrl'), prepMinutes: Number(data.get('prepMinutes')), taxMode: data.get('taxMode'), enabled: data.has('enabled'), autoAccept: data.has('autoAccept'), autoPrint: data.has('autoPrint') }; };
  on('[data-uber-tab]', 'click', event => { tab = event.currentTarget.dataset.uberTab; render(); });
  on('[data-uber-details]', 'toggle', event => { if (!event.currentTarget.isConnected) return; const { uberDetails: key } = event.currentTarget.dataset; event.currentTarget.open ? opened.add(key) : opened.delete(key); });
  on('[data-uber-history]', 'click', () => { showHistory = !showHistory; render(); });
  on('[data-uber-refresh]', 'click', () => run(refresh));
  on('[data-uber-config]', 'input', event => { draft = configData(event.currentTarget); });
  on('[data-uber-config]', 'submit', event => { event.preventDefault(); const data = configData(event.currentTarget); run(async () => { await request('config', data); draft = null; runtime.connection = null; await refresh(); toast('Configuración Uber guardada.'); }); });
  on('[data-uber-connection]', 'click', () => run(async () => { runtime.connection = await request('connection', {}); }));
  on('[data-uber-store]', 'click', event => { const status = event.currentTarget.dataset.uberStore; if (!window.confirm(status === 'PAUSED' ? '¿Pausar nuevos pedidos en Uber durante 30 minutos?' : '¿Reabrir la tienda para recibir pedidos en Uber?')) return; run(async () => { runtime.connection = await request('store', { status, minutes: 30 }); }); });
  on('[data-uber-demo]', 'click', () => run(async () => { await request('demo', {}); await refresh(); toast('Pedido simulado creado. Abre Uber Eats para gestionarlo.'); }));
  on('[data-uber-action]', 'click', event => {
    const { uberAction: action, orderId } = event.currentTarget.dataset;
    if (action === 'delivered' && !window.confirm('¿Ya se entregó el pedido al repartidor o cliente? Se registrará la venta como Pago Uber.')) return;
    if (action === 'reconcile-finished' && !window.confirm('¿Este pedido finalizado por Uber todavía no está registrado en otra cuenta? Se registrará una venta Pago Uber y se descontarán los insumos una vez, sin enviarlo de nuevo a cocina.')) return;
    if (action === 'review-change' && !window.confirm('Confirma que revisaste los cambios con cocina. Se actualizarán los importes de Uber y se emitirá una nueva comanda. Lo ya preparado se registra como consumo y no vuelve al inventario.')) return;
    if (action === 'print' && !window.confirm('¿Enviar la comanda a la impresora? Revisa antes si ya se imprimió.')) return;
    run(async () => { await request('action', { action, orderId }); await refresh(); });
  });
  on('[data-uber-cancel]', 'submit', event => {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    if (!window.confirm('¿Enviar esta decisión a Uber? Si cocina ya comenzó, los insumos no se devolverán automáticamente.')) return;
    run(async () => { await request('action', { action: form.dataset.action, orderId: form.dataset.uberCancel, reason: data.get('reason'), details: data.get('details') }); await refresh(); });
  });
  const saveMapping = async (key, value) => { const mappings = { ...runtime.config.mappings }; if (value) mappings[key] = value; else delete mappings[key]; await request('config', { ...runtime.config, mappings }); await refresh(); };
  on('[data-uber-unmap]', 'click', event => { const key = event.currentTarget.dataset.uberUnmap; run(() => saveMapping(key, null)); });
  on('[data-uber-product]', 'change', event => { const form = event.currentTarget.closest('form'); mappingDrafts.set(form.dataset.uberMapping, { productId: event.currentTarget.value, selections: {}, extraIds: [] }); render(); });
  on('[data-uber-mapping]', 'input', event => {
    const form = event.currentTarget, data = new FormData(form), product = uberCatalog(state).find(p => p.id === data.get('productId'));
    const selections = Object.fromEntries((product?.options || []).map(option => [option.id, option.type === 'multi' ? data.getAll(`option:${option.id}`).map(Number) : data.get(`option:${option.id}`) === '' ? undefined : Number(data.get(`option:${option.id}`))]));
    const extraIds = data.getAll('extraIds');
    const extraQuantities = Object.fromEntries(extraIds.map(id => [id, Number(data.get(`extra:${id}`) || 1)]));
    const choiceLabels = Object.fromEntries((product?.options || []).map(option => [option.id, (option.type === 'multi' ? selections[option.id] : [selections[option.id]]).map(i => option.choices[i]?.label)]));
    mappingDrafts.set(form.dataset.uberMapping, { productId: data.get('productId'), selections, choiceLabels, extraIds, extraQuantities });
  });
  on('[data-uber-mapping] select[name="extraIds"]', 'change', () => render());
  on('[data-uber-mapping]', 'submit', event => { event.preventDefault(); const key = event.currentTarget.dataset.uberMapping; const mapping = mappingDrafts.get(key) || runtime.config.mappings?.[key]; run(async () => { await saveMapping(key, mapping); mappingDrafts.delete(key); toast('Relación guardada. Ya puedes validar y aceptar el pedido.'); }); });
  on('[data-uber-retry]', 'click', event => { const eventId = event.currentTarget.dataset.uberRetry; run(async () => { await request('action', { action: 'retry-event', eventId }); await refresh(); }); });
}

export function renderUberEvents(runtime, user) { return `<section class="panel uber-config"><h2>Eventos recibidos</h2><p>Un evento recibido aún necesita consultar y validar el pedido. Si falla, se reintenta; conserva abierta la aplicación Uber Eats durante las pruebas.</p>${runtime.events?.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Hora</th><th>Evento</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>${runtime.events.map(event => `<tr><td>${esc(time(event.receivedAt))}</td><td>${esc(event.type)}<small>${esc(event.orderId)}</small></td><td>${esc(event.status)} · ${event.attempts}</td><td>${esc(event.error)}${['failed','retry'].includes(event.status) && (isPermissionsAdmin(user) || userFunctions(user).includes('caja')) ? `<button type="button" class="secondary-button compact" data-uber-retry="${esc(event.eventId)}">Reintentar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p>No se han recibido webhooks todavía.</p>'}</section>`; }

export function renderUberFeedback(runtime) { return `<div aria-live="polite">${errorText ? `<p class="uber-warning" role="alert">${esc(errorText)}</p>` : ''}${busy ? '<p class="uber-notice">Procesando…</p>' : ''}${runtime.lastError ? `<p class="uber-warning">Último aviso del conector: ${esc(runtime.lastError)}</p>` : ''}</div>`; }
