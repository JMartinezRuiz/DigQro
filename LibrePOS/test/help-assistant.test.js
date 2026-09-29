import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getHelpReply } from "../src/help-assistant.js";

const { articles } = JSON.parse(readFileSync(new URL("../src/help-content.json", import.meta.url), "utf8"));
const admin = { articles, functions: ["admin"] };

test("recognizes Spanish accents, common misspellings and recipe units", () => {
  for (const query of ["¿CÓMO CREO UN PLATILLO?", "crear platilo", "crear bebida"]) {
    const reply = getHelpReply(query, admin);
    assert.equal(reply.intent, "create-product", query);
    assert.equal(reply.actions[0].modal, "new-product");
  }
  const recipe = getHelpReply("como crear una reseta", admin);
  assert.equal(recipe.intent, "create-recipe");
  assert.match(recipe.text, /0\.15/);
  assert.match(recipe.text, /al comandar/);
  assert.equal(getHelpReply("aladir platos", admin).intent, "add-product-choice");
  assert.equal(getHelpReply("Editar presio de las bebidas", admin).intent, "edit-price");
});

test("disambiguates menu availability, order lines and whole order cancellation", () => {
  const ambiguous = getHelpReply("quiero quitar un plato", admin);
  assert.equal(ambiguous.intent, "remove-choice");
  assert.equal(ambiguous.actions.length, 0);
  assert.deepEqual(ambiguous.suggestions.map(({ query }) => getHelpReply(query, admin).intent), ["hide-product", "remove-line", "cancel-order"]);
  assert.equal(getHelpReply("eliminar plato del catálogo", admin).intent, "hide-product");
  assert.equal(getHelpReply("quitar el plato de la cuenta", admin).intent, "remove-line");
  assert.equal(getHelpReply("cancelar cuenta completa", admin).intent, "cancel-order");
  assert.equal(getHelpReply("cancelar venta cobrada", admin).intent, "data");
  assert.equal(getHelpReply("quitar receta de un platillo", admin).intent, "create-recipe");
  const recipeIngredient = getHelpReply("quitar ingrediente de receta", admin);
  assert.equal(recipeIngredient.intent, "remove-recipe-ingredient");
  assert.match(recipeIngredient.text, /papelera «Quitar insumo de la receta»/);
  assert.match(recipeIngredient.text, /al menos un insumo/);
});

test("short follow-ups resolve only a current disambiguation", () => {
  const context = { ...admin, previousIntent: "remove-choice" };
  assert.equal(getHelpReply("del catálogo", context).intent, "hide-product");
  assert.equal(getHelpReply("de la orden", context).intent, "remove-line");
  assert.equal(getHelpReply("3", context).intent, "cancel-order");
  assert.equal(getHelpReply("3", admin).intent, "unknown");
  assert.equal(getHelpReply("crear receta", context).intent, "create-recipe");
  assert.equal(getHelpReply("uno nuevo", { ...admin, previousIntent: "add-product-choice" }).intent, "create-product");
});

test("distinguishes product creation and recipe ingredients from live ordering", () => {
  assert.equal(getHelpReply("agregar un platillo a una orden", admin).intent, "add-to-order");
  assert.equal(getHelpReply("añadir un plato a la mesa", admin).intent, "add-to-order");
  assert.equal(getHelpReply("agregar un extra a una orden", admin).intent, "configure-product");
  assert.equal(getHelpReply("crear un extra", admin).intent, "create-extra");
  assert.equal(getHelpReply("no aparece un insumo en mi receta", admin).intent, "ingredient-missing");
  assert.equal(getHelpReply("no veo el platillo en Venta", admin).intent, "show-product");
  assert.equal(getHelpReply("crear ingredientes", admin).intent, "create-ingredient");
  assert.equal(getHelpReply("registrar compra de insumos", admin).intent, "inventory-purchase");
});

test("handles the basic cash, stock, kitchen and printing flows", () => {
  const cases = [
    ["abrir caja", "cash"], ["cerrar caja", "cash"], ["no puedo cerrar caja", "cash"],
    ["abrir una mesa", "open-order"], ["cobrar la cuenta", "checkout"],
    ["registrar una compra", "inventory-purchase"], ["registrar merma", "inventory-waste"],
    ["hacer inventario completo", "inventory-count"], ["inventario", "inventory"],
    ["no puedo inprimir", "printing"], ["problemas de impresión", "printing"],
    ["no imprime el ticket", "printing"],
    ["reimprimir la cuenta", "tickets"], ["ticket prepago y postpago", "tickets"],
    ["comandar productos", "command"], ["flujo de cocina", "kitchen"],
    ["configurar IVA", "iva"], ["permisos de usuario", "users"],
    ["registrar entrada o salida", "profile"], ["hacer un respaldo", "backup"],
  ];
  for (const [query, expected] of cases) assert.equal(getHelpReply(query, admin).intent, expected, query);
});

