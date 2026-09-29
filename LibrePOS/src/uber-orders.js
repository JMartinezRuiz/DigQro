import { menuCatalog } from './catalog-data.js';
import { configuredRecipeForProduct } from './product-recipes.js';

export const UBER_SOURCE = 'uber_eats';
export const isUberOrder = order => order?.source === UBER_SOURCE;
export const uberLabel = order => `Uber Eats · #${order.uber?.displayId || order.orderNumber || ''}`;
export const roundMoney = value => Math.round(Number(value) * 100) / 100;
const clean = value => String(value || '').trim();
const normalized = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const UBER_STATES = { received: 'Por aceptar', scheduled: 'Programado', blocked: 'Requiere revisión', completed_remote: 'Finalizado en Uber: por registrar', accepted: 'Aceptado', preparing: 'En preparación', ready: 'Listo para recoger', delivered: 'Entregado', denied: 'Rechazado en POS', cancelled: 'Cancelado', changed: 'Pedido modificado: revisar' };

export function uberCatalog(state) {
  const saved = new Map((state.menuProducts || []).map(product => [product.id, product]));
  const base = menuCatalog.map(product => ({ ...product, ...saved.get(product.id), options: saved.get(product.id)?.options?.length ? saved.get(product.id).options : product.options }));
  return [...base, ...(state.menuProducts || []).filter(product => !menuCatalog.some(base => base.id === product.id))];
}

export function modifierKey(item) {
  const entries = [];
  function visit(groups, parent = '') {
    for (const group of groups || []) {
      for (const child of group.selected_items || []) {
        entries.push(`${parent}${group.id}/${child.id}*${child.quantity}`);
        visit(child.selected_modifier_groups, `${parent}${group.id}/${child.id}/`);
      }
      for (const child of group.removed_items || []) entries.push(`${parent}${group.id}/!${child.id}`);
    }
  }
  visit(item.selected_modifier_groups);
  return `${item.id}|${entries.sort().join('|')}`;
}

function modifierText(groups) {
  return (groups || []).flatMap(group => [
    ...(group.selected_items || []).flatMap(item => [`${group.title || group.id}: ${item.title || item.id}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`, modifierText(item.selected_modifier_groups)].filter(Boolean)),
    ...(group.removed_items || []).map(item => `Sin ${item.title || item.id}`),
  ]).join(' · ');
}

function amount(value, required = false) {
  if (value == null && !required) return 0;
  if (!value || value.currency_code !== 'MXN' || !Number.isSafeInteger(value.amount) || value.amount < 0) throw new Error('Importe Uber inválido o moneda distinta de MXN.');
  return value.amount / 100;
}

