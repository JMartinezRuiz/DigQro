import { helpDetailSearchText } from "./help-details.js";

/**
 * Local, deterministic help assistant. No network, DOM, storage or mutations.
 *
 * getHelpReply(query, { articles, functions, previousIntent }) returns plain text:
 * { intent, text, suggestions: [{ label, query }], articleIds, actions, matched, beta }.
 * `functions` contains the current user's role IDs (admin/mesero/caja/cocina).
 * An action is only a navigation/form descriptor: { id, label, view, modal?,
 * catalogMode?, configTab? }. The UI must recheck permissions when opening it; no descriptor
 * saves data, selects a product, changes availability, cancels or prints anything.
 * Omitted roles expose guidance but no privileged navigation. If `articles` is
 * supplied, article links are restricted to those IDs; omission uses known guides.
 */

const ALIASES = {
  anadir: "agregar", anado: "agregar", anadirlo: "agregar", anadirle: "agregar",
  agregarle: "agregar", agregarlo: "agregar", agrego: "agregar", agregra: "agregar",
  aladir: "agregar", aniadir: "agregar", crearle: "crear", creo: "crear", creear: "crear",
  platillos: "platillo", platos: "platillo", plato: "platillo", platilo: "platillo",
  platilos: "platillo", platiilo: "platillo", productos: "producto", bebidas: "bebida",
  recetas: "receta", reseta: "receta", resetas: "receta", recata: "receta",
  insumos: "insumo", ingredientes: "insumo", ingrediente: "insumo", extrass: "extra",
  extras: "extra", complementos: "extra", complemento: "extra", precios: "precio",
  presio: "precio", presios: "precio", costo: "costo", mesas: "mesa", ordenes: "orden",
  pedidos: "pedido", tickets: "ticket", lineas: "linea", comandas: "comanda", piezas: "pieza",
  quitarlo: "quitar", quitarle: "quitar", quito: "quitar", borrarlo: "borrar", borro: "borrar",
  eliminarlos: "eliminar", eliminarlo: "eliminar", elimino: "eliminar", ocultarlo: "ocultar",
  desactivarlo: "desactivar", desactivo: "desactivar", cancelarlo: "cancelar", cancelo: "cancelar",
  modificarlo: "modificar", modifico: "modificar", cambiarlo: "cambiar", cambio: "cambiar",
  editarlo: "editar", edito: "editar", impresoras: "impresora", imprecion: "impresion",
  impresionn: "impresion", imprimirlo: "imprimir", inprimir: "imprimir", imprime: "imprimir",
  imprimo: "imprimir", imprimiendo: "imprimir", imprimio: "imprimir",
  inventarioo: "inventario", imventario: "inventario", compras: "compra", mermas: "merma",
  usuarios: "usuario", permisos: "permiso", tutoriales: "tutorial", gifs: "gif",
};

function normalize(value) {
  return String(value ?? "").slice(0, 2000).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ")
    .trim().split(/\s+/).map((word) => ALIASES[word] || word).join(" ");
}

const suggestion = (label, query = label) => ({ label, query });
const STARTERS = [
  suggestion("Crear un platillo"), suggestion("Crear una receta"),
  suggestion("Quitar un platillo"), suggestion("Problemas de impresión"),
  suggestion("Corregir un pago"), suggestion("El teléfono no abre el QR"),
];

const ACTIONS = {
  "terminal-config": { label: "Revisar terminales", view: "config", configTab: "terminals", role: "admin" },
  "new-product": { label: "Crear platillo", view: "recipes", catalogMode: "products", modal: "new-product", role: "admin" },
  "new-ingredient": { label: "Crear insumo", view: "recipes", catalogMode: "ingredients", modal: "new-ingredient", role: "admin" },
  "new-extra": { label: "Crear extra", view: "recipes", catalogMode: "extras", modal: "new-extra", role: "admin" },
  catalog: { label: "Abrir catálogo", view: "recipes", catalogMode: "products", role: "admin" },
  ingredients: { label: "Ver insumos", view: "recipes", catalogMode: "ingredients", role: "admin" },
  sale: { label: "Ir a Venta", view: "sale", role: "mesero" },
  tables: { label: "Ver mesas", view: "tables", role: "mesero" },
  kitchen: { label: "Ir a Cocina", view: "kitchen", role: "cocina" },
  cash: { label: "Abrir sección Caja", view: "cash", role: "caja" },
  inventory: { label: "Ir a Inventario", view: "inventory", role: "admin" },
  config: { label: "Revisar impresión", view: "config", configTab: "printing", role: "admin" },
  "tax-config": { label: "Revisar IVA", view: "config", configTab: "general", role: "admin" },
  data: { label: "Ir a Datos", view: "data", role: "admin" },
  users: { label: "Ir a Usuarios", view: "users", role: "admin" },
  profile: { label: "Ir a Mi perfil", view: "profile" },
};

