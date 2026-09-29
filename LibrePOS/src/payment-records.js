// Accounting metadata only: these helpers never contact a bank or charge a card.
const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
const methods = new Set(["Efectivo", "Tarjeta"]);
export const CARD_TYPES = { debit: "Débito", credit: "Crédito" };

// Unknown tenders must never inflate the physical cash drawer.
export function paymentBucket(method) {
  const value = String(method || "Efectivo").trim().toLowerCase();
  if (["uber", "uber eats", "uber_eats"].includes(value)) return "uber";
  if (value.includes("tarjeta")) return "card";
  return value === "efectivo" ? "cash" : "other";
}

export function summarizePayments(sales, { subtotal, tip, tax = () => 0, discount = () => 0 }) {
  const totals = { cash: 0, card: 0, uber: 0, other: 0, total: 0, tips: 0, iva: 0, discounts: 0, count: 0,
    cashSales: 0, cardSales: 0, uberSales: 0, otherSales: 0, cashTips: 0, cardTips: 0, uberTips: 0, otherTips: 0 };
  for (const sale of sales) {
    const amount = subtotal(sale), gratuity = tip(sale);
    const bucket = paymentBucket(sale.paymentMethod);
    const tipBucket = paymentBucket(sale.tip?.paymentMethod || sale.totals?.tipPaymentMethod || sale.paymentMethod);
    totals[bucket] += amount; totals[`${bucket}Sales`] += amount;
    totals[tipBucket] += gratuity; totals[`${tipBucket}Tips`] += gratuity;
    totals.total += amount + gratuity; totals.tips += gratuity;
    totals.iva += tax(sale); totals.discounts += discount(sale); totals.count++;
  }
  return totals;
}

export function normalizePaymentTerminals(value) {
  const source = Array.isArray(value) ? value : [
    { id: "terminal-1", name: "Terminal 1" },
    { id: "terminal-2", name: "Terminal 2" },
  ];
  const seen = new Set();
  return source.filter((item) => item && item.id && !seen.has(item.id) && seen.add(item.id))
    .map((item) => ({ id: String(item.id), name: String(item.name || "Terminal").trim().slice(0, 60), active: item.active !== false }));
}

export function paymentAllocation(subtotal, tipAmount, method, tipMethod) {
  if (!methods.has(method) || !methods.has(tipMethod)) throw new Error("Selecciona efectivo o tarjeta.");
  if (![subtotal, tipAmount].every((v) => Number.isFinite(Number(v)) && Number(v) >= 0)) throw new Error("Importe de pago inválido.");
  const cashDue = money((method === "Efectivo" ? Number(subtotal) : 0) + (tipMethod === "Efectivo" ? Number(tipAmount) : 0));
  const total = money(Number(subtotal) + Number(tipAmount));
  return { cashDue, cardDue: money(total - cashDue), total };
}

export function resolveCardDetails(cardDue, terminalId, cardType, terminals) {
  if (cardDue <= 0) return { terminalId: "", terminalName: "", cardType: "" };
  const terminal = normalizePaymentTerminals(terminals).find((item) => item.id === terminalId && item.active);
  if (!terminal) throw new Error("Selecciona una terminal activa para el importe con tarjeta.");
  if (!Object.hasOwn(CARD_TYPES, cardType)) throw new Error("Indica si la tarjeta es de crédito o débito.");
  return { terminalId: terminal.id, terminalName: terminal.name, cardType };
}

export function cardDetailsLabel(payment = {}) {
  return `${payment.terminalName || "Terminal sin registrar"} · ${CARD_TYPES[payment.cardType] || "Tipo sin registrar"}`;
}

export function correctSalePayment(sale, input, context) {
  if (sale.source === "uber_eats" || paymentBucket(sale.paymentMethod) === "uber") throw new Error("El pago Uber se gestiona desde Uber Eats; no puede convertirse en efectivo o tarjeta.");
  const { subtotal, tipAmount, userId, at, id, terminals } = context;
  const reason = String(input.reason || "").trim();
  if (reason.length < 5 || reason.length > 240) throw new Error("Escribe un motivo de 5 a 240 caracteres.");
  if (!userId || !at || !id) throw new Error("La corrección necesita autor, fecha e identificador.");
  const allocation = paymentAllocation(subtotal, tipAmount, input.paymentMethod, input.tipPaymentMethod);
  const card = resolveCardDetails(allocation.cardDue, input.terminalId, input.cardType, terminals);
  const received = allocation.cashDue > 0 ? Number(input.cashReceived) : 0;
  if (!Number.isFinite(received) || received < allocation.cashDue) throw new Error("El efectivo recibido no cubre el importe en efectivo.");
  const payment = {
    ...(sale.payment || {}), method: input.paymentMethod, ...allocation, ...card,
    cashReceived: money(received), changeGiven: money(received - allocation.cashDue),
    correctedAt: at, correctedBy: userId,
  };
  const audit = {
    id, type: "payment-corrected", reason, createdAt: at, createdBy: userId,
    before: { paymentMethod: sale.paymentMethod || sale.payment?.method || "Efectivo", tipPaymentMethod: sale.tip?.paymentMethod || sale.totals?.tipPaymentMethod || sale.paymentMethod || "Efectivo", payment: structuredClone(sale.payment || {}) },
    after: { paymentMethod: input.paymentMethod, tipPaymentMethod: input.tipPaymentMethod, payment: structuredClone(payment) },
  };
  return {
    ...sale, paymentMethod: input.paymentMethod, payment,
    tip: { ...(sale.tip || {}), paymentMethod: input.tipPaymentMethod },
    totals: { ...(sale.totals || {}), tipPaymentMethod: input.tipPaymentMethod },
    paymentCorrections: [...(Array.isArray(sale.paymentCorrections) ? sale.paymentCorrections : []), audit],
    // A previous paper ticket no longer represents the corrected payment.
    postpaidReceiptPrintedAt: "", postpaidReceiptPrintedBy: "",
    postpaidReceiptWarningDismissedAt: "", postpaidReceiptWarningDismissedBy: "", postpaidReceiptError: "",
  };
}

export function correctedCashSession(session, totals, audit) {
  const result = { ...session, adjustments: [...(session.adjustments || []), audit] };
  if (session.status !== "closed") return result;
  return {
    ...result, cashSales: totals.cash, cardSales: totals.card, uberSales: totals.uber || 0, totalSales: totals.total,
    uberTips: totals.uberTips || 0,
    cashTips: totals.cashTips, cardTips: totals.cardTips, tips: totals.tips,
    expectedCash: totals.expectedCash,
    difference: money(Number(session.countedCash || 0) - totals.expectedCash),
    adjustedAt: audit.createdAt, adjustedBy: audit.createdBy,
  };
}
