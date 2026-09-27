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