const REPLIES = {
  "correct-payment": {
    text: "Para corregir una cuenta cobrada, busca la venta en Caja o en Datos si tienes acceso y pulsa Corregir pago.\n1. Comprueba folio y total.\n2. Elige por separado el pago del consumo y el de la propina.\n3. Indica efectivo realmente recibido o terminal y Crédito/Débito si alguna parte va con tarjeta.\n4. Escribe el motivo, guarda y revisa la confirmación.\nEl total no cambia. Queda historial y se ajusta caja; en un corte cerrado se conserva el contado y se recalculan esperado y diferencia. Por defecto solo administración puede corregir pagos. Puede conceder permisos por usuario en Usuarios → Editar → Permiso para corregir pagos: Sin permiso, Solo caja abierta o Cualquier caja. Otros usuarios necesitan además la función Caja. Usa Desplazar tabla y sus flechas si no ves las últimas columnas. Reimprime el postpago corregido. Esto no realiza movimientos bancarios.",
    articleIds: ["correct-payment", "cash-daily", "payment-terminals"], actions: ["cash", "data"],
    suggestions: [suggestion("Configurar terminales"), suggestion("Reimprimir una cuenta"), suggestion("Cerrar caja")],
  },
  "payment-terminals": {
    text: "Administración configura los equipos en Configuración → Terminales: cambia el nombre, guarda, crea otra terminal o desmarca Disponible para nuevos pagos. Al cobrar, Caja selecciona Terminal utilizada y Crédito o Débito si consumo o propina lleva tarjeta. Verifica esos datos contra el comprobante. Las ventas conservan el nombre usado al cobrar; registros antiguos pueden decir sin registrar. Una terminal de LibrePOS es un dato de registro y no se conecta al banco.",
    articleIds: ["payment-terminals", "checkout-discounts-tips", "correct-payment"], actions: ["terminal-config"],
    suggestions: [suggestion("Corregir un pago"), suggestion("Cobrar la cuenta")],
  },
  "lan-access": {
    text: "Primero comprueba que LibrePOS abra en el equipo servidor y deja su ventana abierta. Un administrador obtiene el enlace en Mi perfil → Acceso web → Actualizar direcciones. Conecta el teléfono a la misma red y abre la dirección completa, con http y puerto; localhost y 127.0.0.1 sólo apuntan al propio teléfono. Si el QR no se lee, escribe el enlace. Si tampoco abre, revisa servidor despierto, WiFi de invitados, aislamiento entre dispositivos, VPN y permiso del firewall para el puerto. Si el servidor sólo acepta conexiones locales, reinícialo con el lanzador actualizado. La demo suele usar 5174 y la operación 5173; tienen datos distintos.",
    articleIds: ["lan-access", "backup-update", "users-permissions"], actions: ["profile"],
    suggestions: [suggestion("No se sincronizan las mesas"), suggestion("Hacer un respaldo")],
  },
  sync: {
    text: "Compara la dirección y el puerto en ambos dispositivos: deben entrar al mismo servidor. Una pantalla abierta puede seguir mostrando datos locales aunque se haya perdido la conexión. Antes de repetir un cobro o comanda, comprueba en el servidor si ya llegó. Recupera la conexión y contrasta la cuenta en ambos equipos. No borres datos del navegador si hay cambios pendientes ni cobres simultáneamente la misma cuenta desde dos equipos. Si persiste, anota folio, hora y operación y solicita revisión a administración.",
    articleIds: ["lan-access", "command-order", "backup-update"], actions: ["profile"],
    suggestions: [suggestion("El teléfono no abre el QR"), suggestion("Buscar una cuenta en Datos")],
  },
  welcome: {
    text: "Soy la ayuda de LibrePOS en beta. Escribe lo que necesitas, por ejemplo «crear receta» o «quitar un plato». Reconozco palabras clave y te propongo pasos, tutoriales y accesos. Tú revisas y confirmas los cambios en cada formulario.",
    suggestions: STARTERS,
  },
  troubleshoot: {
    text: "Vamos a ubicar el problema. Elige lo que está pasando y te mostraré las primeras comprobaciones. También puedes escribir una frase concreta, como «no aparece un platillo», «no imprime el ticket» o «no puedo guardar la receta».",
    suggestions: [suggestion("No imprime el ticket"), suggestion("No aparece un platillo"), suggestion("No puedo guardar la receta"), suggestion("No puedo cerrar caja")],
    articleIds: ["printer-setup", "deactivate-product", "create-edit-recipe", "cash-daily"],
  },
  "create-product": {
    text: "Para crear un platillo o bebida necesitas función de administrador.\n1. Abre Catálogo → Crear → Platillo o bebida.\n2. Completa nombre, categoría y precio base sin IVA; revisa el precio final.\n3. Define la receta con insumos y cantidades por unidad vendida.\n4. Revisa Disponible en Venta y pulsa Crear platillo o bebida.\nSi aún no tienes los ingredientes, crea primero los insumos.",
    articleIds: ["create-product", "create-ingredient"], actions: ["new-product", "new-ingredient"],
    suggestions: [suggestion("Crear un insumo"), suggestion("Cómo crear la receta", "Crear una receta"), suggestion("Entender el precio y el IVA", "Editar precio de un platillo")],
  },
  "create-recipe": {
    text: "La receta se guarda dentro de cada platillo. Necesitas función de administrador.\n1. Abre Catálogo → Platillos y bebidas. Crea un producto o busca uno y pulsa Editar.\n2. En Receta selecciona cada insumo y su cantidad por una unidad vendida. Usa Añadir otro insumo para completar la preparación.\n3. Comprueba la unidad: por ejemplo, 150 g son 0.15 si el insumo se controla en KG.\n4. Usa Variantes de receta si una opción cambia los ingredientes; después revisa y guarda.\nEl inventario se descuenta al comandar. Una nota como «sin cebolla» no cambia la receta automáticamente.",
    articleIds: ["create-edit-recipe", "create-product", "create-ingredient", "configure-product"], actions: ["catalog", "new-product"],
    suggestions: [suggestion("No aparece un insumo", "No aparece un insumo en la receta"), suggestion("Crear un insumo"), suggestion("Configurar variantes", "Variantes de receta")],
  },
  "remove-recipe-ingredient": {
    text: "Para quitar un ingrediente de una receta, un administrador abre Catálogo → Platillos y bebidas → Editar en el producto correcto. En la fila del ingrediente pulsa la papelera «Quitar insumo de la receta» y revisa las cantidades de los restantes. Conserva al menos un insumo con cantidad mayor que cero, porque la receta es obligatoria. Comprueba también las variantes que usen ese ingrediente y guarda los cambios. Esto edita la receta del platillo; no borra el insumo del inventario.",
    articleIds: ["create-edit-recipe", "create-product"], actions: ["catalog"],
    suggestions: [suggestion("Editar toda la receta", "Crear una receta"), suggestion("No aparece un insumo", "No aparece un insumo en la receta"), suggestion("Ocultar el platillo", "Desactivar un platillo del catálogo")],
  },
  "recipe-validation": {
    text: "Si el platillo o su receta no se guardan, revisa el aviso del formulario. Se necesitan nombre, categoría, subcategoría y un precio base mayor que cero. En Receta debe haber al menos un insumo seleccionado con una cantidad mayor que cero; las filas «Sin insumo» no cuentan. Revisa también las unidades antes de volver a guardar. Si falta un ingrediente en el selector, comprueba que esté habilitado para recetas.",
    articleIds: ["create-edit-recipe", "create-product", "create-ingredient"], actions: ["catalog"],
    suggestions: [suggestion("No aparece un insumo", "No aparece un insumo en la receta"), suggestion("Revisar receta", "Crear una receta"), suggestion("Revisar precio", "Editar precio")],
  },
  "ingredient-missing": {
    text: "Si un insumo no aparece en la receta, un administrador puede revisar Catálogo → Insumos. Busca el insumo y comprueba que esté activado «Se puede seleccionar en recetas y extras». Su categoría también debe permitir recetas. Si no existe, créalo con la unidad y costo correctos. Después vuelve a editar el platillo.",
    articleIds: ["create-ingredient", "create-product"], actions: ["ingredients", "new-ingredient"],
    suggestions: [suggestion("Crear un insumo"), suggestion("Volver a la receta", "Crear una receta")],
  },
  "create-ingredient": {
    text: "Un insumo es un ingrediente o artículo de uso interno. Necesitas función de administrador.\n1. En Catálogo pulsa Crear → Insumo.\n2. Indica nombre, categoría, unidad, proveedor y costo por esa unidad.\n3. Activa «Se puede seleccionar en recetas y extras» si es consumible.\n4. Guarda y registra sus existencias desde Inventario.\nEl insumo no crea un botón de venta.",
    articleIds: ["create-ingredient", "inventory-purchase"], actions: ["new-ingredient", "inventory"],
    suggestions: [suggestion("Registrar una compra"), suggestion("Crear una receta"), suggestion("Crear un extra")],
  },
  "create-extra": {
    text: "Para crear un complemento, un administrador abre Catálogo → Crear → Extra. Indica nombre, insumo que consume, cantidad en la unidad mostrada y precio base sin IVA. Revisa el precio final y guarda. Después comprueba que aparezca en Extras al configurar un platillo en Venta. El extra se ofrece como complemento global y descuenta su insumo al comandar.",
    articleIds: ["create-extra", "configure-product"], actions: ["new-extra"],
    suggestions: [suggestion("Agregar un extra a una orden"), suggestion("Crear un insumo"), suggestion("Editar precio de un extra")],
  },
  "edit-price": {
    text: "Un administrador puede cambiar el precio desde Catálogo → Platillos y bebidas o Extras → Editar. Modifica «Precio base sin IVA» y revisa Base + IVA = Precio final antes de Guardar cambios. El nuevo precio se usa en líneas nuevas; las líneas ya añadidas y las ventas cerradas conservan su importe.",
    articleIds: ["edit-product-price", "iva-settings"], actions: ["catalog"],
    suggestions: [suggestion("Configurar IVA"), suggestion("Editar la receta", "Crear una receta"), suggestion("Crear un extra")],
  },
  "add-product-choice": {
    text: "¿Quieres crear un producto en el menú o añadir uno que ya existe a la cuenta de un cliente? Elige una opción para mostrarte los pasos correctos.",
    suggestions: [suggestion("Crear uno en el catálogo", "Crear un platillo"), suggestion("Añadir a una orden", "Agregar un platillo a una orden"), suggestion("Añadir un extra a una orden")],
    articleIds: ["create-product", "configure-product"],
  },
  "add-extra-choice": {
    text: "¿Quieres añadir un extra a un pedido o crear un complemento nuevo en el catálogo? Elige una opción. Al añadirlo a un pedido podrás revisar su precio y cantidad antes de confirmar.",
    suggestions: [suggestion("Añadir a una orden", "Agregar un extra a una orden"), suggestion("Crear un extra nuevo", "Crear un extra")],
    articleIds: ["configure-product", "create-extra"],
  },
  "remove-choice": {
    text: "«Quitar» puede significar varias cosas. Elige qué necesitas: ocultar un platillo del menú, quitar una línea de una cuenta o cancelar la cuenta completa. Desde este chat no se elimina ni se cancela nada.",
    suggestions: [suggestion("Ocultar del catálogo", "Desactivar un platillo del catálogo"), suggestion("Quitar de una cuenta", "Quitar una línea de una orden"), suggestion("Cancelar la cuenta completa", "Cancelar una orden completa")],
    articleIds: ["deactivate-product", "cancel-item-order"],
  },
  "hide-product": {
    text: "Para retirar un platillo del menú, un administrador puede ir a Catálogo → Platillos y bebidas, buscarlo y desactivar «Disponible» en su tarjeta. También puede abrir Editar y desmarcar «Disponible en Venta». El producto queda oculto para nuevas selecciones y conserva su receta e historial. Para volver a ofrecerlo, activa la misma opción. Esto no cancela las líneas que ya estén en una cuenta.",
    articleIds: ["deactivate-product", "create-product"], actions: ["catalog"],
    suggestions: [suggestion("Quitar de una cuenta", "Quitar una línea de una orden"), suggestion("Volver a mostrar un platillo", "Activar un platillo del catálogo"), suggestion("Editar la receta", "Crear una receta")],
  },
  "show-product": {
    text: "Si un platillo no aparece en Venta, un administrador puede buscarlo en Catálogo → Platillos y bebidas. Comprueba su categoría y activa «Disponible» o, dentro de Editar, «Disponible en Venta». Después vuelve a Venta y revisa la categoría o limpia el buscador. Si lo que falta es un ingrediente en la receta, elige la opción de insumos.",
    articleIds: ["deactivate-product", "create-product"], actions: ["catalog", "sale"],
    suggestions: [suggestion("No aparece un insumo", "No aparece un insumo en la receta"), suggestion("Crear un platillo"), suggestion("Ocultar del catálogo", "Desactivar un platillo del catálogo")],
  },
  "remove-line": {
    text: "Abre la cuenta y revisa el estado del producto.\n• Si está pendiente de comandar, usa la papelera: aún no se ha descontado inventario.\n• Si ya fue comandado, usa Cancelar cuando esté disponible, comprueba la cantidad y añade una nota si ayuda a explicar la incidencia. La cancelación queda registrada y repone el consumo que corresponda.\nVerifica la línea y la cantidad antes de confirmar en su formulario.",
    articleIds: ["cancel-item-order"], actions: ["sale", "tables", "kitchen"],
    suggestions: [suggestion("Cancelar la cuenta completa", "Cancelar una orden completa"), suggestion("Ocultar del catálogo", "Desactivar un platillo del catálogo"), suggestion("Comandar productos")],
  },
  "cancel-order": {
    text: "Para cancelar una cuenta abierta, abre la mesa u orden, pulsa Finalizar y elige «Cancelar mesa u orden». Revisa que sea la cuenta correcta, documenta el motivo y confirma allí. La orden queda cerrada sin cobro y registrada como Cancelada. Si ya está cobrada, consulta la guía de Datos; no es el mismo flujo.",
    articleIds: ["cancel-item-order", "data-reprint-delete"], actions: ["sale", "tables"],
    suggestions: [suggestion("Sólo quitar un producto", "Quitar una línea de una orden"), suggestion("Consultar una venta cobrada", "Buscar una venta cobrada en Datos"), suggestion("Cobrar la cuenta")],
  },
  "add-to-order": {
    text: "Con la caja abierta, entra a Venta y abre la mesa o pedido correspondiente. Busca el platillo, elige sus variantes, extras y notas cuando tenga opciones, y confirma para añadirlo. Revisa cantidad y total en el ticket. Los productos quedan pendientes; el inventario se descuenta al comandar.",
    articleIds: ["configure-product", "open-order", "command-order"], actions: ["sale", "tables"],
    suggestions: [suggestion("Agregar un extra a una orden"), suggestion("Comandar productos"), suggestion("Crear un producto nuevo", "Crear un platillo")],
  },
  "configure-product": {
    text: "Abre un producto en Venta y elige las opciones disponibles: variantes, partes de un mixto, extras y notas. Revisa el incremento de precio antes de añadirlo. Las variantes y extras pueden cambiar consumo; una nota como «sin cebolla» informa a cocina pero no modifica por sí sola la receta ni inventario. Las variantes de receta del catálogo se editan como administrador.",
    articleIds: ["configure-product", "create-extra", "create-edit-recipe"], actions: ["sale"],
    suggestions: [suggestion("Crear un extra"), suggestion("Editar receta del catálogo", "Crear una receta"), suggestion("Comandar productos")],
  },
  "open-order": {
    text: "Con la caja abierta, entra a Venta o Mesas. Usa «Nueva mesa» para salón o «Para llevar» para un pedido sin mesa. Captura los datos del servicio y responsable, confirma y agrega los productos. Revisa cantidad, notas y extras antes de comandar.",
    articleIds: ["open-order", "cash-daily"], actions: ["sale", "tables"],
    suggestions: [suggestion("Abrir caja"), suggestion("Agregar un platillo a una orden"), suggestion("Comandar productos")],
  },
  command: {
    text: "En la cuenta revisa los productos pendientes y pulsa Comandar. Elige Digital o Digital + impresa y comprueba que el lote aparezca en Cocina. En ese momento se descuentan receta y extras del inventario. Si falló la impresión, revisa primero Cocina y la impresora antes de volver a enviar productos.",
    articleIds: ["command-order", "kitchen-flow", "printer-setup"], actions: ["sale", "kitchen"],
    suggestions: [suggestion("Problemas de impresión"), suggestion("Flujo de cocina"), suggestion("Cancelar un producto comandado", "Quitar una línea comandada")],
  },
  kitchen: {
    text: "En Cocina revisa la mesa, hora, productos y notas de la comanda. Pulsa Preparar al comenzar y Lista cuando esté completa. La entrega al cliente se confirma desde Mesas. La comanda digital sigue siendo la referencia si la impresora falla.",
    articleIds: ["kitchen-flow", "command-order"], actions: ["kitchen", "tables"],
    suggestions: [suggestion("Problemas de impresión"), suggestion("Cancelar un producto comandado", "Quitar una línea comandada")],
  },
  checkout: {
    text: "Antes de Finalizar, elige Descuento de la cuenta junto al total o abre Prepago y descuento para consultar el ticket y Total para el cliente. Guarda el descuento y continúa al cobro. Revisa productos pendientes y total. Elige Efectivo o Tarjeta; si es efectivo, captura lo recibido y comprueba el cambio. Si consumo o propina lleva tarjeta, indica terminal y Crédito o Débito. Registra la propina y su método si corresponde. Confirma y cierra sólo cuando los importes sean correctos. El postpago se puede imprimir desde Datos después del cobro.",
    articleIds: ["checkout-discounts-tips", "prepaid-postpaid"], actions: ["sale", "tables", "cash"],
    suggestions: [suggestion("Ticket prepago y postpago"), suggestion("Cerrar caja"), suggestion("Cancelar la cuenta completa", "Cancelar una orden completa")],
  },
  cash: {
    text: "Con función de Caja o Administrador, entra a Caja. Para abrir, captura el fondo inicial real en Apertura de caja. Para cerrar, revisa ventas y gastos, resuelve las órdenes abiertas, cuenta el efectivo físico y registra la cantidad contada y cualquier diferencia antes de confirmar el corte. El cierre de caja no está disponible mientras haya órdenes abiertas.",
    articleIds: ["cash-daily"], actions: ["cash"],
    suggestions: [suggestion("Abrir una mesa"), suggestion("Cobrar la cuenta"), suggestion("Registrar una compra")],
  },
  "inventory-purchase": {
    text: "Un administrador puede registrar una compra en Inventario → Movimiento de inventario. Selecciona el insumo, captura la cantidad en su unidad y el importe total en «Coste del ticket». Añade proveedor y referencia, revisa y pulsa Subir ticket. Aumenta las existencias y actualiza el costo unitario; con caja abierta, el importe reduce el efectivo esperado.",
    articleIds: ["inventory-purchase", "create-ingredient"], actions: ["inventory"],
    suggestions: [suggestion("Crear un insumo"), suggestion("Registrar una merma"), suggestion("Hacer inventario completo")],
  },
  "inventory-waste": {
    text: "Para registrar una pérdida conocida, un administrador abre Inventario → Merma. Selecciona el insumo, comprueba unidad y existencia, e indica cantidad y motivo real. Revisa antes de Registrar merma. La cantidad no puede superar la existencia. Si detectaste una diferencia al contar y desconoces la causa, consulta Inventario completo.",
    articleIds: ["inventory-waste", "full-inventory-count"], actions: ["inventory"],
    suggestions: [suggestion("Hacer inventario completo"), suggestion("Registrar una compra")],
  },
  "inventory-count": {
    text: "Un administrador puede abrir Inventario completo para comparar «Debe haber» con el conteo físico. Haz el conteo sin compras, comandas ni mermas simultáneas. Captura sólo lo contado: vacío no significa cero. Revisa las diferencias antes de aplicar y confirmar en la pantalla. Aplicar sustituye las existencias por las cantidades físicas.",
    articleIds: ["full-inventory-count", "inventory-waste"], actions: ["inventory"],
    suggestions: [suggestion("Registrar una compra"), suggestion("Registrar una merma"), suggestion("Revisar consumo de recetas", "Crear una receta")],
  },
  inventory: {
    text: "¿Qué necesitas hacer en Inventario? Una compra suma existencias, una merma registra una pérdida conocida y un inventario completo compara el conteo físico. Las recetas descuentan al comandar. Elige el flujo que corresponde.",
    articleIds: ["inventory-purchase", "inventory-waste", "full-inventory-count"], actions: ["inventory"],
    suggestions: [suggestion("Registrar una compra"), suggestion("Registrar una merma"), suggestion("Hacer inventario completo"), suggestion("Crear un insumo")],
  },
  printing: {
    text: "Para revisar la impresión, empieza en el equipo que ejecuta LibrePOS.\n1. Comprueba papel, conexión y una página de prueba desde Windows o macOS.\n2. Un administrador abre Configuración → Impresión y selecciona la impresora de Tickets o Comandas.\n3. Ejecuta una prueba corta y revisa el mensaje de error si falla.\n4. Confirma el formato y activa la impresión automática sólo después de una prueba correcta.\nSi una comanda ya está en Cocina, no hace falta volver a comandar para diagnosticar la impresora.",
    articleIds: ["printer-setup", "prepaid-postpaid"], actions: ["config"],
    suggestions: [suggestion("Ticket prepago y postpago"), suggestion("Reimprimir una cuenta"), suggestion("Flujo de cocina")],
  },
  tickets: {
    text: "El prepago es la cuenta antes de cobrar: puedes elegir Descuento de la cuenta junto al total antes de Finalizar. En Prepago y descuento verás Total para el cliente y el ticket completo. Cambia Descuento del prepago y comprueba el importe al instante; usa Guardar prepago sin imprimir o Guardar e imprimir. Cerrar la vista sin guardar descarta ese cambio. El descuento se conserva al cobrar y no se aplica una segunda vez; la orden sigue abierta. El postpago refleja el pago y propina finales; después de cobrar se imprime desde Datos → Postpago pendiente. Para reimprimir, busca el folio y elige la columna Prepago o Postpago correcta. Reimprimir no crea otra venta.",
    articleIds: ["prepaid-postpaid", "data-reprint-delete"], actions: ["data", "tables"],
    suggestions: [suggestion("Problemas de impresión"), suggestion("Cobrar la cuenta"), suggestion("Buscar una cuenta en Datos")],
  },
  iva: {
    text: "En los formularios de platillos y extras se captura el precio base sin IVA y se muestra el precio final. Un administrador configura el impuesto en Configuración → General. Las órdenes abiertas después del cambio usan la nueva configuración; las anteriores conservan su impuesto guardado. Revisa los ejemplos de la guía antes de usar una conversión de precios.",
    articleIds: ["iva-settings", "edit-product-price"], actions: ["tax-config", "catalog"],
    suggestions: [suggestion("Editar precio de un platillo"), suggestion("Ticket prepago y postpago")],
  },
  data: {
    text: "Un administrador puede buscar cuentas en Datos por folio, mesa, fecha, pago o producto y abrir su detalle. Comprueba el estado e importes antes de actuar. Si la venta ya está cobrada, no uses el flujo de cancelar una orden abierta. La guía explica la reimpresión y el caso específico de cuentas duplicadas; el asistente no borra cuentas.",
    articleIds: ["data-reprint-delete", "cancel-item-order"], actions: ["data"],
    suggestions: [suggestion("Reimprimir una cuenta"), suggestion("Cancelar una orden abierta", "Cancelar una orden completa"), suggestion("Hacer un respaldo")],
  },
  users: {
    text: "Un administrador gestiona los accesos en Usuarios. Cada persona debe tener su propia cuenta y sólo las funciones que necesita: Mesero, Cocina, Caja o Administrador. Si no ves Catálogo o Configuración, pide a un administrador que revise tus funciones. Cambiar de función no se hace desde el asistente.",
    articleIds: ["users-permissions"], actions: ["users"],
    suggestions: [suggestion("Registrar entrada o salida"), suggestion("Crear un platillo")],
  },
  profile: {
    text: "En Mi perfil confirma que sea tu usuario. Pulsa Entrada al comenzar la jornada y Salida al terminar. La salida del fichaje no cierra Caja. Si olvidaste registrar una hora, informa al administrador para revisar la asistencia.",
    articleIds: ["attendance-profile"], actions: ["profile"],
    suggestions: [suggestion("Cerrar caja"), suggestion("Permisos de usuario")],
  },
  backup: {
    text: "Un administrador puede descargar Respaldo JSON desde Datos y guardar una copia fuera del equipo servidor. Antes de actualizar, revisa que no haya operación activa y conserva un respaldo. Sigue la guía de actualización y comprueba versión, ventas, inventario e impresoras al terminar. El chat no ejecuta actualizaciones.",
    articleIds: ["backup-update"], actions: ["data"],
    suggestions: [suggestion("Buscar una cuenta en Datos"), suggestion("Problemas de impresión")],
  },
};

