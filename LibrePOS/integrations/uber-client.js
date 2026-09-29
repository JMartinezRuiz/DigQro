// Eats Marketplace: GetOrder v2 and documented v1 order actions.
export const UBER_HOSTS = {
  sandbox: { api: 'https://test-api.uber.com', auth: 'https://sandbox-login.uber.com/oauth/v2/token' },
  production: { api: 'https://api.uber.com', auth: 'https://auth.uber.com/oauth/v2/token' },
};
export class UberClient {
  constructor(config, fetcher = fetch) { this.config = config; this.fetch = fetcher; this.cachedToken = null; }
  async token(scope = 'eats.order eats.store') {
    if (this.cachedToken?.scope === scope && this.cachedToken?.expiresAt > Date.now() + 60000) return this.cachedToken.token;
    const { clientId, clientSecret, environment } = this.config();
    const host = UBER_HOSTS[environment];
    if (!host || !clientId || !clientSecret) throw new Error('Configura las credenciales de Uber en el servidor.');
    const response = await this.fetch(host.auth, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials', scope }) });
    if (!response.ok) throw new Error(`Uber OAuth HTTP ${response.status}. Verifica entorno y permisos.`);
    const body = await response.json();
    if (!body.access_token || !Number.isFinite(body.expires_in)) throw new Error('Respuesta OAuth inválida.');
    this.cachedToken = { token: body.access_token, scope, expiresAt: Date.now() + body.expires_in * 1000 };
    return body.access_token;
  }
  async request(path, method = 'GET', body, retry = true, scope) {
    const token = await this.token(scope);
    const response = await this.fetch(`${UBER_HOSTS[this.config().environment].api}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 401 && retry) { this.cachedToken = null; return this.request(path, method, body, false, scope); }
    if (!response.ok) { const error = new Error(`Uber API HTTP ${response.status}. Consulta el estado antes de reintentar.`); error.status = response.status; throw error; }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }
  order(id) { return this.request(`/v2/eats/order/${encodeURIComponent(id)}`); }
  accept(id, reference, pickupTime) { return this.request(`/v1/eats/orders/${encodeURIComponent(id)}/accept_pos_order`, 'POST', {
    reason: 'Accepted by LibrePOS', external_reference_id: reference, pickup_time: pickupTime,
    fields_relayed: { order_special_instructions: true, item_special_instructions: true, promotions: true },
  }); }
  deny(id, code, explanation) { return this.request(`/v1/eats/orders/${encodeURIComponent(id)}/deny_pos_order`, 'POST', { reason: { code, explanation } }); }
  cancel(id, reason, details) { return this.request(`/v1/eats/orders/${encodeURIComponent(id)}/cancel`, 'POST', { reason, details }); }
  storeStatus() { return this.request(`/v1/eats/store/${encodeURIComponent(this.config().storeId)}/status`); }
  setStoreStatus(status, pausedUntil) { return this.request(`/v1/eats/store/${encodeURIComponent(this.config().storeId)}/status`, 'POST', { status, ...(pausedUntil ? { paused_until: pausedUntil } : {}), reason: 'Cambio solicitado desde LibrePOS' }, true, 'eats.store.status.write'); }
}
