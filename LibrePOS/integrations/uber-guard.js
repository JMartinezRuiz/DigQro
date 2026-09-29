import { isDeepStrictEqual } from 'node:util';
import { isUberOrder } from '../src/uber-orders.js';

// Remote-owned records may only change through authenticated integration actions.
export function uberStateChangeError(previous, next) {
  for (const key of ['orders', 'sales']) {
    if ((next?.[key] || []).some(row => row.paymentMethod === 'Uber' && !isUberOrder(row))) return 'Pago Uber sólo puede registrarse mediante el conector de Uber Eats.';
    const before = new Map((previous?.[key] || []).filter(isUberOrder).map(row => [row.id, row]));
    const after = new Map((next?.[key] || []).filter(row => isUberOrder(row) || before.has(row.id)).map(row => [row.id, row]));
    if (before.size !== after.size) return 'Los pedidos y ventas Uber se gestionan desde Uber Eats.';
    for (const [id, row] of before) {
      const clean = value => {
        if (!value) return value;
        const copy = structuredClone(value);
        // Receipt bookkeeping is local; it cannot change the financial snapshot.
        for (const field of ['postpaidReceiptPrintedAt', 'postpaidReceiptPrintedBy', 'postpaidReceiptPrinterName', 'postpaidReceiptError', 'postpaidReceiptPrintCount', 'postpaidReceiptMethod', 'postpaidReceiptFailedAt', 'postpaidReceiptWarningDismissedAt', 'postpaidReceiptWarningDismissedBy']) delete copy[field];
        return copy;
      };
      if (!isDeepStrictEqual(clean(row), clean(after.get(id)))) return 'Actualiza o cancela el pedido desde Uber Eats; su pago no puede cambiarse a efectivo o tarjeta.';
    }
  }
  return '';
}

export function uberActionAllowed(user, action, functions) {
  if (!user || user.active === false) return false;
  const roles = functions(user);
  return roles.includes('admin') || roles.includes('caja') || (roles.includes('cocina') && ['preparing', 'ready', 'print'].includes(action));
}