function detectIntent(query, previousIntent) {
  const words = new Set(query.split(" "));
  const has = (...terms) => terms.some((term) => words.has(term));
  const includes = (...terms) => terms.some((term) => query.includes(term));
  const product = has("platillo", "producto", "bebida", "menu");
  const remove = has("quitar", "borrar", "eliminar", "cancelar", "retirar", "ocultar", "desactivar") || includes("dar de baja");
  const create = has("crear", "nuevo", "nueva", "alta") || includes("dar de alta");
  const add = has("agregar", "poner", "meter");
  const sale = has("orden", "cuenta", "mesa", "pedido", "ticket", "linea", "comandado", "comandada", "pendiente");
  const catalog = has("catalogo", "menu", "disponible", "venta") || includes("dejar de vender");

  if (!query || /^(hola|buenas|buenos dias|buenas tardes|buenas noches|ayuda|soporte|inicio|empezar|gracias|tutorial|gif)$/.test(query)) return "welcome";

  if (has("sincroniza", "sincronizan", "sincronizacion", "desconectado", "desconexion") || includes("no llegan las comandas", "otro telefono no ve", "otro equipo no ve")) return "sync";
  if (has("wifi", "wi", "qr", "telefono", "celular", "red", "localhost", "vpn", "enlace")) return "lan-access";
  if ((has("corregir", "correccion", "cambiar", "equivoque", "equivocado", "equivocada", "error") && has("pago", "tarjeta", "efectivo", "terminal", "propina")) || includes("tarjeta a efectivo", "efectivo a tarjeta", "marque tarjeta", "marque efectivo")) return "correct-payment";
  if (has("terminal", "terminales", "credito", "debito")) return "payment-terminals";
  if (has("descuento") && !has("inventario", "insumo", "propina")) return "tickets";
  // Resolve a short answer only when the immediately preceding reply offered it.
  if (previousIntent === "remove-choice") {
    if (/^(1|catalogo|del catalogo|menu|del menu|ocultar|ocultarlo)$/.test(query)) return "hide-product";
    if (/^(2|linea|la linea|orden|de la orden|cuenta|de la cuenta|solo el producto)$/.test(query)) return "remove-line";
    if (/^(3|toda|toda la cuenta|completa|cuenta completa|orden completa)$/.test(query)) return "cancel-order";
  }
  if (previousIntent === "add-product-choice") {
    if (/^(1|catalogo|del catalogo|menu|nuevo|uno nuevo)$/.test(query)) return "create-product";
    if (/^(2|orden|a la orden|cuenta|a la cuenta|existente)$/.test(query)) return "add-to-order";
  }
  if (remove && has("cobrada", "cobrado", "duplicada", "duplicado", "historico", "historial", "datos")) return "data";
  if (has("insumo", "receta") && includes("no aparece", "no encuentro", "no veo", "no sale", "no puedo seleccionar", "no deja seleccionar")) return "ingredient-missing";
  if ((has("receta") || product) && includes("no guarda", "no puedo guardar", "no se guarda", "no me deja guardar", "error al guardar")) return "recipe-validation";
  if (has("receta") && !has("comanda", "comandar", "merma")) {
    if (remove && (has("insumo") || includes("de la receta", "de mi receta", "de una receta"))) return "remove-recipe-ingredient";
    if (has("variante", "variantes", "mixto", "mixtos") && !create && !has("editar", "modificar")) return "configure-product";
    return "create-recipe";
  }
  if ((has("desactivar", "ocultar", "retirar") || includes("dar de baja", "dejar de vender")) && (product || catalog) && !sale) return "hide-product";
  if (product && (has("activar", "mostrar", "visible", "habilitar") || includes("no aparece", "no encuentro", "no veo", "no sale"))) return "show-product";
  if (remove) {
    if (has("catalogo", "menu", "venta") && product && !sale) return "hide-product";
    if (has("linea", "pieza", "comandado", "comandada", "pendiente") || (product && sale) || (has("extra") && sale)) return "remove-line";
    if (sale && !product && !has("extra")) return "cancel-order";
    return "remove-choice";
  }
  if (has("precio") || (has("iva") && has("base", "final", "calcular"))) return "edit-price";
  if (has("iva", "impuesto")) return "iva";
  if (has("insumo") && (create || (!has("compra", "existencia", "merma", "inventario") && !sale))) return "create-ingredient";
  if (has("extra") && (sale || has("seleccionar", "selecciono", "marcar"))) return "configure-product";
  if (has("extra") && create) return "create-extra";
  if (has("extra") && add) return "add-extra-choice";
  if (product && create && !has("orden", "mesa", "pedido", "cuenta")) return "create-product";
  if (product && add) return sale ? "add-to-order" : has("catalogo", "menu") ? "create-product" : "add-product-choice";
  if (has("ticket") && includes("no sale", "no salio", "no funciona")) return "printing";
  if (has("impresora", "impresion", "imprimir", "bluetooth", "papel", "margen", "margenes", "formato") && !has("reimprimir", "prepago", "postpago")) return "printing";
  if (has("reimprimir", "prepago", "postpago")) return "tickets";
  if (has("merma", "caducidad", "derrame")) return "inventory-waste";
  if (has("conteo", "contar", "descuadre") || includes("inventario completo", "inventario fisico")) return "inventory-count";
  if (has("compra", "comprar", "proveedor") || includes("subir ticket", "entrada inventario", "entrada de inventario")) return "inventory-purchase";
  if (has("inventario", "existencia", "existencias", "stock")) return "inventory";
  if (has("caja", "corte", "fondo") || includes("efectivo esperado")) return "cash";
  if (has("cobrar", "cobro", "pagar", "pago", "propina", "descuento", "tarjeta", "efectivo", "finalizar") || (has("cerrar") && sale)) return "checkout";
  if (has("mesa", "pedido", "orden") && (create || has("abrir", "abro", "llevar"))) return "open-order";
  if (has("cocina", "preparar", "entregar")) return "kitchen";
  if (has("comandar", "comanda", "enviar")) return "command";
  if (has("variante", "variantes", "mixto", "mixtos", "nota", "notas", "extra")) return "configure-product";
  if (has("respaldo", "backup", "actualizar", "actualizacion", "version")) return "backup";
  if (has("usuario", "permiso", "contrasena", "acceso", "funcion", "funciones")) return "users";
  if (has("asistencia", "fichaje", "perfil") || (has("entrada", "salida") && has("registrar", "marcar", "fichar"))) return "profile";
  if (has("folio", "datos", "duplicado", "duplicada", "historial") || (has("buscar", "consultar") && sale)) return "data";
  if (has("ticket")) return "tickets";
  if (product && (has("editar", "modificar", "cambiar") || query === "platillo")) return "create-product";
  if (has("problema", "problemas", "error", "fallo") || includes("no funciona", "no se que hacer")) return "troubleshoot";
  return null;
}