export function normalizeUberOrder(raw, { storeId, clientId, environment = 'sandbox', taxMode = 'included', now = new Date().toISOString(), scheduled = false } = {}) {
  if (!raw || !clean(raw.id) || !raw.store?.id || raw.store.id !== storeId) throw new Error('El pedido no corresponde a la tienda configurada.');
  if (clientId && raw.order_manager_client_id && raw.order_manager_client_id !== clientId) throw new Error('Otra aplicación es gestora de este pedido. Revisa la vinculación con Uber.');
  if (!Array.isArray(raw.cart?.items) || !raw.cart.items.length) throw new Error('Se requiere el formato Get Order Details v2 con productos.');
  if (raw.cart.fulfillment_issues?.length) throw new Error('El pedido contiene sustituciones o faltantes. Requiere revisión del contrato y del pedido en Uber.');
  if (!['DELIVERY_BY_UBER', 'PICK_UP'].includes(raw.type)) throw new Error('Esta integración admite entrega por Uber y recolección. Revisa este tipo de pedido en Uber.');
  const charges = raw.payment?.charges;
  if (!charges) throw new Error('Falta el desglose de pago Uber.');
  if (amount(charges.cash_amount_due) > 0) throw new Error('Uber solicita cobro en efectivo: requiere revisión, no se registrará como Pago Uber.');
  for (const fee of ['total_fee', 'total_fee_tax', 'bag_fee', 'pick_and_pack_fee', 'delivery_fee', 'delivery_fee_tax', 'small_order_fee', 'small_order_fee_tax', 'tip']) {
    if (amount(charges[fee]) > 0) throw new Error(`El pedido incluye cargos adicionales (${fee}). Requiere revisar ese desglose antes de registrarlo como venta.`);
  }
  const original = amount(charges.sub_total, true);
  const subtotal = charges.sub_total_promo_applied ? amount(charges.sub_total_promo_applied, true) : original;
  const tax = amount(charges.tax_promo_applied ?? charges.tax);
  const gross = roundMoney(subtotal + (taxMode === 'excluded' ? tax : 0));
  if (tax > gross || subtotal > original) throw new Error('El desglose de impuestos o promociones requiere revisión.');
  const items = raw.cart.items.map((item, index) => {
    if (typeof item.id !== 'string' || !item.id.trim()) throw new Error('Producto Uber sin identificador.');
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error('Cantidad de producto Uber no soportada.');
    const total = amount(item.price?.total_price, true);
    const allergyNotes = (item.special_requests || []).map(request => {
      if (!request.allergy) throw new Error('Solicitud especial de Uber no soportada. Revisa el pedido.');
      const labels = (request.allergy.allergens_to_exclude || []).map(allergen => clean(allergen.freeform_text || allergen.type));
      return `ALERGIA: ${[...labels, request.allergy.allergy_instructions].filter(Boolean).join(' · ')}`;
    });
    return { id: `uber-line-${raw.id}-${index}`, externalItemId: String(item.id), mappingKey: modifierKey(item), productId: '', name: clean(item.title || item.id),
      qty: item.quantity, unitPrice: total / item.quantity, total, optionsText: modifierText(item.selected_modifier_groups), note: [clean(item.special_instructions), ...allergyNotes].filter(Boolean).join('\n'),
      status: 'pending', selections: {}, extras: [], commandIds: [], addedBy: 'uber', addedAt: now };
  });
  const itemTotal = roundMoney(items.reduce((sum, line) => sum + line.total, 0));
  if (Math.abs(itemTotal - original) > .02) throw new Error('Los productos no coinciden con el subtotal Uber. Requiere revisión de precios.');
  const net = roundMoney(gross - tax);
  const originalGross = roundMoney(original + (taxMode === 'excluded' ? amount(charges.tax) : 0));
  if (taxMode === 'excluded' && originalGross > original) {
    let allocated = 0;
    items.forEach((line, index) => {
      const portion = index === items.length - 1 ? roundMoney(originalGross - original - allocated) : roundMoney((originalGross - original) * line.total / (original || 1));
      allocated = roundMoney(allocated + portion); line.total = roundMoney(line.total + portion); line.unitPrice = line.total / line.qty;
    });
  }
  const discountAmount = roundMoney(originalGross - gross);
  const discount = { code: 'uber', type: 'uber', label: 'Promoción Uber', amount: discountAmount, originalSubtotal: originalGross, subtotal: gross, rate: originalGross ? discountAmount / originalGross : 0 };
  const totals = { subtotal: gross, total: gross, originalSubtotal: originalGross, subtotalBeforeDiscount: originalGross, discountAmount, discount,
    netSubtotal: net, taxableSubtotal: net, iva: tax, taxAmount: tax, ivaRate: net ? tax / net : 0, taxRate: net ? tax / net : 0,
    ivaEnabled: tax > 0, taxEnabled: tax > 0, tip: 0, tipPaymentMethod: 'Uber', count: items.reduce((n, item) => n + item.qty, 0) };
  const rawState = clean(raw.current_state).toUpperCase();
  const terminal = ['CANCELED', 'CANCELLED', 'DENIED'].includes(rawState);
  const requestedAt = raw.estimated_ready_for_pickup_at || '';
  return { id: `uber-${raw.id}`, source: UBER_SOURCE, type: 'uber', status: terminal ? 'cancelled' : 'open',
    orderNumber: `UE-${raw.display_id || raw.id.slice(-5)}`, customerName: clean(raw.eater?.first_name || 'Cliente Uber'),
    openedAt: raw.placed_at || now, waiterId: 'uber', comments: [raw.cart.special_instructions, raw.special_instructions,
      raw.packaging?.disposable_items?.should_include === true ? 'Incluir cubiertos / desechables' : raw.packaging?.disposable_items?.should_include === false ? 'Sin cubiertos / desechables' : ''].filter(Boolean).join('\n'),
    items, commandBatches: [], totals, discount, paymentMethod: 'Uber', paymentStatus: 'managed_by_uber',
    payment: { method: 'Uber', cashDue: 0, cardDue: 0, uberDue: gross, cashReceived: 0, changeGiven: 0, total: gross, provider: 'uber_eats' },
    uber: { orderId: String(raw.id), storeId, environment, displayId: raw.display_id || raw.id.slice(-5), state: terminal ? 'cancelled' : scheduled ? 'scheduled' : 'received',
      remoteState: rawState, receivedAt: now, readyAt: requestedAt, fulfillmentType: raw.type, taxMode, importedTotals: totals,
      charges: structuredClone(charges), promotions: structuredClone(raw.payment.promotions || null), issues: [], history: [{ at: now, action: 'received', by: 'uber' }],
      printState: 'none', settlement: 'pending' } };
}

