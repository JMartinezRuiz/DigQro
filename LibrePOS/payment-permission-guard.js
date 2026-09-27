import { isDeepStrictEqual } from 'node:util';
import { isPermissionsAdmin, mayCorrectSalePayment, normalizeUserPermissions, userFunctions } from './src/user-permissions.js';

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
  return '';
}
