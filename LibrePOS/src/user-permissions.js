// Explicit grants are independent of the Caja role. Legacy users default to none.
export const PAYMENT_CORRECTION_SCOPES = [
  { id: 'none', label: 'Sin permiso' },
  { id: 'open', label: 'Solo caja abierta' },
  { id: 'all', label: 'Cualquier caja (incluye cortes cerrados)' },
];
export function userFunctions(user) {
  if (!user) return [];
  const valid = ['admin', 'mesero', 'cocina', 'caja'];
  const role = String(user.role || '').toLowerCase();
  const source = Array.isArray(user.functions) && user.functions.length ? user.functions
    : role.includes('admin') ? ['admin'] : role.includes('cocina') ? ['cocina'] : role.includes('caja') ? ['caja'] : ['mesero'];
  const result = source.filter(value => valid.includes(value));
  return result.includes('admin') ? valid : result.length ? result : ['mesero'];
}
export function isPermissionsAdmin(user) {
  return Boolean(user && user.active !== false && userFunctions(user).includes('admin'));
}
export function normalizeUserPermissions(permissions) {
  const value = permissions?.correctPayments;
  return { correctPayments: PAYMENT_CORRECTION_SCOPES.some(scope => scope.id === value) ? value : 'none' };
}
export function paymentCorrectionScope(user) {
  return isPermissionsAdmin(user) ? 'all' : normalizeUserPermissions(user?.permissions).correctPayments;
}
export function mayCorrectSalePayment(user, sale, sessions = []) {
  if (!user || user.active === false || !sale) return false;
  if (isPermissionsAdmin(user)) return true;
  if (!userFunctions(user).includes('caja')) return false;
  const scope = paymentCorrectionScope(user);
  if (scope === 'all') return true;
  if (scope !== 'open') return false;
  const current = sessions.filter(session => session.status === 'open')
    .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))[0];
  return Boolean(current && sale.cashSessionId === current.id);
}