export function mapUberOrder(order, state, mappings = {}) {
  const issues = [];
  const catalog = uberCatalog(state);
  for (const line of order.items) {
    line.inventoryUsage = []; line.productId = '';
    const mapping = Object.hasOwn(mappings, line.mappingKey) ? mappings[line.mappingKey] : null;
    const product = mapping && catalog.find(product => product.id === mapping.productId && product.active !== false);
    if (!product) { issues.push(`Relaciona ${line.name} (${line.mappingKey}) con un producto local.`); continue; }
    const selections = mapping.selections || {};
    let valid = true;
    for (const option of product.options || []) {
      const indices = option.type === 'multi' ? selections[option.id] || [] : [selections[option.id]];
      if (!Array.isArray(indices) || (option.required && !indices.length) || indices.some(i => !Number.isInteger(i) || !option.choices?.[i] || option.choices[i].active === false)) {
        issues.push(`Selecciona la variante ${option.label} para ${line.name}.`); valid = false;
      }
      if (Array.isArray(indices) && mapping.choiceLabels?.[option.id] && JSON.stringify(indices.map(i => option.choices?.[i]?.label)) !== JSON.stringify(mapping.choiceLabels[option.id])) {
        issues.push(`Cambió la variante local ${option.label}. Guarda de nuevo la relación de ${line.name}.`); valid = false;
      }
    }
    if (!valid) continue;
    const recipe = configuredRecipeForProduct(product, selections).map(part => ({ ...part }));
    if (!recipe.length) issues.push(`Configura la receta de ${product.name} antes de aceptar.`);
    for (const extraId of mapping.extraIds || []) {
      const extra = (state.extraCatalog || []).find(extra => extra.id === extraId && extra.active !== false);
      if (!extra) { issues.push(`Extra local desconocido: ${extraId}.`); continue; }
      const count = Number(mapping.extraQuantities?.[extraId] ?? 1);
      if (!Number.isInteger(count) || count < 1 || count > 99) { issues.push(`Cantidad de extra inválida: ${extra.name}.`); continue; }
      recipe.push({ itemId: extra.inventoryItemId, name: extra.inventoryItemName || extra.name, qty: extra.qty * count, estimated: true });
    }
    const usageByItem = new Map();
    for (const part of recipe) {
      const item = state.inventory.find(item => part.itemId ? item.id === part.itemId : normalized(item.name) === normalized(part.name));
      if (!item) issues.push(`Falta el insumo ${part.name} para ${line.name}.`);
      if (!Number.isFinite(Number(part.qty)) || Number(part.qty) < 0) issues.push(`Cantidad de receta inválida: ${part.name}.`);
      const key = item?.id || part.name, existing = usageByItem.get(key);
      if (existing) existing.qty += Number(part.qty) * line.qty;
      else usageByItem.set(key, { itemId: item?.id || '', name: part.name, qty: Number(part.qty) * line.qty, estimated: Boolean(part.estimated), unitCost: Number(item?.unitCost) || 0 });
    }
    const usage = [...usageByItem.values()];
    Object.assign(line, { productId: product.id, station: product.station || 'Cocina', selections: structuredClone(selections), inventoryUsage: usage,
      unitCostSnapshot: roundMoney(usage.reduce((sum, part) => sum + part.qty * part.unitCost, 0) / line.qty) });
  }
  const demand = new Map();
  for (const line of order.items) for (const part of line.inventoryUsage || []) demand.set(part.itemId, (demand.get(part.itemId) || 0) + part.qty);
  for (const [id, qty] of demand) { const item = state.inventory.find(item => item.id === id); if (item && (!Number.isFinite(Number(item.qty)) || Number(item.qty) + 1e-9 < qty)) issues.push(`Inventario insuficiente: ${item.name}.`); }
  order.uber.issues = [...new Set(issues)];
  return order.uber.issues;
}

