import { getHelpReply } from "./help-assistant.js";

// Conversation belongs only to the current session, never to shared restaurant data.
let conversation = [];
let previousIntent = null;
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const starters = [
  ["Crear un platillo", "Quiero crear un platillo"],
  ["Crear o editar una receta", "Quiero crear una receta"],
  ["Quitar un plato", "Quiero quitar un plato"],
  ["Cambiar un precio", "Cambiar precio"],
  ["Añadir un insumo", "Crear insumo"],
  ["Resolver un problema", "Necesito ayuda con un problema"],
  ["Corregir un pago", "Corregir un pago"],
  ["Conectar un teléfono", "El teléfono no abre el QR"],
];

export function resetHelpChat() {
  conversation = [];
  previousIntent = null;
}

function renderReply(reply, index, articles) {
  return `<div class="chat-message is-assistant"><span class="chat-avatar" aria-hidden="true">L</span><div class="chat-message-body">
    <span class="chat-sender">Ayuda LibrePOS</span><p>${escape(reply.text).replace(/\n/g, "<br>")}</p>
    ${reply.actions?.length ? `<div class="chat-actions">${reply.actions.map((action, actionIndex) => `<button type="button" class="primary-button compact" data-chat-action="${index}:${actionIndex}">${escape(action.label)} <span aria-hidden="true">↗</span></button>`).join("")}</div>` : ""}
    ${reply.articleIds?.length ? `<div class="chat-guides"><small>GUÍAS CON IMÁGENES</small>${reply.articleIds.map((id) => articles.find((article) => article.id === id)).filter(Boolean).map((article) => `<button type="button" data-chat-article="${escape(article.id)}"><span>▤</span>${escape(article.title)}<span aria-hidden="true">→</span></button>`).join("")}</div>` : ""}
    ${reply.suggestions?.length ? `<div class="chat-options" aria-label="Opciones para continuar">${reply.suggestions.map((suggestion) => `<button type="button" data-chat-query="${escape(suggestion.query)}">${escape(suggestion.label)}</button>`).join("")}</div>` : ""}
  </div></div>`;
}

export function renderHelpChat(articles) {
  return `<div class="help-hub">
    <section class="panel help-chat" aria-labelledby="chat-title">
      <header class="chat-header"><span class="chat-avatar" aria-hidden="true">L</span><div><h2 id="chat-title">Vamos paso a paso <span class="beta-pill">Beta</span></h2><p>Ayuda básica · Disponible sin conexión</p></div><button class="ghost-button compact" type="button" data-chat-reset ${conversation.length ? "" : "disabled"}>Nueva consulta</button></header>
      <div class="chat-transcript" role="log" aria-live="polite" aria-label="Conversación de ayuda" tabindex="0">
        <div class="chat-message is-assistant"><span class="chat-avatar" aria-hidden="true">L</span><div class="chat-message-body"><span class="chat-sender">Ayuda LibrePOS</span><p>Hola. ¿Qué quieres hacer hoy?</p><p class="chat-muted">Escribe una tarea o elige una opción. Te mostraré los pasos y dónde hacerlo.</p><div class="chat-options">${starters.map(([label, query]) => `<button type="button" data-chat-query="${escape(query)}">${label}</button>`).join("")}</div></div></div>
        ${conversation.map((entry, index) => entry.role === "user" ? `<div class="chat-message is-user"><div class="chat-message-body"><span class="chat-sender">Tú</span><p>${escape(entry.text)}</p></div></div>` : renderReply(entry.reply, index, articles)).join("")}
      </div>
      <form class="chat-composer" data-help-chat-form><label class="sr-only" for="help-chat-query">¿Qué necesitas hacer?</label><input id="help-chat-query" name="query" maxlength="400" autocomplete="off" required placeholder="Ej. quiero añadir un plato o cambiar una receta…" /><button type="submit" class="primary-button">Consultar <span aria-hidden="true">→</span></button></form>
      <p class="chat-footnote">Reconoce palabras clave. Te orienta y abre formularios; tú revisas y guardas. La conversación se borra al recargar o cerrar sesión.</p>
    </section>
    <aside class="help-hub-aside"><section class="help-welcome"><span class="help-eyebrow">APRENDE A TU RITMO</span><h2>Menos dudas.<br>Más servicio.</h2><p>Guías cortas, ejemplos y recorridos visuales para las tareas de cada día.</p><button type="button" class="secondary-button" data-help-library>Explorar todos los tutoriales <span aria-hidden="true">→</span></button></section>
    <section class="help-quick-guides"><h3>Empieza por aquí</h3>${["correct-payment", "lan-access", "create-edit-recipe", "payment-terminals"].map((id, index) => articles.find((article) => article.id === id)).filter(Boolean).map((article, index) => `<button type="button" data-chat-article="${escape(article.id)}"><span>0${index + 1}</span><div><strong>${escape(article.title)}</strong><small>${escape(article.duration)} · Paso a paso</small></div><b aria-hidden="true">↗</b></button>`).join("")}</section>
    <p class="help-beta-note"><span class="beta-pill">Beta</span> Si una frase no se reconoce, prueba con «receta», «platillo», «caja» o «impresora». Esta ayuda no conecta con una persona.</p></aside>
  </div>`;
}

export function bindHelpChat({ articles, functions, rerender, openArticle, openAction, openLibrary }) {
  const ask = (query) => {
    query = String(query || "").trim().slice(0, 400);
    if (!query) return;
    const reply = getHelpReply(query, { articles, functions, previousIntent });
    previousIntent = reply.intent;
    conversation.push({ role: "user", text: query }, { role: "assistant", reply });
    conversation = conversation.slice(-24);
    rerender();
    const transcript = document.querySelector(".chat-transcript");
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
    document.querySelector("#help-chat-query")?.focus({ preventScroll: true });
  };
  document.querySelector("[data-help-chat-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(new FormData(event.currentTarget).get("query"));
  });
  document.querySelectorAll("[data-chat-query]").forEach((button) => button.addEventListener("click", () => ask(button.dataset.chatQuery)));
  document.querySelectorAll("[data-chat-article]").forEach((button) => button.addEventListener("click", () => openArticle(button.dataset.chatArticle)));
  document.querySelectorAll("[data-chat-action]").forEach((button) => button.addEventListener("click", () => {
    const [index, actionIndex] = button.dataset.chatAction.split(":").map(Number);
    const action = conversation[index]?.reply?.actions?.[actionIndex];
    if (action) openAction(action);
  }));
  document.querySelector("[data-chat-reset]")?.addEventListener("click", () => { resetHelpChat(); rerender(); document.querySelector("#help-chat-query")?.focus(); });
  document.querySelector("[data-help-library]")?.addEventListener("click", openLibrary);
}
