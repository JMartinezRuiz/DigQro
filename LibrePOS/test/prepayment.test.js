import test from 'node:test';
import assert from 'node:assert/strict';
import { prepaymentForOrder, prepareOrderDiscount } from '../src/prepayment.js';
const context = { ivaRate: .16, userId: 'waiter-demo', at: '2026-09-27T12:00:00Z' };
const order = { id: 'order-demo', status: 'open', items: [{ id:'line', unitPrice:116, qty:2 }], prepaidReceiptPrintedAt:'2026-09-27T11:00:00Z', prepaidReceiptPrintedBy:'waiter-demo', prepaidReceiptMethod:'test', prepaidReceiptError:'', prepaidReceiptFailedAt:'' };

test('quoting a discount before payment leaves the order and printed receipt unchanged', () => {
  const before = structuredClone(order);
  const quote = prepaymentForOrder(order, 'loyalty-10', .16);
  assert.equal(quote.originalSubtotal,232);
  assert.equal(quote.amount,23.2);
  assert.equal(quote.subtotal,208.8);
  assert.equal(quote.netAmount,20);
  assert.equal(quote.ivaAmount,3.2);
  assert.deepEqual(order,before);
});
test('saving preserves the open order and items and marks an old ticket for reprinting', () => {
  const saved = prepareOrderDiscount(order, 'loyalty-10', context);
  assert.equal(saved.status,'open');
  assert.equal(saved.id,order.id);
  assert.deepEqual(saved.items,order.items);
  assert.equal(saved.prepaidDiscount.preparedBy,context.userId);
  assert.equal(saved.prepaidDiscount.preparedAt,context.at);
  assert.equal(saved.prepaidReceiptPrintedAt,'');
  assert.equal(saved.prepaidReceiptPrintedBy,'');
  assert.equal(order.prepaidReceiptPrintedAt,'2026-09-27T11:00:00Z');
  assert.equal(saved.payment,undefined);
  assert.equal(saved.closedAt,undefined);
});
test('preview, saved order and checkout reuse the gross sum once; item changes and removing discount recalculate', () => {
  const saved = prepareOrderDiscount(order,'loyalty-20',context);
  assert.equal(prepaymentForOrder(saved,undefined,.16).subtotal,185.6);
  const changed = prepareOrderDiscount(saved,'loyalty-10',context);
  assert.equal(changed.prepaidDiscount.subtotal,208.8,'10% of gross, not 10% off the previous discounted total');
  const more = { ...changed, items:[...changed.items,{id:'extra',unitPrice:58,qty:1}],prepaidReceiptPrintedAt:'printed' };
  assert.equal(prepaymentForOrder(more,undefined,.16).subtotal,261);
  assert.equal(prepareOrderDiscount(more,'loyalty-10',context).prepaidReceiptPrintedAt,'');
  assert.equal(prepareOrderDiscount(more,'none',context).prepaidDiscount.subtotal,290);
  assert.equal(prepaymentForOrder({items:[{unitPrice:12.35,qty:3}]},'loyalty-15',0).subtotal,31.49);
});
test('saving a discount requires an open order with items, a valid option and attribution', () => {
  assert.throws(()=>prepareOrderDiscount({...order,status:'closed'},'loyalty-10',context),/cuenta/);
  assert.throws(()=>prepareOrderDiscount({...order,items:[]},'loyalty-10',context),/productos/);
  assert.throws(()=>prepareOrderDiscount(order,'invalid',context),/válido/);
  assert.throws(()=>prepareOrderDiscount(order,'loyalty-10',{}),/usuario/);
  const same = prepareOrderDiscount({...order,prepaidDiscount:prepaymentForOrder(order,'loyalty-10',.16)},'loyalty-10',context);
  assert.equal(same.prepaidReceiptPrintedAt,order.prepaidReceiptPrintedAt,'unchanged discount keeps the previous valid print');
});