const SEARCH_STOP_WORDS = new Set("a al algo con como de del el en es esta este estoy hacer hay la las lo los me mi necesito no para por puedo que quiero se sin sobre tengo un una unos unas ver ayuda favor cual donde cuando".split(" "));

function searchArticles(query, articles) {
  const terms = [...new Set(query.split(" "))].filter((term) => term.length > 2 && !SEARCH_STOP_WORDS.has(term));
  if (!terms.length) return [];
  return articles.map((article, index) => {
    const title = new Set(normalize(article.title).split(" "));
    const tags = new Set(normalize((article.tags || []).join(" ")).split(" "));
    const summary = new Set(normalize(article.summary).split(" "));
    const details = new Set(normalize(helpDetailSearchText(article)).split(" "));
    const score = terms.reduce((total, term) => total + (title.has(term) ? 4 : tags.has(term) ? 3 : summary.has(term) ? 1 : details.has(term) ? 1 : 0), 0);
    return { article, index, score };
  }).filter((result) => result.score >= 3).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3).map(({ article }) => article);
}

export function getHelpReply(query, { articles, functions = [], previousIntent = null } = {}) {
  const normalized = normalize(query);
  const intent = detectIntent(normalized, previousIntent);
  const roleIds = new Set((Array.isArray(functions) ? functions : []).map(normalize));
  const articleList = Array.isArray(articles) ? articles.filter((article) => article && typeof article.id === "string") : null;
  const allowedArticleIds = articleList ? new Set(articleList.map(({ id }) => id)) : null;
  const result = REPLIES[intent];

  if (!result) {
    const matches = searchArticles(normalized, articleList || []);
    return {
      intent: matches.length ? "article-search" : "unknown", beta: true, matched: matches.length > 0,
      text: matches.length
        ? "Encontré estas guías relacionadas. Abre la que corresponda o escribe una acción concreta, como «crear receta», «registrar compra» o «cancelar una orden»."
        : "Todavía no reconozco esa consulta. Prueba con una acción y su tema, por ejemplo «crear platillo», «editar precio» o «cerrar caja», o elige una opción. Esta ayuda beta responde sobre los flujos básicos de LibrePOS.",
      suggestions: STARTERS.map((item) => ({ ...item })),
      articleIds: matches.map(({ id }) => id), actions: [],
    };
  }

  const actions = (result.actions || []).filter((id) => {
    const action = ACTIONS[id];
    return action && (!action.role || roleIds.has("admin") || roleIds.has(action.role));
  }).map((id) => {
    const { role, ...action } = ACTIONS[id];
    return { id, ...action };
  });

  return {
    intent, text: result.text, beta: true, matched: true,
    suggestions: (result.suggestions || []).map((item) => ({ ...item })),
    articleIds: (result.articleIds || []).filter((id) => !allowedArticleIds || allowedArticleIds.has(id)),
    actions,
  };
}