export function acceptUberLocally(state, order, now) {
  if (order.uber.commandedAt) return;
  order.status = 'open';
  for (const line of order.items) for (const part of line.inventoryUsage || []) {
    const item = state.inventory.find(item => item.id === part.itemId);
    if (!item) throw new Error(`Falta insumo ${part.name}.`);
    item.qty = Number(item.qty) - part.qty; item.totalCost = item.qty * Number(item.unitCost || 0);
    state.inventoryMovements.unshift({ id: `${line.id}-${part.itemId}-consume`, itemId: item.id, itemName: item.name, unit: item.unit, userId: 'uber', qty: -part.qty, signedQty: -part.qty,
      reason: `Comanda ${uberLabel(order)}`, source: 'uber', createdAt: now, createdBy: 'uber', estimated: part.estimated, orderId: order.id });
  }
  const batchId = `${order.id}-command`;
  order.commandBatches = [{ id: batchId, mode: 'digital', status: 'new', createdAt: now, createdBy: 'uber',
    lines: order.items.map(line => ({ lineId: line.id, productId: line.productId, name: line.name, qty: line.qty, station: line.station, selections: line.selections, optionsText: line.optionsText, note: line.note })) }];
  for (const line of order.items) { line.status = 'commanded'; line.commandIds = [batchId]; }
  Object.assign(order.uber, { state: 'accepted', commandedAt: now, issues: [], printState: 'pending' });
  order.uber.history.push({ at: now, action: 'accepted', by: 'uber' });
}

export function cancelUberLocally(state, order, now, reason) {
  if (order.uber.state === 'cancelled') return;
  const restore = order.uber.commandedAt && order.commandBatches.filter(batch => batch.status !== 'cancelled').every(batch => batch.status === 'new');
  if (restore) for (const line of order.items) for (const part of line.inventoryUsage || []) {
    const item = state.inventory.find(item => item.id === part.itemId);
    if (!item) continue;
    item.qty = Number(item.qty) + part.qty; item.totalCost = item.qty * Number(item.unitCost || 0);
    state.inventoryMovements.unshift({ id: `${line.id}-${part.itemId}-restore`, itemId: item.id, itemName: item.name, unit: item.unit, userId: 'uber', qty: part.qty, signedQty: part.qty,
      source: 'uber-cancel', reason, createdAt: now, createdBy: 'uber', orderId: order.id });
  }
  for (const batch of order.commandBatches) { batch.status = 'cancelled'; batch.cancelledAt = now; }
  order.status = 'cancelled'; order.cancelledAt = now; order.cancelReason = reason;
  order.uber.state = 'cancelled'; order.uber.history.push({ at: now, action: 'cancelled', by: 'uber', reason });
  const sale = state.sales.find(sale => sale.orderId === order.id);
  if (sale) { order.uber.reconciliationRequired = true; sale.uber.reconciliationRequired = true; sale.uber.cancellationReason = reason; }
  state.cancellations.unshift({ id: `${order.id}-cancel`, scope: 'order', source: 'Uber Eats', orderId: order.id, orderLabel: uberLabel(order), qty: order.totals.count,
    amount: order.totals.total, note: reason, stage: restore ? 'before-kitchen' : 'after-kitchen', restoredStock: Boolean(restore), createdAt: now, createdBy: 'uber' });
}

export function completeUberLocally(state, order, now, actor = 'uber') {
  if (state.sales.some(sale => sale.orderId === order.id)) return;
  const session = state.cashSessions.filter(session => session.status === 'open').sort((a,b) => new Date(b.openedAt) - new Date(a.openedAt))[0];
  order.status = 'closed'; order.closedAt = now; order.uber.state = 'delivered';
  order.uber.history.push({ at: now, action: 'delivered', by: actor });
  for (const batch of order.commandBatches) { batch.status = 'delivered'; batch.deliveredAt = now; }
  state.sales.unshift({ ...structuredClone(order), id: `${order.id}-sale`, orderId: order.id, label: uberLabel(order),
    uid: `UBER-${order.uber.orderId}`, paymentUid: `UBER-${order.uber.orderId}`, cashierId: actor, chargedAt: now, closedAt: now,
    cashSessionId: session?.id || '', tip: { amount: 0, paymentMethod: 'Uber' }, postpaidReceiptPrintedAt: '', postpaidReceiptError: '' });
}

