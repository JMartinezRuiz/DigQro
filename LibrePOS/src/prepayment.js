export const PREPAYMENT_DISCOUNTS = [
  { code: "none", type: "none", label: "Sin descuento", rate: 0 },
  { code: "loyalty-10", type: "loyalty", label: "Fidelidad 10%", rate: 0.1 },
  { code: "loyalty-15", type: "loyalty", label: "Fidelidad 15%", rate: 0.15 },
  { code: "loyalty-20", type: "loyalty", label: "Fidelidad 20%", rate: 0.2 },
  { code: "tenant-10", type: "tenant", label: "Descuento locatario 10%", rate: 0.1 },
];
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Always use the current gross item sum, never the already-discounted amount.
export function calculatePrepaymentDiscount(gross, code = "none", ivaRate = 0) {
  const originalSubtotal = round(Math.max(0, Number(gross) || 0));
  const option = PREPAYMENT_DISCOUNTS.find((item) => item.code === code) || PREPAYMENT_DISCOUNTS[0];
  const amount = round(originalSubtotal * option.rate);
  const subtotal = round(originalSubtotal - amount);
  const rate = Math.max(0, Math.min(1, Number(ivaRate) || 0));
  const originalNet = round(originalSubtotal / (1 + rate));
  const net = round(subtotal / (1 + rate));
  return {
    ...option, percent: round(option.rate * 100), amount, originalSubtotal, subtotal,
    netAmount: round(originalNet - net),
    ivaAmount: round((originalSubtotal - originalNet) - (subtotal - net)),
  };
}

export function prepaymentForOrder(order, code = order.prepaidDiscount?.code || 'none', ivaRate = 0) {
  const gross = (order.items || []).reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.qty), 0);
  return calculatePrepaymentDiscount(gross, code, ivaRate);
}

// Preview is read-only. Saving an open order never creates a sale or changes its items.
export function prepareOrderDiscount(order, code, { ivaRate = 0, userId, at } = {}) {
  if (order.status !== 'open' || !order.items?.length) throw new Error('Abre una cuenta con productos para aplicar el descuento.');
  if (!userId || !at) throw new Error('El descuento necesita usuario y fecha.');
  if (!PREPAYMENT_DISCOUNTS.some(option => option.code === code)) throw new Error('Selecciona un descuento válido.');
  const discount = prepaymentForOrder(order, code, ivaRate);
  const changed = (order.prepaidDiscount?.code || 'none') !== code
    || (order.prepaidDiscount && order.prepaidDiscount.subtotal !== discount.subtotal);
  return {
    ...order,
    ...(changed ? { prepaidReceiptPrintedAt: '', prepaidReceiptPrintedBy: '', prepaidReceiptMethod: '', prepaidReceiptError: '', prepaidReceiptFailedAt: '' } : {}),
    prepaidDiscount: { ...discount, preparedAt: at, preparedBy: userId },
  };
}
