import test from "node:test";
import assert from "node:assert/strict";
import { normalizePaymentTerminals, paymentAllocation, resolveCardDetails, cardDetailsLabel, correctSalePayment, correctedCashSession } from "../src/payment-records.js";
import { calculatePrepaymentDiscount } from "../src/prepayment.js";

const terminals = normalizePaymentTerminals();
const sale = { id: "sale-1", orderId: "order-1", uid: "uid-1", paymentMethod: "Tarjeta", payment: { uid: "uid-1", method: "Tarjeta", cashDue: 0, cardDue: 116, cashReceived: 0, changeGiven: 0, total: 116, terminalId: "terminal-1", terminalName: "Terminal 1", cardType: "credit" }, totals: { subtotal: 104.4, tip: 11.6, total: 116, iva: 14.4, discountAmount: 11.6 }, tip: { amount: 11.6, paymentMethod: "Tarjeta" }, items: [{ id: "line-1", qty: 1, unitPrice: 116 }], discount: { amount: 11.6 }, postpaidReceiptPrintedAt: "2026-09-08T12:00:00Z" };
const context = { subtotal: 104.4, tipAmount: 11.6, userId: "admin", at: "2026-09-08T13:00:00Z", id: "audit-1", terminals };
const input = { paymentMethod: "Efectivo", tipPaymentMethod: "Efectivo", cashReceived: 120, reason: "Se marcó tarjeta por error" };

test("legacy settings start with two terminals; empty configured lists stay empty", () => {
  assert.equal(terminals.length, 2);
  assert.deepEqual(normalizePaymentTerminals([]), []);
  assert.equal(normalizePaymentTerminals([{ id: "a", name: "A", active: false }, { id: "a", name: "duplicada" }]).length, 1);
});
test("card metadata is mandatory for every card portion including a card-only tip", () => {
  const amounts = paymentAllocation(100, 15, "Efectivo", "Tarjeta");
  assert.deepEqual(amounts, { cashDue: 100, cardDue: 15, total: 115 });
  assert.throws(() => resolveCardDetails(15, "", "credit", terminals), /terminal/);
  assert.throws(() => resolveCardDetails(15, "terminal-1", "", terminals), /crédito/);
  assert.throws(() => resolveCardDetails(15, "terminal-1", "credit", [{ ...terminals[0], active: false }]), /terminal/);
  assert.deepEqual(resolveCardDetails(0, "old", "old", terminals), { terminalId: "", terminalName: "", cardType: "" });
});
test("card to cash correction preserves total, tax, discount, identity and products", () => {
  const before = structuredClone(sale);
  const next = correctSalePayment(sale, input, context);
  assert.deepEqual(sale, before);
  for (const key of ["id", "orderId", "uid", "items", "discount"]) assert.deepEqual(next[key], before[key]);
  assert.deepEqual(next.totals, { ...before.totals, tipPaymentMethod: "Efectivo" });
  assert.equal(next.payment.total, 116);
  assert.equal(next.payment.cashDue, 116);
  assert.equal(next.payment.cardDue, 0);
  assert.equal(next.payment.changeGiven, 4);
  assert.equal(next.payment.terminalId, "");
  assert.equal(next.postpaidReceiptPrintedAt, "");
  assert.equal(next.paymentCorrections[0].before.payment.terminalName, "Terminal 1");
  assert.equal(next.paymentCorrections[0].createdBy, "admin");
});
test("cash to debit correction records terminal snapshot and supports a separate cash tip", () => {
  const cashSale = correctSalePayment(sale, input, context);
  const next = correctSalePayment(cashSale, { ...input, paymentMethod: "Tarjeta", tipPaymentMethod: "Efectivo", terminalId: "terminal-2", cardType: "debit", cashReceived: 20 }, { ...context, id: "audit-2" });
  assert.equal(next.payment.cardDue, 104.4);
  assert.equal(next.payment.cashDue, 11.6);
  assert.equal(next.payment.changeGiven, 8.4);
  assert.equal(next.payment.terminalName, "Terminal 2");
  assert.equal(next.paymentCorrections.length, 2);
  assert.equal(cardDetailsLabel(next.payment), "Terminal 2 · Débito");
  assert.equal(cardDetailsLabel({}), "Terminal sin registrar · Tipo sin registrar");
});
test("corrections reject missing reason, shortage, invalid method and NaN", () => {
  assert.throws(() => correctSalePayment(sale, { ...input, reason: "" }, context), /motivo/);
  assert.throws(() => correctSalePayment(sale, { ...input, cashReceived: 115 }, context), /efectivo/);
  assert.throws(() => correctSalePayment(sale, { ...input, paymentMethod: "bitcoin" }, context), /efectivo/);
  assert.throws(() => correctSalePayment(sale, { ...input, cashReceived: Infinity }, context), /efectivo/);
  assert.throws(() => paymentAllocation(-1, 0, "Efectivo", "Efectivo"), /inválido/);
});
test("closed cut keeps counted cash and historical audit but recalculates expected cash and difference", () => {
  const session = { status: "closed", countedCash: 300, openingCash: 200, expectedCash: 200, difference: 100, adjustments: [{ id: "older" }] };
  const totals = { cash: 116, card: 0, total: 116, cashTips: 11.6, cardTips: 0, tips: 11.6, expectedCash: 316 };
  const next = correctedCashSession(session, totals, { id: "audit-1", createdAt: context.at, createdBy: "admin" });
  assert.equal(next.countedCash, 300);
  assert.equal(next.expectedCash, 316);
  assert.equal(next.difference, -16);
  assert.equal(next.cashSales, 116);
  assert.equal(next.adjustments.length, 2);
  assert.equal(session.expectedCash, 200);
});
test("open cut keeps its live totals and receives an audit event", () => {
  const next = correctedCashSession({ status: "open", openingCash: 200 }, {}, { id: "audit" });
  assert.equal(next.expectedCash, undefined);
  assert.equal(next.adjustments.length, 1);
});
test("prepayment discount decomposes included IVA and is reused, not applied twice", () => {
  const prepaid = calculatePrepaymentDiscount(116, "loyalty-10", .16);
  assert.equal(prepaid.subtotal, 104.4);
  assert.equal(prepaid.amount, 11.6);
  assert.equal(prepaid.netAmount, 10);
  assert.equal(prepaid.ivaAmount, 1.6);
  const checkout = calculatePrepaymentDiscount(116, prepaid.code, .16);
  assert.deepEqual(checkout, prepaid);
  assert.equal(calculatePrepaymentDiscount(232, prepaid.code, .16).subtotal, 208.8);
  assert.equal(calculatePrepaymentDiscount(116, "unknown", .16).subtotal, 116);
  assert.equal(calculatePrepaymentDiscount(100, "loyalty-15", 0).ivaAmount, 0);
});
