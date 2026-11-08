import test from "node:test";
import assert from "node:assert/strict";
import { applyTipDelivery, pendingTipAmount, splitTipAmount } from "../src/tip-delivery.js";
import { protectedStateChangeError } from "../payment-permission-guard.js";

test("reparte todos los centavos y resta lo ya entregado en cortes del día", () => {
  const earlier = { cashTips: 25, cardTips: 75 };
  const current = { cashTips: 10, cardTips: 0.01 };
  const pending = pendingTipAmount([earlier, current], [{ method: "card", amount: 100 }]);
  assert.equal(pending, 10.01);
  assert.deepEqual(splitTipAmount(pending, 3), [3.34, 3.34, 3.33]);
  assert.deepEqual(splitTipAmount(pending, 2.5), []);
});

test("la entrega solo reduce el saldo elegido y conserva los cobros originales", () => {
  const before = { expectedCash: 2000, cash: 1500, card: 800, tips: 250 };
  const cash = applyTipDelivery(before, { method: "cash", amount: 250 });
  assert.equal(cash.expectedCash, 1750);
  assert.equal(cash.netCard, 800);
  assert.equal(cash.cash, 1500);
  const card = applyTipDelivery(before, { method: "card", amount: 250 });
  assert.equal(card.expectedCash, 2000);
  assert.equal(card.netCard, 550);
  assert.equal(card.card, 800);
  assert.equal(card.tips, 250);
});

test("el servidor permite registrar una entrega en un corte nuevo e impide reescribirla", () => {
  const cashier = { id: "cashier", functions: ["caja"] };
  const waiter = { id: "waiter", functions: ["mesero"] };
  const previous = { users: [cashier, waiter], sales: [], cashSessions: [{ id: "shift", status: "open" }] };
  const at = "2026-11-08T22:00:00Z";
  const closed = {
    id: "shift", status: "closed", closedBy: cashier.id, closedAt: at,
    tipDelivery: { method: "cash", amount: 250, people: 3, createdAt: at, createdBy: cashier.id },
  };
  const next = { ...previous, cashSessions: [closed] };
  assert.equal(protectedStateChangeError(previous, next, cashier), "");
  assert.match(protectedStateChangeError(previous, next, waiter), /Solo Caja/);
  const changed = { ...next, cashSessions: [{ ...closed, tipDelivery: { ...closed.tipDelivery, amount: 200 } }] };
  assert.match(protectedStateChangeError(next, changed, cashier), /ya registrada/);
});