test("discount questions explain how to quote a ticket before closing the account", () => {
  for (const query of ["agregar descuento antes de imprimir", "descuento en el ticket prepago", "cuanto paga el cliente con descuento", "quitar descuento de la cuenta"]) {
    const reply = getHelpReply(query, admin);
    assert.equal(reply.intent, "tickets", query);
    assert.match(reply.text, /Total para el cliente/);
    assert.match(reply.text, /Guardar prepago/);
    assert.match(reply.text, /sin guardar descarta/);
    assert.match(reply.text, /no se aplica una segunda vez/);
  }
});

test("31 natural phrases keep catalogue edits separate from live service", () => {
  const phrases = [
    ["Quiero crear un platillo", "create-product"],
    ["Quiero crear una receta", "create-recipe"],
    ["Quiero quitar un plato", "remove-choice"],
    ["Cambiar precio", "edit-price"],
    ["Crear insumo", "create-ingredient"],
    ["Necesito ayuda con un problema", "troubleshoot"],
    ["como pongo un plato nuevo", "create-product"],
    ["como agrego una bebida al menu", "create-product"],
    ["no puedo guardar mi receta", "recipe-validation"],
    ["quiero quitar cebolla de mi receta", "remove-recipe-ingredient"],
    ["quiero borrar un ingrediente de receta", "remove-recipe-ingredient"],
    ["necesito añadir un plato a la mesa 4", "add-to-order"],
    ["retirar un producto de una cuenta", "remove-line"],
    ["cancelar sólo dos piezas de una orden", "remove-line"],
    ["quitar una comanda", "remove-choice"],
    ["dar de baja una bebida", "hide-product"],
    ["como subo un precio", "edit-price"],
    ["activar un plato", "show-product"],
    ["no aparece el producto", "show-product"],
    ["añadir queso extra", "add-extra-choice"],
    ["registrar una compra de queso", "inventory-purchase"],
    ["quiero cargar existencias", "inventory"],
    ["el ticket no sale", "printing"],
    ["no abre caja", "cash"],
    ["ya cobre pero no imprimio", "printing"],
    ["cambiar el IVA de la cuenta", "iva"],
    ["borrar venta duplicada", "data"],
    ["registrar mi salida", "profile"],
    ["donde cambio contraseña", "users"],
    ["no se descuenta el inventario", "inventory"],
    ["no me deja guardar el platillo", "recipe-validation"],
  ];
  for (const [query, intent] of phrases) {
    const reply = getHelpReply(query, admin);
    assert.equal(reply.intent, intent, query);
    assert.ok(reply.suggestions.length >= 2, query);
    for (const choice of reply.suggestions) {
      assert.equal(getHelpReply(choice.query, { ...admin, previousIntent: intent }).matched, true, `${query} → ${choice.label}`);
    }
  }
});

test("troubleshooting starter leads to specific checks and IVA opens the correct settings", () => {
  const reply = getHelpReply("Necesito ayuda con un problema", admin);
  assert.equal(reply.intent, "troubleshoot");
  assert.deepEqual(reply.suggestions.map(({ query }) => getHelpReply(query, admin).intent), ["printing", "show-product", "recipe-validation", "cash"]);
  const validateRecipe = getHelpReply("no puedo guardar mi receta", admin);
  assert.match(validateRecipe.text, /subcategoría/);
  assert.match(validateRecipe.text, /mayor que cero/);
  assert.equal(getHelpReply("configurar IVA", admin).actions[0].configTab, "general");
  assert.equal(getHelpReply("problemas de impresión", admin).actions[0].configTab, "printing");
  assert.deepEqual(getHelpReply("configurar IVA", { functions: ["caja"] }).actions, []);
});

test("navigation follows current roles and never describes saving or destructive actions", () => {
  const queries = ["crear platillo", "crear receta", "crear insumo", "crear extra", "quitar plato", "ocultar plato", "quitar linea comandada", "cancelar orden", "abrir caja", "inventario", "imprimir", "permisos", "cocina"];
  for (const query of queries) {
    const withoutRoles = getHelpReply(query, { articles });
    assert.equal(withoutRoles.actions.length, 0, query);
    for (const action of getHelpReply(query, admin).actions) {
      assert.ok(["recipes", "sale", "tables", "kitchen", "cash", "inventory", "config", "data", "users"].includes(action.view));
      if (action.modal) assert.ok(["new-product", "new-ingredient", "new-extra"].includes(action.modal));
      assert.ok(!/(delete|remove|cancel|save|toggle|print)/.test(action.id));
      assert.equal(action.productId, undefined);
      assert.equal(action.orderId, undefined);
    }
  }
  assert.deepEqual(getHelpReply("abrir caja", { functions: ["mesero"] }).actions, []);
  assert.equal(getHelpReply("abrir caja", { functions: ["caja"] }).actions[0].view, "cash");
  assert.deepEqual(getHelpReply("crear platillo", { functions: ["mesero", "caja"] }).actions, []);
  assert.deepEqual(getHelpReply("comandar", { functions: ["cocina"] }).actions.map(({ view }) => view), ["kitchen"]);
});

