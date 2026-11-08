export const MAX_TIP_RECIPIENTS = 100;

const cents = (amount) => Math.round((Number(amount) || 0) * 100);

export function pendingTipAmount(totals, deliveries) {
  const collected = totals.reduce((sum, row) => sum + cents(row.cashTips) + cents(row.cardTips), 0);
  const delivered = deliveries.reduce((sum, row) => sum + cents(row?.amount), 0);
  return Math.max(0, collected - delivered) / 100;
}

export function splitTipAmount(amount, people) {
  if (!Number.isInteger(people) || people < 1 || people > MAX_TIP_RECIPIENTS) return [];
  const total = cents(amount);
  if (total <= 0) return [];
  const base = Math.floor(total / people);
  const remainder = total % people;
  return Array.from({ length: people }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

export function applyTipDelivery(totals, delivery) {
  const paidCash = delivery?.method === "cash" ? cents(delivery.amount) : 0;
  const paidCard = delivery?.method === "card" ? cents(delivery.amount) : 0;
  return {
    ...totals,
    expectedCash: (cents(totals.expectedCash) - paidCash) / 100,
    netCard: (cents(totals.card) - paidCard) / 100,
    tipDeliveryCash: paidCash / 100,
    tipDeliveryCard: paidCard / 100,
  };
}