export function reviseUberLocally(state, order, mappings, now, actor) {
  const revision = order.uber.pendingRevision;
  if (!revision) throw new Error('No hay una revisión pendiente.');
  const prepared = order.commandBatches.some(batch => !['new', 'cancelled'].includes(batch.status));
  const usage = lines => {
    const result = new Map();
    for (const line of lines) for (const part of line.inventoryUsage || []) result.set(part.itemId, (result.get(part.itemId) || 0) + part.qty);
    return result;
  };
  const before = usage(order.items);
  const candidate = { ...structuredClone(order), ...structuredClone(revision) };
  // Validate the updated recipe against stock including what is already consumed.
  const checkState = { ...state, inventory: state.inventory.map(item => ({ ...item, qty: Number(item.qty) + (before.get(item.id) || 0) })) };
  if (mapUberOrder(candidate, checkState, mappings).length) throw new Error(candidate.uber.issues.join(' '));
  const after = usage(candidate.items);
  const revisionNumber = (order.uber.revisionNumber || 0) + 1;
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const delta = (after.get(id) || 0) - (before.get(id) || 0);
    const change = prepared ? -Math.max(0, delta) : -delta;
    const item = state.inventory.find(item => item.id === id);
    if (!item || !change) continue;
    item.qty = Number(item.qty) + change; item.totalCost = item.qty * Number(item.unitCost || 0);
    state.inventoryMovements.unshift({ id: `${order.id}-revision-${revisionNumber}-${id}`, itemId: id, itemName: item.name, unit: item.unit, qty: change,
      reason: `Revisión ${revisionNumber} de ${uberLabel(order)}`, source: 'uber-revision', createdAt: now, userId: actor, orderId: order.id });
  }
  const previousTotals = structuredClone(order.totals);
  Object.assign(order, revision, { items: candidate.items });
  order.uber.revisionNumber = revisionNumber; order.uber.pendingRevision = null; order.uber.issues = [];
  order.uber.history.push({ at: now, action: 'revision-reviewed', by: actor, previousTotals, totals: structuredClone(order.totals), retainedPreparedConsumption: prepared });
  for (const batch of order.commandBatches) batch.status = 'cancelled';
  const batchId = `${order.id}-revision-${revisionNumber}`;
  order.commandBatches.push({ id: batchId, mode: 'digital', status: prepared ? 'preparing' : 'new', createdAt: now, createdBy: actor,
    lines: order.items.map(line => ({ lineId: line.id, productId: line.productId, name: line.name, qty: line.qty, station: line.station, optionsText: line.optionsText, note: line.note })) });
  for (const line of order.items) { line.status = 'commanded'; line.commandIds = [batchId]; }
  order.status = 'open'; order.uber.state = prepared ? 'preparing' : 'accepted'; order.uber.printState = 'pending';
  const sale = state.sales.find(sale => sale.orderId === order.id);
  if (sale) {
    const cut = state.cashSessions.find(session => session.id === sale.cashSessionId && session.status === 'closed');
    if (cut) {
      cut.uberSales = roundMoney(Number(cut.uberSales || 0) + order.totals.total - sale.totals.total);
      cut.totalSales = roundMoney(Number(cut.totalSales || 0) + order.totals.total - sale.totals.total);
      cut.iva = roundMoney(Number(cut.iva || 0) + order.totals.iva - sale.totals.iva);
      cut.discounts = roundMoney(Number(cut.discounts || 0) + order.discount.amount - (sale.discount?.amount || 0));
      cut.adjustments = [...(cut.adjustments || []), { id: batchId, type: 'uber-revision', createdAt: now, createdBy: actor, orderId: order.id }];
    }
    Object.assign(sale, { items: structuredClone(order.items), totals: structuredClone(order.totals), payment: structuredClone(order.payment), discount: structuredClone(order.discount), comments: order.comments,
      uber: { ...structuredClone(order.uber), reconciliationRequired: true }, postpaidReceiptPrintedAt: '' });
    sale.uber.state = 'delivered';
    order.status = 'closed'; order.uber.state = 'delivered';
    order.commandBatches.at(-1).status = 'delivered';
  } else if (order.uber.remoteState === 'FINISHED') completeUberLocally(state, order, now, actor);
}

export function buildUberCommandText(order) {
  return ['UBER EATS', `Pedido #${order.uber.displayId}`, order.uber.revisionNumber ? `REVISION ${order.uber.revisionNumber} - SUSTITUYE COMANDA` : '', 'PAGO UBER - NO COBRAR', order.customerName,
    order.uber.readyAt ? `Recoger: ${new Date(order.uber.readyAt).toLocaleString('es-MX')}` : '', order.comments,
    '================================', ...order.items.flatMap(item => [`${item.qty} x ${item.name}`, item.optionsText, item.note].filter(Boolean)),
    '================================', `Folio ${order.orderNumber}`, ''].join('\n');
}
