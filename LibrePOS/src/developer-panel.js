import { isPermissionsAdmin } from './user-permissions.js';
import { renderUberConfiguration, renderUberEvents, renderUberFeedback } from './uber-panel.js';
import './developer.css';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let activeTab = 'connection';
export function resetDeveloperPanel() { activeTab = 'connection'; }

function webhookPanel(config) {
  return `<aside class="panel uber-config developer-webhook">
    <span class="developer-eyebrow">UBER EATS</span><h2>Webhook de pedidos</h2>
    <p>Publica la pasarela con HTTPS y registra esta dirección en tu aplicación de Uber.</p>
    <label class="field"><span>URL guardada para registrar en Uber</span><textarea readonly rows="2" data-webhook-url placeholder="Guarda la URL pública en la conexión">${esc(config.publicWebhookUrl || '')}</textarea></label>
    <button type="button" class="secondary-button compact" data-copy-webhook ${config.publicWebhookUrl ? '' : 'disabled'}>Copiar URL del webhook</button>
    <dl class="developer-contract"><div><dt>Método</dt><dd>POST</dd></div><div><dt>Ruta</dt><dd><code>/api/uber/webhook</code></dd></div><div><dt>Firma</dt><dd><code>X-Uber-Signature</code></dd></div></dl>
    <p>La URL guardada es una referencia: no confirma que el túnel esté activo ni que Uber la haya registrado.</p>
    <details><summary>Cómo publicar la pasarela de pruebas</summary>
      <p>Arranca la instancia sandbox en otra terminal:</p><code class="developer-command">npm run dev:uber</code>
      <p>En macOS o Linux, dirige la pasarela al puerto 5175:</p><code class="developer-command">LIBREPOS_PORT=5175 npm run uber:webhook</code>
      <p>En PowerShell:</p><code class="developer-command">$env:LIBREPOS_PORT = '5175'<br>npm run uber:webhook</code>
      <p>Publica únicamente <code>127.0.0.1:8788</code> con un túnel HTTPS. Conserva el cuerpo y la cabecera de firma. Los puertos 5173 y 5175 son del POS y no deben publicarse.</p>
    </details>
  </aside>`;
}

function testingPanel(runtime) {
  return `<div class="developer-grid"><section class="panel uber-config">
    <span class="developer-eyebrow">PRUEBAS LOCALES</span><h2>Recorrido simulado</h2>
    <p>Comprueba las comandas, el inventario y Pago Uber con un pedido ficticio de dos cafés por $80.</p>
    ${runtime.demo ? '<p class="uber-notice">Estás en una demo aislada. Este pedido no contacta con Uber.</p><button type="button" class="primary-button" data-uber-demo>Crear pedido simulado</button>' : '<p>Abre una instancia aislada para simular pedidos:</p><code class="developer-command">npm run dev:demo</code><p>Entra en el puerto 5174 con los usuarios de la demo y abre Desarrollo → Pruebas.</p>'}
    <ol><li>Abre Uber Eats y acepta el pedido.</li><li>En Cocina, prepara y marca listo.</li><li>Confirma la entrega desde Uber Eats.</li><li>Comprueba $80 en Pago Uber y $0 en efectivo y tarjeta por esa venta.</li></ol>
    <button type="button" class="secondary-button" data-nav="uber">Abrir pedidos Uber Eats</button>
  </section><section class="panel uber-config">
    <span class="developer-eyebrow">PRUEBAS CON UBER</span><h2>Validar el sandbox</h2>
    <p>Necesitas una app con acceso a Eats Marketplace, una tienda de pruebas vinculada, su menú y permisos de pedidos.</p>
    <ol><li>Inicia <code>npm run dev:uber</code> y configura la conexión en el puerto 5175.</li><li>Usa Probar conexión guardada para comprobar OAuth y lectura de tienda.</li><li>Publica la pasarela, registra el webhook HTTPS en Uber y habilita la recepción.</li><li>Genera un pedido con el procedimiento sandbox de tu cuenta y revisa Recepción.</li><li>Relaciona sus productos en Uber Eats, acepta y comprueba cocina, inventario y Pago Uber.</li></ol>
    <p>La simulación local no prueba credenciales ni webhooks. La conexión correcta tampoco confirma por sí sola la recepción de pedidos.</p>
    <button type="button" class="secondary-button" data-developer-tab="events">Revisar recepción</button>
  </section></div>`;
}

export function renderDeveloperPanel(runtime, user) {
  if (!isPermissionsAdmin(user)) return '';
  const config = runtime.config || {};
  const status = runtime.demo ? 'Demo aislada' : config.enabled ? 'Recepción habilitada' : 'Recepción desactivada';
  return `<div class="uber-panel developer-panel" data-developer-panel data-uber-panel>
    <header class="uber-header"><div><span class="developer-eyebrow">ADMINISTRACIÓN · SOLO ADMIN</span><h1>Desarrollo</h1><p>Conecta Uber Eats y comprueba cada paso antes de recibir pedidos reales.</p></div><div class="uber-actions"><span class="uber-state">${status}</span><button type="button" class="secondary-button" data-uber-refresh>Actualizar</button></div></header>
    <nav class="uber-tabs" aria-label="Secciones de Desarrollo">${[['connection', 'Conexión Uber'], ['tests', 'Pruebas'], ['events', 'Recepción']].map(([id, name]) => `<button type="button" data-developer-tab="${id}" aria-pressed="${activeTab === id}">${name}</button>`).join('')}</nav>
    ${renderUberFeedback(runtime)}
    ${!runtime.loaded ? '<p class="uber-notice">Cargando configuración del servidor…</p>' : `
      <div class="developer-status" aria-label="Configuración guardada">
        <div><span>Entorno</span><strong>${config.environment === 'production' ? 'Producción' : 'Sandbox'}</strong></div>
        <div><span>Credenciales guardadas</span><strong>${config.clientId && config.hasClientSecret && config.storeId ? 'Completas' : 'Pendientes'}</strong></div>
        <div><span>URL del webhook</span><strong>${config.publicWebhookUrl ? 'Guardada' : 'Pendiente'}</strong></div>
      </div>
      ${activeTab === 'connection' ? `<div class="developer-grid"><div>${renderUberConfiguration(runtime)}</div>${webhookPanel(config)}</div>` : activeTab === 'tests' ? testingPanel(runtime) : renderUberEvents(runtime, user)}
    `}
  </div>`;
}

export function bindDeveloperPanel({ render, toast }) {
  const root = document.querySelector('[data-developer-panel]');
  if (!root) return;
  root.querySelectorAll('[data-developer-tab]').forEach(button => button.addEventListener('click', () => { activeTab = button.dataset.developerTab; render(); }));
  root.querySelector('[data-copy-webhook]')?.addEventListener('click', async () => {
    const input = root.querySelector('[data-webhook-url]');
    try { await navigator.clipboard.writeText(input.value); toast('URL del webhook copiada.'); }
    catch { input.focus(); input.select(); toast('URL seleccionada. Usa Copiar en tu dispositivo.'); }
  });
}