test("unknown terms do not claim success or interpret substrings as commands", () => {
  for (const query of ["astronomía", "un encajado", "mi recetario favorito", "eliminar todo ahora <script>alert(1)</script>"]) {
    const reply = getHelpReply(query, admin);
    assert.equal(reply.actions.length, 0, query);
    assert.ok(reply.suggestions.length >= 2);
    assert.doesNotMatch(reply.text, /<script>|He eliminado|He creado/);
  }
  const customGuide = { id: "custom-guide", title: "Exportar asistencia", summary: "Consulta las jornadas", tags: ["exportacion"] };
  const match = getHelpReply("exportacion", { articles: [customGuide] });
  assert.equal(match.intent, "article-search");
  assert.deepEqual(match.articleIds, ["custom-guide"]);
  assert.equal(getHelpReply("por favor necesito ayuda", { articles }).matched, false);
});

test("links remain valid, output is deterministic and suggestions do not mutate shared replies", () => {
  const originalArticles = JSON.stringify(articles);
  const first = getHelpReply("crear receta", admin);
  const expected = structuredClone(first);
  first.suggestions[0].label = "changed";
  first.articleIds.push("not-an-article");
  first.actions[0].label = "changed";
  assert.deepEqual(getHelpReply("crear receta", admin), expected);
  assert.equal(JSON.stringify(articles), originalArticles);
  assert.deepEqual(getHelpReply("crear platillo", { articles: [] }).articleIds, []);
  const knownIds = new Set(articles.map(({ id }) => id));
  const queue = ["hola"];
  const visited = new Set();
  while (queue.length) {
    const query = queue.shift();
    const reply = getHelpReply(query, admin);
    if (visited.has(reply.intent)) continue;
    visited.add(reply.intent);
    assert.equal(reply.beta, true);
    assert.equal(reply.matched, true, query);
    assert.ok(reply.articleIds.every((id) => knownIds.has(id)), query);
    queue.push(...reply.suggestions.map(({ query: next }) => next));
  }
  assert.ok(visited.size >= 12);
});

test("correcciones, terminales y conexión se distinguen de un cobro nuevo", () => {
  const cases = [
    ["Me equivoqué: tarjeta a efectivo", "correct-payment"],
    ["Cambiar forma de pago de una cuenta cerrada", "correct-payment"],
    ["corregir propina después del corte", "correct-payment"],
    ["cambiar terminal de un pago", "correct-payment"],
    ["Configurar terminales", "payment-terminals"],
    ["tarjeta de crédito o débito", "payment-terminals"],
    ["el QR no funciona", "lan-access"],
    ["no abre el link desde el teléfono en la misma red", "lan-access"],
    ["no se sincronizan las mesas", "sync"],
    ["otro equipo no ve la comanda", "sync"],
    ["cobrar con tarjeta", "checkout"],
  ];
  for (const [query, intent] of cases) {
    const reply = getHelpReply(query, admin);
    assert.equal(reply.intent, intent, query);
    assert.ok(reply.articleIds.length > 0, query);
    for (const next of reply.suggestions) assert.ok(getHelpReply(next.query, admin).matched, next.query);
  }
  assert.match(getHelpReply("corregir un pago", admin).text, /conserva el contado/);
  assert.match(getHelpReply("no se sincronizan", admin).text, /No borres datos/);
  assert.equal(getHelpReply("configurar terminales", admin).actions[0].configTab, "terminals");
  assert.deepEqual(getHelpReply("configurar terminales", { ...admin, functions: ["caja"] }).actions, []);
  assert.deepEqual(getHelpReply("corregir un pago", { ...admin, functions: ["mesero"] }).actions, []);
  assert.deepEqual(getHelpReply("corregir un pago", { ...admin, functions: ["caja"] }).actions.map(a => a.view), ["cash"]);
});

test('Uber guidance distinguishes platform payment from normal cash checkout', () => {
  const reply = getHelpReply('como cobrar un pedido Uber Eats');
  assert.equal(reply.intent, 'uber');
  assert.match(reply.text, /no se cobran en efectivo ni tarjeta/);
  assert.ok(reply.articleIds.includes('uber-eats'));
  assert.equal(reply.actions.length, 0);
});
