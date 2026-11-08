import { isDeepStrictEqual } from 'node:util';
import { isPermissionsAdmin, mayCorrectSalePayment, normalizeUserPermissions, userFunctions } from './src/user-permissions.js';
import { splitTipAmount } from './src/tip-delivery.js';

function accessProfile(user) {
  return {
    name: user.name, username: user.username, active: user.active !== false,
    functions: userFunctions(user).sort(), permissions: normalizeUserPermissions(user.permissions),
  };
}
function paymentRecord(sale) {
  return { method: sale.paymentMethod, payment: sale.payment, tipMethod: sale.tip?.paymentMethod,
    totalTipMethod: sale.totals?.tipPaymentMethod, history: sale.paymentCorrections || [] };
}
// Check against the saved users/sessions, never a role or grant supplied in this POST.
export function protectedStateChangeError(previous, next, actor) {
  if (!previous) return ''; // Initial setup precedes the first login.
  const admin = isPermissionsAdmin(actor);
  const oldUsers = new Map(previous.users.map(user => [user.id, user]));
  if (!admin && (oldUsers.size !== next.users.length || next.users.some(user => {
    const old = oldUsers.get(user.id);
    return !old || !isDeepStrictEqual(accessProfile(old), accessProfile(user))
      || (typeof user.password === 'string' && user.password.trim())
      || (user.passwordHash && user.passwordHash !== old.passwordHash)
      || (user.passwordSalt && user.passwordSalt !== old.passwordSalt)
      || (user.passwordIterations && user.passwordIterations !== old.passwordIterations);
  }))) return 'Solo administración puede modificar usuarios y permisos. Vuelve a iniciar sesión si es necesario.';

  const sales = new Map(next.sales.map(sale => [sale.id, sale]));
  for (const old of previous.sales) {
    const sale = sales.get(old.id);
    if (!sale) {
      if (!admin) return 'Solo administración puede eliminar ventas.';
    } else if (!isDeepStrictEqual(paymentRecord(old), paymentRecord(sale))) {
      if (!mayCorrectSalePayment(actor, old, previous.cashSessions)) return 'No tienes permiso para corregir el pago de esta cuenta.';
      const audit = sale.paymentCorrections?.at(-1);
      if (!audit || audit.createdBy !== actor.id) return 'La corrección debe identificar al usuario que inició sesión.';
    }
    if (sale && sale.cashSessionId !== old.cashSessionId && !admin) return 'No puedes trasladar una venta a otra caja.';
  }
  if (!admin && previous.cashSessions.some(old => old.status === 'closed' && next.cashSessions.find(session => session.id === old.id)?.status !== 'closed')) {
    return 'No puedes reabrir ni eliminar un corte cerrado.';
  }
  const oldSessions = new Map(previous.cashSessions.map(session => [session.id, session]));
  for (const session of next.cashSessions) {
    const old = oldSessions.get(session.id);
    const delivery = session.tipDelivery ?? null;
    if (old?.tipDelivery && (session.status !== 'closed' || session.closedAt !== old.closedAt || !isDeepStrictEqual(old.tipDelivery, delivery))) {
      return 'No puedes modificar una entrega de propinas ya registrada.';
    }
    if (!delivery || old?.tipDelivery) continue;
    if (!actor || actor.active === false || !userFunctions(actor).includes('caja')) {
      return 'Solo Caja o Administración puede registrar una entrega de propinas.';
    }
    if (old?.status === 'closed' || session.status !== 'closed' || !session.closedAt
      || !['cash', 'card'].includes(delivery.method) || !Number.isFinite(delivery.amount)
      || delivery.amount !== Math.round(delivery.amount * 100) / 100 || !splitTipAmount(delivery.amount, delivery.people).length
      || delivery.createdBy !== actor.id || session.closedBy !== actor.id || delivery.createdAt !== session.closedAt) {
      return 'La entrega de propinas debe coincidir con el corte y el usuario que lo registra.';
    }
  }
  return '';
}
