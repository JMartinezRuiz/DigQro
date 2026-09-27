// Pure rendering keeps all editorial text escaped, including future imported guides.
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

export function helpDetailSearchText(article) {
  return [article.example?.title, article.example?.detail,
    ...(article.troubleshooting || []).flatMap((item) => [item.symptom, item.resolution]),
    ...(article.verification || [])].filter(Boolean).join(" ");
}

export function renderHelpDetails(article) {
  return `${article.example ? `<section class="help-example"><h3>Ejemplo práctico: ${escape(article.example.title)}</h3><p>${escape(article.example.detail)}</p></section>` : ""}
    ${(article.troubleshooting || []).length ? `<section class="help-troubleshooting" aria-label="Si algo no funciona"><h3>Si algo no funciona</h3><p>Abre el caso que coincide con lo que ves.</p>${article.troubleshooting.map((item) => `<details><summary>${escape(item.symptom)}</summary><p>${escape(item.resolution)}</p></details>`).join("")}</section>` : ""}
    ${(article.verification || []).length ? `<section class="help-verification"><h3>Comprueba antes de terminar</h3><ul>${article.verification.map((item) => `<li>${escape(item)}</li>`).join("")}</ul></section>` : ""}`;
}
