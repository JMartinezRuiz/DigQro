# Guías operativas de LibrePOS

Interfaz 2.0.2 · Contenido 2026.09.26

La misma referencia está disponible en Ayuda → Tutoriales, con capturas y GIFs sin conexión a Internet. Los ejemplos son ficticios. Consulta la versión de cada captura; los pasos escritos describen la interfaz vigente.

## Índice

- [Cómo crear un platillo o bebida](#create-product)
- [Cómo crear o cambiar una receta](#create-edit-recipe)
- [Cómo retirar o volver a mostrar un platillo](#deactivate-product)
- [Cómo crear un extra](#create-extra)
- [Cómo crear un insumo](#create-ingredient)
- [Cómo modificar precios y entender el IVA](#edit-product-price)
- [Cómo abrir una mesa o pedido para llevar](#open-order)
- [Cómo configurar mixtos, variantes, extras y notas](#configure-product)
- [Cómo comandar: digital o digital + impresa](#command-order)
- [Cómo quitar productos o cancelar una cuenta](#cancel-item-order)
- [Cómo cobrar, aplicar descuentos y registrar propina](#checkout-discounts-tips)
- [Cuándo imprimir ticket prepago y postpago](#prepaid-postpaid)
- [Cómo abrir y cerrar caja](#cash-daily)
- [Cómo registrar una compra de inventario](#inventory-purchase)
- [Cómo registrar una merma](#inventory-waste)
- [Cómo hacer un inventario completo](#full-inventory-count)
- [Cómo configurar y probar impresoras](#printer-setup)
- [Cómo activar, cambiar o iniciar una etapa de IVA](#iva-settings)
- [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete)
- [Cómo crear usuarios y asignar funciones](#users-permissions)
- [Cómo gestionar comandas en Cocina](#kitchen-flow)
- [Cómo usar Mi perfil y registrar asistencia](#attendance-profile)
- [Cómo respaldar y actualizar LibrePOS](#backup-update)
- [Cómo corregir el pago de una cuenta cerrada](#correct-payment)
- [Cómo configurar terminales y registrar tarjetas](#payment-terminals)
- [Cómo entrar desde el teléfono y resolver problemas del QR](#lan-access)

<a id="create-product"></a>

## Cómo crear un platillo o bebida

Da de alta un producto vendible con precio base, IVA y receta obligatoria.

Para: Administrador. Tiempo orientativo: 4 min.

### Antes de empezar

- Tener función de administrador.
- Haber creado previamente los insumos que forman la receta.
- Confirmar si el IVA está activo y cuál es su porcentaje.

### Pasos

1. **Entra a Catálogo.** Abre Catálogo y deja seleccionada la pestaña Platillos y bebidas. Efecto: Esta pestaña contiene productos que sí aparecen en Venta.

2. **Elige Crear.** Pulsa Crear y selecciona Platillo o bebida. No elijas Extra ni Insumo: tienen efectos distintos. Efecto: Se abrirá el formulario de producto independiente.

3. **Completa los datos de venta.** Captura nombre, descripción, categoría, subcategoría y tipo visual. Mantén Disponible en Venta activado si debe venderse inmediatamente. Efecto: Categoría y subcategoría determinan dónde lo encontrará el personal.

4. **Captura el precio base.** Escribe el precio antes de IVA. Revisa los tres valores: base, IVA y precio final al cliente. Efecto: El precio final será base más IVA cuando el impuesto esté activo.

5. **Define la receta.** Selecciona al menos un insumo e indica la cantidad consumida por cada unidad vendida. Efecto: La receta descuenta inventario cuando el producto se comanda, no cuando solo se agrega al ticket.

6. **Añade variantes solo si aplican.** Usa Variantes de receta cuando una elección cambia los insumos, por ejemplo carne, pollo o queso. Efecto: Cada variante puede tener consumo y margen diferentes.

7. **Guarda y verifica.** Pulsa Crear platillo o bebida y comprueba que aparezca en la categoría esperada de Venta. Efecto: Las líneas ya agregadas no cambian; el nuevo producto queda disponible para añadirlo desde Venta.

### Ejemplo

**Un platillo con receta y precio revisado.** Para una tostada que consume 0.200 KG de aguacate, registra 0.200 por unidad, no 200. Si el precio base es $100 y el IVA configurado es 16%, la vista previa debe mostrar $116 al cliente.

### Si algo no funciona

- **No permite guardar:** Revisa nombre, categoría, subcategoría y precio mayor que cero. Debe existir al menos una fila de receta con insumo seleccionado y cantidad positiva; Sin insumo no cuenta.
- **Se guardó pero no aparece en Venta:** Busca el nombre en Catálogo, comprueba Disponible en Venta y su categoría. Limpia el buscador de Venta y verifica que ambos dispositivos estén conectados al mismo servidor.

### Comprueba antes de terminar

- El nombre no duplica otro producto existente.
- La receta está expresada por una unidad vendida.
- El precio final y la disponibilidad son los esperados.

### Efectos de la operación

- Aparece como producto independiente en Venta.
- Su receta afecta inventario al comandar.
- El IVA se calcula aparte a partir del precio base.
- El costo y margen dependen del costo vigente de sus insumos.

**Atención:** No uses un Extra como sustituto de un platillo. Un extra es un complemento global y no se vende como producto principal.

**Resultado esperado:** El producto aparece en Venta, muestra su precio final y descuenta la receta correcta al comandarlo.

Relacionadas: [Cómo crear o cambiar una receta](#create-edit-recipe) · [Cómo crear un insumo](#create-ingredient) · [Cómo retirar o volver a mostrar un platillo](#deactivate-product) · [Cómo configurar mixtos, variantes, extras y notas](#configure-product)

<a id="create-edit-recipe"></a>

## Cómo crear o cambiar una receta

Define los insumos y cantidades de cada platillo para descontar el consumo correcto al comandar.

Para: Administrador. Tiempo orientativo: 4 min.

### Antes de empezar

- Entrar con una cuenta de administrador.
- Tener los insumos creados y habilitados para recetas.
- Conocer la cantidad que usa una unidad vendida y la unidad de cada insumo.
- Si vas a editar, terminar primero las órdenes abiertas que contengan ese platillo.

### Pasos

1. **Abre el platillo.** En Catálogo → Platillos y bebidas, usa Buscar en todo el catálogo y pulsa Editar en el producto correcto. Si aún no existe, usa Crear → Platillo o bebida y completa sus datos y precio. Efecto: La receta pertenece al platillo; la búsqueda también encuentra productos de otras categorías y productos ocultos.

2. **Ve a Receta por unidad.** Desplázate dentro del formulario hasta el apartado 3, Receta por unidad. Revisa el nombre del platillo antes de cambiar ingredientes. Efecto: Cada cantidad corresponde a una unidad vendida, no a un lote completo de producción.

3. **Selecciona insumo y cantidad.** Elige el insumo y escribe una cantidad mayor que cero. Respeta la unidad que aparece junto a su costo: por ejemplo, 0.200 de KILO equivale a 200 gramos; si la unidad es GR, escribe 200. Efecto: LibrePOS usa la cantidad capturada en la unidad del inventario; no convierte gramos a kilos por ti.

4. **Añade o retira ingredientes.** Pulsa Añadir otro insumo para ampliar la receta. Para retirar uno, usa la papelera Quitar insumo de la receta de su fila. También puedes seleccionar Sin insumo. Deja al menos un insumo con cantidad válida. Efecto: Retirar una fila cambia la receta al guardar; no borra el insumo del inventario. Si era la única fila, se vacía para capturar otro ingrediente.

5. **Revisa las variantes.** Si el platillo cambia de ingredientes según la opción elegida, abre Variantes de receta y revisa los insumos y cantidades de cada variante. Para una receta única, basta con Receta por unidad. Efecto: Una variante puede tener su propia receta; cambiar la receta base no sustituye automáticamente todas las variantes.

6. **Guarda la receta.** Pulsa Guardar cambios si editaste un platillo, o Crear platillo o bebida si es nuevo. Espera el mensaje de confirmación y comprueba el costo y margen en Catálogo. Efecto: Guarda la receta y registra su cambio; guardar no descuenta existencias. Las líneas pendientes usan la receta vigente al comandarse.

7. **Verifica en la siguiente operación.** Al añadir y comandar el platillo en una operación posterior, comprueba el consumo de sus insumos en Inventario. Revisa también la variante elegida, si tiene varias. Efecto: El descuento sucede al comandar. La edición no recalcula los movimientos de inventario ya registrados.

### Ejemplo

**Gramos frente a kilogramos.** Una porción de 150 g usa 0.150 si el insumo se controla en KG y 150 si se controla en GR. Dos porciones consumirían 0.300 KG. Comprueba la unidad del insumo antes de guardar.

### Si algo no funciona

- **Falta un ingrediente en el selector:** En Catálogo → Insumos revisa Se puede seleccionar en recetas y extras y la categoría del insumo. No crees otro con distinto nombre sólo para resolver el selector.
- **El consumo no coincide con la preparación:** Revisa receta base, variante, cantidad de platos y extras. Las notas no cambian consumo automáticamente. Evita editar recetas con comandas pendientes de cancelar: la reposición puede calcularse con la receta actual.

### Comprueba antes de terminar

- Cada cantidad corresponde a una porción.
- Las variantes tienen los insumos correctos.
- Los cambios se guardaron y el costo se revisó.

### Efectos de la operación

- Define el consumo de inventario por unidad comandada.
- Actualiza el costo y el margen calculados del platillo.
- Conserva un registro de los cambios de receta.
- Guardar la receta no realiza compras, ajustes ni descuentos de inventario.

**Atención:** Termina las órdenes abiertas de ese platillo antes de cambiar su receta: una cancelación posterior utiliza la receta vigente para reponer inventario. Comprueba también la unidad; escribir 200 cuando el insumo está en KILO descontaría 200 kilos. Revisa cada variante si aplica.

**Resultado esperado:** La receta muestra los insumos y cantidades previstos; al comandar nuevas unidades se registra el consumo correspondiente.

Relacionadas: [Cómo crear un platillo o bebida](#create-product) · [Cómo crear un insumo](#create-ingredient) · [Cómo configurar mixtos, variantes, extras y notas](#configure-product) · [Cómo comandar: digital o digital + impresa](#command-order)

<a id="deactivate-product"></a>

## Cómo retirar o volver a mostrar un platillo

Oculta un platillo del menú y recupéralo después conservando su receta y su historial.

Para: Administrador. Tiempo orientativo: 2 min.

### Antes de empezar

- Entrar con una cuenta de administrador.
- Confirmar qué platillo o bebida debe dejar de venderse.
- Distinguir entre retirar un platillo del catálogo y quitar una línea de una cuenta.

### Pasos

1. **Localiza el platillo.** Abre Catálogo → Platillos y bebidas. Escribe su nombre en Buscar en todo el catálogo; no necesitas recordar en qué categoría está. Efecto: La búsqueda encuentra tanto los platillos activos como los ocultos en todas las categorías.

2. **Desactiva Disponible.** En la tarjeta del platillo desmarca Disponible. También puedes pulsar Editar, desmarcar Disponible en Venta y terminar con Guardar cambios. Efecto: El cambio desde la tarjeta se guarda al momento. Desde el formulario se aplica al guardar.

3. **Comprueba el estado Oculto.** La tarjeta queda marcada como Oculto y aparece la confirmación de que se ocultó del menú. El producto sigue visible en Catálogo para administrarlo. Efecto: Su precio, receta e historial permanecen guardados.

4. **Revisa Venta.** Abre Venta y confirma que el producto ya no esté disponible para añadir nuevas unidades. Si necesitas quitarlo de una cuenta existente, usa la guía de cancelación de líneas. Efecto: Ocultar un platillo no cancela las líneas que ya existen en órdenes ni devuelve inventario.

5. **Reactívalo cuando corresponda.** Vuelve a Catálogo, encuentra el mismo producto y marca Disponible. Comprueba el estado Activo y su regreso a Venta. Efecto: Recupera el platillo sin crearlo de nuevo ni perder su configuración.

### Ejemplo

**Retirar un agotado durante el turno.** Si se termina un platillo, desactiva Disponible. Ya no se ofrece para nuevas selecciones, pero una línea añadida antes puede seguir en su cuenta. Decide por separado si esa línea debe cancelarse.

### Si algo no funciona

- **Todavía aparece en una cuenta abierta:** Ocultar afecta nuevas selecciones; no cancela líneas existentes. Abre esa cuenta y revisa si está pendiente o comandada antes de retirarla.
- **Quiero volver a venderlo:** Busca el mismo registro en Catálogo, activa Disponible y limpia los filtros en Venta. Conserva su receta e historial; no necesitas duplicarlo.

### Comprueba antes de terminar

- El producto está Oculto o Activo según lo solicitado.
- Las cuentas abiertas se revisaron por separado.
- La receta e historial siguen disponibles.

### Efectos de la operación

- Retira el platillo de las opciones de Venta.
- Conserva receta, precio e historial.
- No cancela cuentas ni modifica ventas pasadas.
- Permite volver a mostrarlo con el mismo control.

**Atención:** Retirar del menú y cancelar una línea son acciones distintas. Si ya se comandó, la cancelación debe registrarse desde la cuenta con cantidad y motivo.

**Resultado esperado:** El platillo muestra Oculto en Catálogo y deja de ofrecerse en Venta; al reactivarlo vuelve a aparecer.

Relacionadas: [Cómo crear un platillo o bebida](#create-product) · [Cómo crear o cambiar una receta](#create-edit-recipe) · [Cómo quitar productos o cancelar una cuenta](#cancel-item-order) · [Cómo modificar precios y entender el IVA](#edit-product-price)

<a id="create-extra"></a>

## Cómo crear un extra

Crea un complemento global con precio propio y descuento estimado de inventario.

Para: Administrador. Tiempo orientativo: 3 min.

### Antes de empezar

- Tener función de administrador.
- El insumo relacionado debe existir y estar habilitado para recetas.
- Conocer la cantidad real que se entrega por cada extra.

### Pasos

1. **Abre el alta correcta.** En Catálogo pulsa Crear y selecciona Extra. Efecto: El extra será un complemento disponible para todos los platillos.

2. **Nombra el extra.** Usa un nombre reconocible para venta y ticket, por ejemplo Extra cecina. Efecto: El personal verá este texto en el selector de Extras y en la cuenta.

3. **Selecciona el insumo.** Elige el insumo consumido. La unidad mostrada procede del inventario y no debe cambiarse desde el extra. Efecto: Vincula el complemento con el inventario correcto.

4. **Indica la cantidad.** Captura gramaje o cantidad consumida por una venta del extra, respetando la unidad mostrada. Efecto: Cada comanda descontará esta cantidad como consumo estimado.

5. **Captura precio base.** Escribe el precio antes de IVA y revisa la vista previa base, IVA y final. Efecto: El IVA del extra se incorpora al total de la orden, pero no a la propina.

6. **Guarda y prueba.** Crea el extra, abre un producto en Venta y confirma que aparezca en el apartado Extras. Efecto: No se crea un botón de producto independiente.

### Ejemplo

**Cantidad de un extra.** Para un extra de 30 g de queso cuyo insumo está en KG, registra 0.030. Define su precio de venta base por separado del costo del queso; el costo del insumo no es el precio cobrado al cliente.

### Si algo no funciona

- **El insumo no aparece:** Comprueba que permita recetas y extras y que su categoría sea elegible. Crea primero el insumo si todavía no existe.
- **El precio o consumo se multiplica demasiado:** Revisa cantidad del extra, unidades del insumo y cantidad del platillo. No captures gramos enteros en un insumo controlado en KG.

### Comprueba antes de terminar

- El extra tiene un insumo y una cantidad coherentes.
- Su precio final fue revisado.
- Se ofrece como complemento en Venta.

### Efectos de la operación

- Queda disponible globalmente para los platillos.
- Aumenta el precio de la línea y el IVA correspondiente.
- Descuenta inventario de forma estimada al comandar.
- Se desglosa como extra en el ticket.

**Atención:** Una cantidad mal capturada provoca diferencias de inventario. Comprueba si la unidad es KG, KILO, GR, LITRO, ML o PZ antes de guardar.

**Resultado esperado:** El extra aparece al configurar un platillo, muestra el precio correcto y consume el insumo vinculado.

Relacionadas: [Cómo crear un insumo](#create-ingredient) · [Cómo configurar mixtos, variantes, extras y notas](#configure-product) · [Cómo hacer un inventario completo](#full-inventory-count) · [Cómo modificar precios y entender el IVA](#edit-product-price)

<a id="create-ingredient"></a>

## Cómo crear un insumo

Registra una materia prima o artículo interno para inventario, recetas y costos.

Para: Administrador. Tiempo orientativo: 3 min.

### Antes de empezar

- Tener función de administrador.
- Conocer la unidad de control y el costo por esa unidad.

### Pasos

1. **Abre Crear insumo.** En Catálogo pulsa Crear y selecciona Insumo. Efecto: El insumo no aparecerá como producto en Venta.

2. **Identifica el insumo.** Captura un nombre único y una categoría coherente. Efecto: La categoría ayuda a encontrarlo y puede determinar si es apto para recetas.

3. **Decide su uso.** Activa Se puede seleccionar en recetas y extras solo cuando sea una materia consumible. Efecto: Equipo, limpieza o papelería normalmente deben quedar fuera de recetas.

4. **Define unidad y proveedor.** Usa la misma unidad con la que contarás y comprarás: KG, LITRO, PZ u otra. Efecto: Las recetas y movimientos utilizarán esta unidad.

5. **Captura costo vigente.** Introduce el costo por unidad y documenta el motivo si estás editando un costo anterior. Efecto: Actualiza el costo estimado y margen de los platillos relacionados.

6. **Guarda.** Pulsa Crear insumo y localízalo en su categoría. Efecto: La cantidad inicial se controla posteriormente desde Inventario.

### Ejemplo

**Costo por unidad de control.** Si compras 5 KG por $600, el costo es $120 por KG. En el alta usa la unidad de control y su costo; al registrar la compra, captura cantidad 5 y coste total $600.

### Si algo no funciona

- **No aparece en las recetas:** Activa Se puede seleccionar en recetas y extras y revisa que su categoría permita recetas. Una categoría de artículos no alimentarios puede excluirlo.
- **Hay dos nombres para el mismo insumo:** Antes de crear otro, busca variantes del nombre. Evita renombrar insumos usados por recetas durante el servicio; revisa sus vínculos antes de hacerlo.

### Comprueba antes de terminar

- La unidad coincide con compras, conteo y recetas.
- El costo corresponde a una unidad, no a toda la factura.
- La existencia real se registró mediante el movimiento adecuado.

### Efectos de la operación

- No se vende directamente.
- Puede formar parte de recetas y extras.
- Su costo afecta márgenes.
- Su unidad gobierna compras, mermas y conteos.

**Atención:** No cambies la unidad de un insumo que ya tiene movimientos sin revisar recetas, existencias y cantidades históricas.

**Resultado esperado:** El insumo queda disponible en Inventario y, si se habilitó, en los selectores de recetas y extras.

Relacionadas: [Cómo crear un platillo o bebida](#create-product) · [Cómo crear un extra](#create-extra) · [Cómo registrar una compra de inventario](#inventory-purchase) · [Cómo registrar una merma](#inventory-waste)

<a id="edit-product-price"></a>

## Cómo modificar precios y entender el IVA

Actualiza el precio base de un platillo o extra sin alterar ventas ya cerradas.

Para: Administrador. Tiempo orientativo: 3 min.

### Antes de empezar

- Tener función de administrador.
- Confirmar el porcentaje de IVA activo.

### Pasos

1. **Busca el elemento.** En Catálogo entra a Platillos y bebidas o Extras y usa el buscador. Efecto: Editarás el registro seleccionado, no crearás uno nuevo.

2. **Abre Editar.** Comprueba nombre y tipo antes de cambiar el precio. Efecto: Evita modificar un extra cuando querías modificar el platillo.

3. **Cambia la base.** Captura el importe antes de IVA en Precio base sin IVA. Efecto: LibrePOS recalcula IVA y precio final de inmediato.

4. **Revisa el total.** Valida Base sin IVA, IVA y Precio final antes de guardar. Efecto: Ese precio final será el visible para nuevas líneas de venta.

5. **Guarda.** Pulsa Guardar cambios y agrega una línea nueva de prueba en Venta. Efecto: Las líneas ya agregadas y las ventas cerradas conservan su importe; las líneas nuevas usan el nuevo precio.

### Ejemplo

**Partir del precio final deseado.** Con IVA de 16%, un precio final de $116 corresponde a base $100. Escribe la base y verifica la vista previa. Una línea añadida antes del cambio conserva su importe; comprueba el precio en una línea nueva.

### Si algo no funciona

- **La cuenta abierta conserva otro precio:** Es normal para líneas ya añadidas. No borres una venta cerrada para cambiarla. Revisa qué precio estaba vigente al añadir la línea.
- **El total no es el precio que escribí:** El formulario captura base sin IVA. Revisa porcentaje y activación del impuesto, y compara Base, IVA y Precio final antes de guardar.

### Comprueba antes de terminar

- El precio base y final corresponden a lo acordado.
- No se alteró la disponibilidad por accidente.
- Una nueva selección muestra el importe actualizado.

### Efectos de la operación

- Afecta nuevas ventas, no ventas históricas.
- Mantiene base e IVA separados para análisis.
- Registra historial de precio cuando corresponde.
- Puede cambiar margen sin cambiar la receta.

**Atención:** No captures como base el precio final que deseas cobrar si el IVA está activo; el impuesto se sumará nuevamente.

**Resultado esperado:** Una línea nueva muestra el precio final calculado y Datos conserva intactos los importes antiguos.

Relacionadas: [Cómo crear un platillo o bebida](#create-product) · [Cómo crear un extra](#create-extra) · [Cómo activar, cambiar o iniciar una etapa de IVA](#iva-settings) · [Cómo cobrar, aplicar descuentos y registrar propina](#checkout-discounts-tips)

<a id="open-order"></a>

## Cómo abrir una mesa o pedido para llevar

Inicia correctamente una orden, asigna responsable y agrega los primeros productos.

Para: Mesero, Caja, Administrador. Tiempo orientativo: 3 min.

### Antes de empezar

- La caja debe estar abierta.
- El usuario debe tener acceso a Venta.
- La mesa no debe estar ocupada por otra orden.

### Pasos

1. **Abre Venta o Mesas.** Usa Nueva mesa para servicio en salón o Para llevar para un pedido sin mesa. Efecto: El tipo elegido se conserva en Datos y en el ticket.

2. **Captura los datos.** En mesa indica Número de mesa, Comensales, Mesero y comentarios opcionales. En Para llevar captura Cliente si aplica y elige Responsable. Efecto: Facilita identificar la orden durante cocina y cobro; si Cliente queda vacío se mostrará Mostrador.

3. **Confirma la apertura.** Revisa que no exista otra mesa con el mismo número antes de continuar. Efecto: Se crea un folio consecutivo para la orden.

4. **Agrega productos.** Busca por categoría o nombre y configura las opciones necesarias. Efecto: Los productos quedan pendientes; todavía no descuentan inventario.

5. **Revisa el ticket.** Comprueba cantidades, notas, extras y precio antes de comandar. Efecto: Mientras estén pendientes puedes corregir cantidad o quitar líneas sin registrar cancelación.

### Ejemplo

**Evitar dos cuentas de la misma mesa.** Antes de abrir Mesa 4, revisa Mesas. Si ya tiene una cuenta, entra en ella y añade los nuevos productos. Usa Para llevar cuando no corresponda asignar una mesa.

### Si algo no funciona

- **Nueva mesa o Abrir está deshabilitado:** Pide a Caja abrir el turno. Confirma que tu usuario tenga función Mesero o Administrador; leer la guía no cambia permisos.
- **Otro teléfono no ve la mesa:** Comprueba que use exactamente el mismo servidor y puerto. Si hubo una desconexión, verifica la cuenta en el servidor antes de crear otra.

### Comprueba antes de terminar

- Mesa o cliente y responsable son correctos.
- Existe una sola cuenta para el servicio.
- Las líneas están revisadas antes de comandar.

### Efectos de la operación

- Crea una orden con folio.
- No descuenta inventario hasta comandar.
- Asigna responsabilidad al mesero seleccionado.
- La caja cerrada bloquea nuevas órdenes.

**Atención:** No abras una segunda orden para corregir una mesa existente; entra a la mesa abierta y edita sus productos pendientes.

**Resultado esperado:** La mesa o pedido aparece abierto, identificado y listo para recibir productos.

Relacionadas: [Cómo configurar mixtos, variantes, extras y notas](#configure-product) · [Cómo comandar: digital o digital + impresa](#command-order) · [Cómo quitar productos o cancelar una cuenta](#cancel-item-order) · [Cómo cobrar, aplicar descuentos y registrar propina](#checkout-discounts-tips)

<a id="configure-product"></a>

## Cómo configurar mixtos, variantes, extras y notas

Personaliza una línea de venta sin perder el desglose de precio ni consumo.

Para: Mesero, Caja, Administrador. Tiempo orientativo: 4 min.

### Antes de empezar

- Tener una orden abierta.
- El producto debe tener opciones o permitir extras.

### Pasos

1. **Selecciona el producto.** Pulsa el producto en Venta. Si requiere configuración, LibrePOS abre sus opciones antes de añadirlo. Efecto: Todavía no se crea la línea hasta confirmar.

2. **Elige variante.** Selecciona tamaño, relleno, preparación u otras opciones obligatorias. Efecto: La variante puede cambiar precio, receta y margen.

3. **Configura mixto.** Cuando esté permitido, reparte las partes y elige la opción de cada una. Efecto: El ticket y la comanda conservan el desglose de cada parte.

4. **Añade extras.** Marca los extras solicitados y revisa el incremento de precio. Efecto: Cada extra añade precio, IVA y consumo estimado de su insumo.

5. **Escribe una nota.** Usa la nota para instrucciones que no cambian precio, como sin cebolla. Efecto: La nota llega a la comanda; no modifica automáticamente receta ni inventario.

6. **Confirma y revisa.** Añade la línea y comprueba opciones, extras, cantidad y total en el ticket. Efecto: Puedes corregirla mientras esté pendiente.

### Ejemplo

**Nota y cambio de receta son distintos.** Sin cebolla avisa a cocina, pero no resta cebolla de la receta de inventario. Una variante configurada o un extra sí puede cambiar el consumo y el precio. Revisa ambos antes de añadir.

### Si algo no funciona

- **No se abre el selector de opciones:** El producto puede no tener opciones configuradas. Un administrador revisa el catálogo; no supongas que una nota crea una variante.
- **El cliente cambió una opción ya comandada:** Revisa el estado y usa el flujo de cancelación disponible; informa a cocina. No añadas otra línea sin aclarar qué ocurre con la anterior.

### Comprueba antes de terminar

- Variante y partes mixtas corresponden al pedido.
- Extras y su incremento de precio son correctos.
- La nota se puede entender sin explicación verbal.

### Efectos de la operación

- Variantes y mixtos pueden cambiar receta.
- Extras aumentan precio y consumo.
- Notas informan a cocina pero no cambian inventario.
- El desglose se conserva en tickets y Datos.

**Atención:** No uses una nota para sustituir un extra con precio o una variante que cambia receta; se perdería el impacto económico y de inventario.

**Resultado esperado:** La línea muestra claramente mixto, opciones, extras y nota antes de enviarse a cocina.

Relacionadas: [Cómo abrir una mesa o pedido para llevar](#open-order) · [Cómo crear un extra](#create-extra) · [Cómo comandar: digital o digital + impresa](#command-order) · [Cómo quitar productos o cancelar una cuenta](#cancel-item-order)

<a id="command-order"></a>

## Cómo comandar: digital o digital + impresa

Envía productos pendientes a cocina y entiende cuándo se descuenta inventario.

Para: Mesero, Caja, Administrador. Tiempo orientativo: 3 min.

### Antes de empezar

- La caja debe estar abierta.
- La orden debe tener al menos una línea pendiente.

### Pasos

1. **Revisa pendientes.** Confirma cantidades, variantes, extras y notas antes de pulsar Comandar. Efecto: Después de comandar, la línea deja de ser una edición libre.

2. **Pulsa Comandar.** El modal muestra cuántas líneas se enviarán. Efecto: Solo se envían productos pendientes; no se duplican los ya comandados.

3. **Elige el modo.** Digital actualiza Cocina. Digital + impresa hace lo mismo y además solicita una comanda a la impresora configurada. Efecto: Ambos modos registran la misma comanda digital.

4. **Comprueba Cocina.** Verifica que aparezcan la mesa o pedido, hora, piezas, opciones y notas correctas. Efecto: En Cocina avanza de Nuevas a En preparación y después a Listas para entregar; la entrega se confirma desde Mesas.

5. **Confirma inventario.** El consumo de receta y extras se descuenta al comandar. Efecto: Una cancelación posterior debe reponer el consumo correspondiente.

### Ejemplo

**Falla papel, pero la comanda llegó.** Si Digital + impresa muestra un error de impresora y el lote ya aparece en Cocina, el envío digital ocurrió. Comprueba ese lote antes de reintentar; no añadas otra vez los platos.

### Si algo no funciona

- **No hay productos pendientes:** Los productos pueden estar ya comandados. Revisa sus estados y Cocina antes de volver a registrar el pedido.
- **No aparece en Cocina en otro equipo:** Verifica servidor y puerto, conexión y filtros del tablero. Si hubo corte de red, contrasta el lote en el servidor antes de repetir la operación.

### Comprueba antes de terminar

- Cocina muestra la mesa y cantidades correctas.
- No se duplicó la comanda al fallar la impresión.
- El movimiento de inventario corresponde al envío.

### Efectos de la operación

- Crea un lote de comanda con fecha y usuario.
- Descuenta receta y extras del inventario.
- Digital + impresa depende de la impresora de comandas.
- Una falla de impresión no debe borrar la comanda digital.

**Atención:** No pulses nuevamente para compensar una impresión fallida: podrías enviar productos nuevos pendientes. Revisa Cocina y la configuración de impresión.

**Resultado esperado:** La comanda aparece en Cocina una sola vez y, si se eligió, también sale impresa.

Relacionadas: [Cómo configurar mixtos, variantes, extras y notas](#configure-product) · [Cómo configurar y probar impresoras](#printer-setup) · [Cómo quitar productos o cancelar una cuenta](#cancel-item-order) · [Cómo registrar una merma](#inventory-waste)

<a id="cancel-item-order"></a>

## Cómo quitar productos o cancelar una cuenta

Distingue entre corregir una línea pendiente, cancelar un producto comandado y cancelar la orden completa.

Para: Mesero, Caja, Administrador. Tiempo orientativo: 5 min.

### Antes de empezar

- Identificar si el producto está pendiente o ya fue comandado.
- Tener un motivo real para cualquier cancelación registrada.

### Pasos

1. **Revisa el estado.** Pendiente significa que aún no llegó a cocina. Comandado, en preparación o listo ya forma parte del flujo operativo. Efecto: El estado determina si basta con quitar o si debe registrarse una cancelación.

2. **Quita una línea pendiente.** Usa el icono de papelera mientras la línea esté pendiente. Efecto: No genera incidencia ni repone inventario porque todavía no se descontó.

3. **Cancela una línea comandada.** Usa Cancelar cuando esté disponible, captura la cantidad y añade una Nota opcional cuando ayude a explicar la incidencia. Efecto: Queda registro en Datos y se repone el inventario de la cantidad cancelada cuando corresponde.

4. **Cancela la cuenta completa.** Pulsa Finalizar, elige Cancelar mesa u orden y documenta el motivo. Efecto: La orden se cierra sin cobro y aparece como Cancelada en Datos.

5. **Verifica el resultado.** Busca el folio en Datos y revisa el movimiento de inventario si había productos comandados. Efecto: La trazabilidad protege caja, inventario y análisis de incidencias.

### Ejemplo

**Cancelar una parte de una línea.** Si una línea comandada tiene tres piezas y sólo se cancela una, introduce 1 en la cancelación y explica el motivo. Comprueba que queden dos y que cocina conozca el cambio.

### Si algo no funciona

- **No veo la acción esperada:** Revisa si la línea está pendiente, comandada o si la cuenta ya está cobrada. Una cuenta cobrada se consulta en Datos; cambiar su método de pago usa Corregir pago.
- **El producto ya se preparó y no se recupera:** La cancelación puede reponer consumo teórico. Revisa existencias con administración y registra la pérdida real mediante Merma cuando corresponda; no asumas que volvió físicamente al almacén.

### Comprueba antes de terminar

- Se canceló la cantidad correcta.
- Cocina conoce la incidencia.
- El registro y el inventario se revisaron.

### Efectos de la operación

- Las líneas pendientes se eliminan sin incidencia.
- Las comandadas generan trazabilidad de cancelación.
- Las recetas comandadas se reponen al cancelar.
- Cancelar una cuenta no crea una venta ni un cobro.

**Atención:** No borres una venta cobrada para representar una cancelación operativa. El borrado definitivo está reservado para duplicados y tiene otro impacto.

**Resultado esperado:** La orden queda corregida o cancelada una sola vez, con inventario y Datos coherentes.

Relacionadas: [Cómo comandar: digital o digital + impresa](#command-order) · [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete) · [Cómo hacer un inventario completo](#full-inventory-count) · [Cómo abrir una mesa o pedido para llevar](#open-order)

<a id="checkout-discounts-tips"></a>

## Cómo cobrar, aplicar descuentos y registrar propina

Cierra una cuenta con el importe, método de pago, descuento y propina correctos.

Para: Caja, Mesero, Administrador. Tiempo orientativo: 5 min.

### Antes de empezar

- La caja debe estar abierta.
- La orden debe contener productos.
- Revisar si quedan piezas sin comandar.

### Pasos

1. **Prepara el descuento antes de cobrar.** En la cuenta abierta, elige Descuento de la cuenta junto al total. Se guarda al seleccionar y actualiza el importe en ese momento; no necesitas pulsar Finalizar para decir al cliente cuánto debe pagar. Efecto: El total y el prepago incorporan el descuento antes del cierre.

2. **Revisa prepago y abre Finalizar.** Abre Prepago y descuento para ver el ticket completo y Total para el cliente. También puedes cambiar Descuento del prepago, comprobar el resultado y usar Guardar prepago, Guardar e imprimir o Continuar al cobro. En Finalizar, Revisar prepago permite volver a esa vista. Efecto: El mismo descuento se reutiliza al cobrar; no se aplica dos veces.

3. **Elige método de pago.** Selecciona Efectivo o Tarjeta para el consumo. En efectivo captura lo recibido; si consumo o propina lleva tarjeta, selecciona la terminal y Crédito o Débito. Efecto: El método alimenta el corte de caja.

4. **Registra propina.** Elige sin propina, fija o porcentaje y su método de pago. Efecto: La propina se suma después del consumo y no genera IVA.

5. **Confirma.** Revisa total, efectivo recibido, cambio y propina antes de Confirmar y cerrar. Efecto: La mesa se libera y la venta queda cerrada.

6. **Verifica ticket postpago.** Confirma la impresión o revisa el aviso pendiente en Datos. Efecto: El postpago incluye la propina registrada.

### Ejemplo

**Consumo y propina por métodos distintos.** Para consumo $200 con tarjeta y propina $20 en efectivo, selecciona cada método por separado. El total es $220, tarjeta $200 y efectivo $20. Si recibes $50 en efectivo, el cambio es $30.

### Si algo no funciona

- **No puedo confirmar el pago:** Revisa efectivo suficiente y, si cualquier parte va con tarjeta, terminal activa y Crédito o Débito. Confirma que la caja esté abierta.
- **Ya cerré con el método equivocado:** Usa Corregir pago desde Caja o el detalle de la venta. No abras otra cuenta ni borres la venta: conserva total y registra motivo. Por defecto solo administración puede corregir; puede conceder el permiso desde Usuarios → Editar → Permiso para corregir pagos.

### Comprueba antes de terminar

- Consumo y propina tienen el método correcto.
- La terminal corresponde al comprobante.
- Total, recibido y cambio coinciden antes de confirmar.

### Efectos de la operación

- Genera una venta y libera la mesa.
- Descuento e IVA quedan desglosados.
- La propina no forma parte de la base de IVA.
- Efectivo, tarjeta y cambio impactan el corte.

**Atención:** No cierres la cuenta con un método o propina provisional. Después del corte de caja algunas correcciones dejan de estar disponibles.

**Resultado esperado:** Datos, ticket y corte muestran los mismos importes, con consumo, descuento, IVA y propina separados.

Relacionadas: [Cómo corregir el pago de una cuenta cerrada](#correct-payment) · [Cómo configurar terminales y registrar tarjetas](#payment-terminals) · [Cuándo imprimir ticket prepago y postpago](#prepaid-postpaid) · [Cómo abrir y cerrar caja](#cash-daily)

<a id="prepaid-postpaid"></a>

## Cuándo imprimir ticket prepago y postpago

Consulta el total con descuento y el ticket antes de imprimir o cobrar. El postpago refleja el cierre.

Para: Mesero, Caja, Administrador. Tiempo orientativo: 4 min.

### Antes de empezar

- Para imprimir, tener una impresora de tickets seleccionada. Consultar el total y guardar el descuento no requiere impresora.
- La orden debe contener productos.

### Pasos

1. **Selecciona el descuento en la cuenta.** En Venta, abre la cuenta y elige Descuento de la cuenta junto al total. Se guarda al seleccionar y muestra cuánto debe pagar el cliente sin abrir Finalizar. Sin descuento retira el descuento existente. En móvil, toca Prepago en la barra inferior de Venta. Efecto: Afecta consumo e IVA; conserva abierta la cuenta.

2. **Visualiza el prepago antes de imprimir.** Pulsa Prepago y descuento desde la cuenta, Mesas, para llevar o el registro abierto en Datos. Total para el cliente aparece arriba y Así queda el ticket muestra productos, descuento, IVA y total. Cambiar Descuento del prepago actualiza ambos al instante. Efecto: Esta vista no imprime ni cobra. Un cambio de descuento aquí permanece pendiente hasta guardarlo; cerrar la ventana lo descarta.

3. **Guarda el importe confirmado.** Usa Guardar prepago para conservarlo sin imprimir, Guardar e imprimir para enviarlo al papel o Continuar al cobro para pasar a Finalizar con el descuento guardado. Si solo estás consultando, puedes cerrar la vista sin modificar la cuenta. Efecto: La impresión y el cobro usan el descuento de la cuenta, una sola vez.

4. **Cobra la cuenta.** Registra método y propina, revisa el descuento preparado y confirma el cierre. Si debes cambiarlo, usa Revisar prepago. Efecto: Solo entonces existe el postpago definitivo.

5. **Imprime postpago desde Datos.** Después del cobro entra en Datos, filtra Postpago pendiente y pulsa Imprimir postpago en la cuenta correcta. Efecto: El postpago contiene la propina y los datos finales; si falla, el aviso permanece pendiente.

6. **Reimprime desde Datos.** Busca el folio. Usa Reimprimir en Prepago o Imprimir/Reimprimir postpago según la columna. Efecto: Reimprimir no crea otra venta ni modifica inventario.

7. **Omite avisos conscientemente.** Si el prepago fue suficiente, quita el aviso postpago individual o por filtro. Efecto: Solo elimina el aviso; la venta permanece intacta.

### Ejemplo

**Un descuento se aplica una vez.** Un consumo de $200 con 10% queda en $180 en el prepago. Al cobrar conserva $180; no vuelve a bajar a $162. Si agregas productos después, revisa el descuento recalculado y entrega una nueva cuenta.

### Si algo no funciona

- **El prepago no coincide con el cobro:** Comprueba si añadiste o quitaste productos después de imprimir. Revisa el descuento guardado y recuerda que el prepago no incluye una propina futura.
- **El postpago vuelve a aparecer pendiente:** Una corrección de pago invalida el comprobante anterior. Reimprime el postpago corregido; quitar el aviso no imprime ni elimina la venta.
- **Cerré la vista y no se guardó el descuento:** En la cuenta principal se guarda al seleccionar. Dentro de la vista previa, el cambio es un borrador: usa Guardar prepago, Guardar e imprimir o Continuar al cobro. Cerrar sin guardar conserva el descuento anterior.

### Comprueba antes de terminar

- El tipo de ticket corresponde al momento del servicio.
- El descuento se guardó antes de cobrar si debía verse en prepago.
- La última impresión coincide con los datos de la cuenta.
- El importe visible en Total para el cliente y el TOTAL del ticket coinciden antes de imprimir.

### Efectos de la operación

- Las líneas muestran precios finales con IVA incluido por defecto.
- Prepago: orden abierta y sin propina futura.
- Postpago: venta cerrada con propina final.
- Reimpresión no duplica cobro.
- Omitir aviso no borra la venta.

**Atención:** No confundas una reimpresión con un nuevo cobro. Comprueba siempre folio, tipo de ticket y estado de la venta.

**Resultado esperado:** El cliente recibe el tipo correcto de cuenta y Datos refleja si fue impresa u omitida.

Relacionadas: [Cómo cobrar, aplicar descuentos y registrar propina](#checkout-discounts-tips) · [Cómo configurar y probar impresoras](#printer-setup) · [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete) · [Cómo comandar: digital o digital + impresa](#command-order)

<a id="cash-daily"></a>

## Cómo abrir y cerrar caja

Controla fondo inicial, cobros, gastos, efectivo esperado y diferencia del turno.

Para: Caja, Administrador. Tiempo orientativo: 4 min.

### Antes de empezar

- Tener función de caja o administrador.
- Contar físicamente el fondo inicial y el efectivo final.

### Pasos

1. **Abre caja.** En Apertura de caja captura el Fondo inicial real, añade una nota si aplica y pulsa Abrir caja. Efecto: Habilita nuevas mesas, pedidos y cobros.

2. **Opera normalmente.** Registra ventas con su método correcto y gastos en el flujo correspondiente. Efecto: Efectivo, tarjeta, propinas y gastos alimentan el esperado.

3. **Revisa antes del corte.** Confirma ventas, descuentos, IVA, compras y gastos, y cierra o cancela todas las órdenes abiertas. Efecto: Cerrar caja y finalizar turno permanece deshabilitado mientras existan órdenes abiertas.

4. **Cuenta efectivo.** Captura el efectivo físico sin ajustar el número para forzar una diferencia cero. Efecto: LibrePOS compara contado contra esperado.

5. **Documenta y cierra.** Si existe diferencia, escribe una nota clara y confirma el cierre. Efecto: Después del corte algunas correcciones de propina quedan bloqueadas.

6. **Corrige un método equivocado.** En Datos busca la cuenta cerrada y pulsa Corregir pago. Selecciona el pago de consumo y propina, indica efectivo recibido o terminal y tipo de tarjeta, escribe el motivo, guarda y confirma. Por defecto solo administración puede corregir, incluso con la caja abierta. Puede autorizar a otro usuario con función Caja desde Usuarios → Editar → Permiso para corregir pagos. Efecto: Conserva el total y el efectivo contado; actualiza importes por método, esperado y diferencia. Guarda historial y deja el postpago pendiente de reimpresión.

### Ejemplo

**Calcular esperado y diferencia.** Con fondo $500, entradas en efectivo $1,000 —incluidas propinas en efectivo— y gastos de caja $200, se esperan $1,300. Si cuentas $1,280, la diferencia es -$20. Las ventas con tarjeta no entran al efectivo esperado.

### Si algo no funciona

- **No permite cerrar caja:** Revisa todas las órdenes abiertas, incluidas Para llevar. Cobra o cancela cada una según lo ocurrido; no cierres cuentas ficticiamente sólo para habilitar el corte.
- **El esperado cambió después del cierre:** Revisa el historial de correcciones de pago. Administración puede reclasificar efectivo/tarjeta; el efectivo contado se conserva y la diferencia se recalcula.

### Comprueba antes de terminar

- No quedan órdenes abiertas.
- Compras y gastos no se registraron dos veces.
- El contado refleja el dinero físico, aunque haya diferencia.

### Efectos de la operación

- La caja abierta habilita operación.
- Compras registradas pueden reducir efectivo esperado.
- Propinas se separan por método.
- El cierre conserva contado, esperado y diferencia.

**Atención:** No cambies movimientos reales para ocultar una diferencia. Registra la nota y revisa la causa con Datos e Inventario.

**Resultado esperado:** El corte refleja fielmente operación, efectivo contado y cualquier diferencia documentada.

Relacionadas: [Cómo corregir el pago de una cuenta cerrada](#correct-payment) · [Cómo cobrar, aplicar descuentos y registrar propina](#checkout-discounts-tips) · [Cómo registrar una compra de inventario](#inventory-purchase) · [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete)

<a id="inventory-purchase"></a>

## Cómo registrar una compra de inventario

Suma existencias, actualiza costo y registra el efecto de caja de una compra.

Para: Administrador. Tiempo orientativo: 4 min.

### Antes de empezar

- El insumo debe existir en Catálogo.
- Tener cantidad y costo total del ticket de compra.

### Pasos

1. **Abre Inventario.** En Movimiento de inventario selecciona el Insumo comprado. Efecto: La compra se vincula con un solo insumo por registro.

2. **Captura cantidad.** Introduce la Cantidad comprada en la unidad del insumo. Efecto: Se suma a la existencia actual.

3. **Captura costo.** En Coste del ticket registra el importe total correspondiente a esa cantidad. Efecto: LibrePOS calcula y actualiza el costo unitario vigente.

4. **Añade referencia.** Documenta Proveedor y Ticket / nota para facilitar una revisión posterior. Efecto: La trazabilidad aparece en movimientos y gastos.

5. **Confirma.** Pulsa Subir ticket y revisa nueva cantidad y costo. Efecto: Con caja abierta, el importe reduce el efectivo esperado.

### Ejemplo

**Compra expresada en la unidad correcta.** Para 5 KG de queso por $600, captura Cantidad comprada 5 y Coste del ticket 600. La existencia sube 5 y el costo unitario pasa a $120. Si se liga a caja abierta, los $600 reducen el esperado.

### Si algo no funciona

- **La factura trae varios insumos:** Separa cantidad y costo de cada insumo; no repitas el total de toda la factura en cada línea. Usa la misma referencia para relacionar los movimientos.
- **Compré a crédito o con otro medio:** Este flujo registra un gasto que puede reducir efectivo esperado si hay caja abierta. Revisa su tratamiento con administración antes de registrar una salida de caja que no ocurrió.

### Comprueba antes de terminar

- Cantidad y costo total corresponden al mismo insumo.
- Se revisó el nuevo costo unitario.
- La compra y su gasto aparecen una sola vez.

### Efectos de la operación

- Aumenta inventario.
- Actualiza costo unitario.
- Crea movimiento y gasto relacionado.
- Puede reducir efectivo esperado del turno.

**Atención:** No captures el costo por unidad en el campo de total si el ticket contiene varias unidades; el costo resultante sería incorrecto.

**Resultado esperado:** La existencia aumenta, el costo vigente coincide con la compra y Caja refleja el gasto cuando aplica.

Relacionadas: [Cómo crear un insumo](#create-ingredient) · [Cómo registrar una merma](#inventory-waste) · [Cómo hacer un inventario completo](#full-inventory-count) · [Cómo abrir y cerrar caja](#cash-daily)

<a id="inventory-waste"></a>

## Cómo registrar una merma

Descuenta producto perdido sin confundirlo con venta, receta o corrección de conteo.

Para: Administrador. Tiempo orientativo: 3 min.

### Antes de empezar

- El insumo debe tener existencia suficiente.
- Conocer cantidad y motivo real de la pérdida.

### Pasos

1. **Abre Merma.** En Inventario localiza el panel Merma. Efecto: Este flujo registra una salida no asociada a venta.

2. **Selecciona insumo.** Comprueba nombre, unidad y existencia antes de continuar. Efecto: Evita descontar otro insumo con nombre parecido.

3. **Captura cantidad.** Introduce la pérdida en la unidad del inventario. Efecto: No puede ser mayor que la existencia registrada.

4. **Documenta motivo.** Escribe caducidad, derrame, preparación fallida u otra causa concreta. Efecto: El motivo permite separar merma de descuadre.

5. **Registra y verifica.** Pulsa Registrar merma y revisa la nueva existencia y el movimiento. Efecto: Reduce cantidad y valor estimado del inventario.

### Ejemplo

**Una pérdida física conocida.** Si se derraman 250 ml y el insumo está en LITRO, registra 0.250 y describe el derrame. No registres 250 litros. La merma baja existencias sin crear un cobro ni gasto de caja.

### Si algo no funciona

- **La cantidad supera existencias:** Comprueba unidad, cantidad y compras pendientes de registrar. No reduzcas el número sólo para evitar el aviso sin investigar la diferencia.
- **Sólo sé que el conteo no coincide:** Usa Inventario completo para registrar la cantidad física. Merma es para una pérdida identificada; no inventes un motivo para cuadrar.

### Comprueba antes de terminar

- La cantidad perdida y su unidad son correctas.
- El motivo explica un hecho conocido.
- Existe un único movimiento de merma.

### Efectos de la operación

- Reduce existencias.
- Registra movimiento de tipo merma.
- No crea venta ni modifica caja.
- Conserva usuario, fecha y motivo.

**Atención:** Si la diferencia se descubrió durante un conteo general, usa Inventario completo; no fabriques una merma si desconoces la causa.

**Resultado esperado:** El inventario baja exactamente la cantidad perdida y existe un movimiento con motivo verificable.

Relacionadas: [Cómo registrar una compra de inventario](#inventory-purchase) · [Cómo hacer un inventario completo](#full-inventory-count) · [Cómo quitar productos o cancelar una cuenta](#cancel-item-order) · [Cómo crear un insumo](#create-ingredient)

<a id="full-inventory-count"></a>

## Cómo hacer un inventario completo

Compara existencias teóricas con conteo físico y aplica diferencias con confirmación.

Para: Administrador. Tiempo orientativo: 6 min.

### Antes de empezar

- Detener temporalmente compras, comandas y mermas mientras se cuenta.
- Usar las unidades definidas para cada insumo.

### Pasos

1. **Prepara el conteo.** Asegura que no haya movimientos simultáneos y organiza responsables por categoría. Efecto: Evita que el teórico cambie durante el conteo.

2. **Abre Inventario completo.** Revisa la columna Debe haber de cada insumo. Efecto: Debe haber procede de compras, comandas, extras, cancelaciones y mermas registradas.

3. **Captura solo lo contado.** Escribe la cantidad física en su unidad. Deja vacío lo que aún no se contó. Efecto: Vacío no equivale a cero; cero significa que físicamente no existe.

4. **Revisa diferencias.** LibrePOS muestra pérdida o ganancia por insumo y su valor estimado. Efecto: Los extras pueden producir diferencias por gramajes estimados.

5. **Confirma APLICAR.** Solo después de revisar, pulsa aplicar y escribe la palabra solicitada. Efecto: Las existencias se reemplazan por el conteo físico.

6. **Investiga descuadres.** Usa movimientos, recetas y mermas para explicar diferencias relevantes. Efecto: El ajuste corrige existencias, pero no explica por sí solo la causa.

### Ejemplo

**Vacío no significa cero.** Si hay 8 KG teóricos y cuentas 7.5, el ajuste es -0.5 KG. Si no has contado otro insumo, deja su campo vacío. Escribe 0 sólo cuando verificaste que realmente no queda nada.

### Si algo no funciona

- **Cambió Debe haber durante el conteo:** Detén compras, comandas y mermas y vuelve a contrastar el conteo antes de aplicar. La comparación deja de ser válida si hubo movimientos simultáneos.
- **Quiero corregir un conteo aplicado:** Vuelve a contar y registra un nuevo ajuste con motivo; conserva la trazabilidad. Comprueba recetas y extras para investigar la causa.

### Comprueba antes de terminar

- Sólo tienen valor los insumos realmente contados.
- Se revisaron diferencias y unidades antes de APLICAR.
- Los movimientos justifican el ajuste realizado.

### Efectos de la operación

- Sustituye existencias teóricas por físicas.
- Registra cada diferencia y su valor.
- Marca consumos estimados de extras.
- No modifica ventas ni caja.

**Atención:** Es una operación masiva. No escribas cero en filas no contadas y no la ejecutes mientras otros usuarios generan movimientos.

**Resultado esperado:** Inventario coincide con el conteo físico y las diferencias quedan registradas para análisis.

Relacionadas: [Cómo registrar una compra de inventario](#inventory-purchase) · [Cómo registrar una merma](#inventory-waste) · [Cómo crear un extra](#create-extra) · [Cómo quitar productos o cancelar una cuenta](#cancel-item-order)

<a id="printer-setup"></a>

## Cómo configurar y probar impresoras

Selecciona impresoras de tickets y comandas, ajusta formato y diagnostica una prueba fallida.

Para: Administrador. Tiempo orientativo: 6 min.

### Antes de empezar

- La impresora debe estar instalada en Windows o macOS.
- Bluetooth debe estar vinculado al equipo servidor.
- Realizar la prueba desde el laptop que ejecuta LibrePOS.

### Pasos

1. **Instala en el sistema.** Comprueba primero que Windows o macOS pueda imprimir una página de prueba. Efecto: LibrePOS utiliza las impresoras disponibles en el equipo servidor.

2. **Abre Configuración.** En Impresión entra a Tickets o Comandas según el destino. Efecto: Cada flujo puede usar una impresora diferente.

3. **Selecciona por nombre.** Elige la impresora detectada o captura Nombre manual y pulsa Seleccionar para tickets o Seleccionar para comandas. Efecto: La impresora seleccionada queda guardada para ese tipo de impresión.

4. **Haz una prueba corta.** En Tickets empieza por Imprimir solo cabecera o Imprimir ticket de prueba antes de una cuenta completa. Efecto: Reduce papel desperdiciado durante diagnóstico.

5. **Ajusta formato y precios.** Configura márgenes, logotipo, tamaño y posición. En Precio por producto, IVA incluido es el modo predeterminado. Efecto: Cada producto y extra muestra su precio final sin una leyenda adicional; el subtotal sin IVA y el IVA permanecen separados al final.

6. **Valida comandas.** Activa impresión automática solo después de una prueba correcta. Efecto: Digital + impresa y la impresión automática dependen de esta selección.

7. **Ante un error.** Conserva el mensaje completo, verifica conexión y vuelve a probar la impresora desde el sistema operativo. Efecto: No reinstales LibrePOS ni borres datos para resolver una impresora.

### Ejemplo

**Separar conexión, destino y formato.** Primero imprime una prueba desde el sistema del servidor. Luego selecciona esa misma impresora en Tickets y haz una prueba de LibrePOS. Repite en Comandas si usa otro destino; funcionar en una pestaña no configura la otra.

### Si algo no funciona

- **Imprime desde el servidor pero no desde el teléfono:** Las impresiones se envían a la impresora del servidor, no a una emparejada sólo al teléfono. Revisa que ambos usen la misma instancia de LibrePOS.
- **Sale papel en blanco o cortado:** Comprueba papel térmico, orientación y formato en el sistema; después revisa márgenes y tamaño en LibrePOS. Revisa la cola antes de repetir muchas pruebas.

### Comprueba antes de terminar

- La prueba del sistema funciona.
- Tickets y Comandas tienen destino correcto.
- La prueba completa es legible antes de activar impresión automática.

### Efectos de la operación

- La selección se guarda por tipo de documento.
- La impresión ocurre en el equipo servidor.
- Márgenes, logo y modo de precio solo cambian la salida impresa.
- La comanda digital continúa siendo la referencia operativa.

**Atención:** No elimines ni reinstales LibrePOS por una falla de impresión. Primero valida la impresora en Windows/macOS y conserva el error completo.

**Resultado esperado:** Pruebas, tickets y comandas salen por la impresora elegida con márgenes y contenido legibles.

Relacionadas: [Cómo comandar: digital o digital + impresa](#command-order) · [Cuándo imprimir ticket prepago y postpago](#prepaid-postpaid) · [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete)

<a id="iva-settings"></a>

## Cómo activar, cambiar o iniciar una etapa de IVA

Configura el impuesto para órdenes nuevas sin reescribir ventas antiguas.

Para: Administrador. Tiempo orientativo: 6 min.

### Antes de empezar

- Definir el porcentaje autorizado.
- Realizar respaldo antes de conversiones o reinicio de folios.
- Cerrar o revisar órdenes abiertas antes del cambio.

### Pasos

1. **Abre Configuración general.** En Config pulsa General y localiza Activar IVA y Porcentaje IVA. Efecto: Los cambios se guardan desde estos controles y solo los heredan las órdenes abiertas después del cambio.

2. **Configura porcentaje.** Activa IVA e introduce el porcentaje, por ejemplo 16%. Efecto: Ventas antiguas sin IVA guardado permanecen con IVA 0.

3. **Decide cómo tratar precios.** Si los precios actuales deben convertirse en base y el total debe subir, usa la conversión avanzada solo tras revisar ejemplos. Efecto: La conversión modifica precios de catálogo, incluidos extras; no ventas cerradas.

4. **Revisa ejemplos.** Compara precio actual, IVA y nuevo total en varios productos antes de confirmar. Efecto: Evita reducir accidentalmente la base o conservar un total incorrecto.

5. **Gestiona folios si inicia etapa.** El reinicio renombra folios anteriores con prefijo A, B u otro y vuelve a iniciar el consecutivo. Efecto: No borra ventas, inventario ni movimientos históricos.

6. **Haz una venta controlada.** Crea una orden nueva y valida base, IVA, total, ticket y Datos. Efecto: Confirma el flujo completo antes de operar.

### Ejemplo

**Diferencia entre cambiar tasa y convertir precios.** Con base $100 e IVA 16%, el final es $116. Si una conversión toma $116 como nueva base, el final sería $134.56. Revisa qué representa el precio actual antes de confirmar una conversión.

### Si algo no funciona

- **Una orden conserva la tasa anterior:** Las órdenes conservan su configuración de impuesto. Revisa una orden nueva para comprobar la nueva tasa, sin alterar ventas históricas.
- **Los folios anteriores tienen letras:** Una nueva etapa de folios puede prefijar los anteriores. Busca el folio completo y revisa la etapa; no borres ventas por interpretar el prefijo como un duplicado.

### Comprueba antes de terminar

- Se revisaron ejemplos antes de cualquier conversión.
- Una orden nueva tiene el desglose esperado.
- Existe respaldo anterior al cambio de etapa.

### Efectos de la operación

- Órdenes nuevas capturan la tasa vigente.
- Órdenes antiguas conservan su IVA histórico.
- La conversión avanzada aumenta precios finales si el actual pasa a ser base.
- El reinicio de folios renombra históricos, no los elimina.

**Atención:** No ejecutes la conversión avanzada ni el reinicio de folios sin respaldo y revisión de ejemplos. Son decisiones administrativas de amplio alcance.

**Resultado esperado:** Las órdenes nuevas muestran el impuesto correcto y el histórico anterior permanece consistente y localizable.

Relacionadas: [Cómo modificar precios y entender el IVA](#edit-product-price) · [Cómo cobrar, aplicar descuentos y registrar propina](#checkout-discounts-tips) · [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete) · [Cómo crear un platillo o bebida](#create-product)

<a id="data-reprint-delete"></a>

## Cómo buscar, reimprimir o borrar una cuenta duplicada

Usa Datos para localizar folios, gestionar postpagos y eliminar únicamente duplicados confirmados.

Para: Administrador. Tiempo orientativo: 6 min.

### Antes de empezar

- Tener función de administrador.
- Conocer folio, UID, fecha o producto de la cuenta.
- Confirmar que un borrado corresponde realmente a una venta duplicada.

### Pasos

1. **Busca la orden.** En Datos usa folio, UID, mesa, pago, producto o rango de fechas. Efecto: Los filtros también permiten separar abiertas, cobradas, canceladas y tickets pendientes.

2. **Abre el detalle.** Comprueba productos, importes, descuento, IVA, propina, pago y fecha. Efecto: Evita actuar sobre una cuenta con folio parecido.

3. **Reimprime si es necesario.** Usa la columna prepago o postpago correspondiente. Efecto: Reimprimir no crea venta, cobro ni consumo adicional.

4. **Gestiona postpago pendiente.** Imprime, reintenta u omite el aviso individualmente o con el filtro actual. Efecto: Omitir solo quita la advertencia.

5. **Borra solo un duplicado.** En la fila correcta pulsa Borrar cuenta, revisa el resumen y escribe el folio o texto de confirmación solicitado. Efecto: Elimina definitivamente la cuenta y repone inventario asociado.

6. **Comprueba después.** Repite la búsqueda y revisa movimientos de inventario. Efecto: El folio eliminado no se reasigna automáticamente.

### Ejemplo

**Método incorrecto no es venta duplicada.** Si existe una sola venta real marcada como tarjeta y se pagó en efectivo, usa Corregir pago. Borrar cuenta se reserva para un duplicado verificado y cambia registros e inventario; no sustituye una corrección.

### Si algo no funciona

- **No encuentro el folio:** Limpia filtros de fecha, método y postpago. Busca también UID, mesa o producto, y considera el prefijo de etapa si se reiniciaron folios.
- **Hay dos ventas parecidas:** Compara UID, orden, hora, productos y comprobantes. Dos importes iguales no prueban duplicidad. Exporta respaldo antes de borrar una cuenta verificada.

### Comprueba antes de terminar

- Se verificaron identidad y fecha, no sólo el importe.
- Se eligió reimpresión, corrección o borrado según el caso.
- Después se revisaron caja e inventario si la acción los afecta.

### Efectos de la operación

- Búsqueda y reimpresión no cambian datos.
- Omitir postpago solo elimina el aviso.
- Borrar elimina la venta seleccionada.
- El borrado repone inventario y conserva el avance del consecutivo.

**Atención:** El borrado es irreversible y solo debe usarse para duplicados comprobados. Para una incidencia operativa usa Cancelar cuenta.

**Resultado esperado:** La cuenta correcta se localiza y la acción elegida produce exactamente el efecto esperado sin duplicar ventas.

Relacionadas: [Cómo corregir el pago de una cuenta cerrada](#correct-payment) · [Cuándo imprimir ticket prepago y postpago](#prepaid-postpaid) · [Cómo abrir y cerrar caja](#cash-daily) · [Cómo respaldar y actualizar LibrePOS](#backup-update)

<a id="users-permissions"></a>

## Cómo crear usuarios y asignar funciones

Configura funciones y el permiso individual para corregir pagos. Por defecto, solo administración puede corregirlos.

Para: Administrador. Tiempo orientativo: 4 min.

### Antes de empezar

- Tener función de administrador.
- Definir qué tareas realizará la persona.

### Pasos

1. **Abre Usuarios.** Revisa la tabla Equipo activo para confirmar que la persona no tenga ya una cuenta. Efecto: Un usuario debe representar a una sola persona.

2. **Crea identidad.** Pulsa Nuevo usuario y captura Nombre, Usuario y Contraseña inicial. Efecto: El usuario identifica ventas, comandas, movimientos y fichajes.

3. **Asigna funciones.** Selecciona solo Mesero, Cocina, Caja o Administrador según sus responsabilidades. Efecto: Las funciones controlan qué secciones y operaciones puede usar.

4. **Configura la corrección de pagos.** En Nuevo usuario o Editar, busca Permiso para corregir pagos. Deja Sin permiso para mantener la restricción a administradores. Para una persona con función Caja puedes elegir Solo caja abierta o Cualquier caja (incluye cortes cerrados). Pulsa Guardar cambios al editar. Efecto: El permiso es individual. Los administradores siempre tienen acceso; una persona con función Caja no lo obtiene automáticamente.

5. **Prueba el acceso.** Inicia sesión con la cuenta y confirma que vea únicamente lo necesario. Efecto: Detecta permisos excesivos o faltantes antes de operar.

6. **Mantén la cuenta.** Usa Editar, Resetear clave o Más acciones para desactivar el usuario cuando corresponda. Efecto: Desactivar conserva historial pero impide nuevos accesos.

### Ejemplo

**Cobrar sin poder corregir pagos.** Una persona con función Caja y Sin permiso puede cobrar, pero no cambiar el pago de una venta cerrada. Si administración le concede Solo caja abierta podrá corregir ventas del turno actual. Al volver a Sin permiso pierde ese acceso también en las sesiones que ya tenía abiertas.

### Si algo no funciona

- **No aparece una sección:** Revisa las funciones asignadas y que el usuario esté activo. No compartas admin para resolver una falta de permiso; solicita el acceso adecuado.
- **No entra después de un cambio de clave:** Comprueba usuario exacto, nueva contraseña y mismo servidor. Tras restauraciones, una exportación JSON de interfaz puede no contener credenciales completas; usa la copia completa del servidor.
- **Tiene Caja pero no puede corregir:** Es el comportamiento predeterminado. Solo administración configura el campo Permiso para corregir pagos. Comprueba también el alcance de caja abierta o cualquier caja y que el usuario haya iniciado sesión con el servidor.

### Comprueba antes de terminar

- Cada persona tiene su identidad propia.
- Sólo tiene las funciones necesarias.
- Se comprobó el acceso y se conserva un administrador activo.
- Los usuarios existentes de Caja quedan sin permiso de corrección salvo concesión explícita.

### Efectos de la operación

- Atribuye acciones a una persona.
- Limita acceso por función.
- Desactivar conserva históricos.
- Administrador permite operaciones sensibles.

**Atención:** No compartas admin ni asignes Administrador para resolver una falta de acceso puntual. Otorga el mínimo permiso necesario.

**Resultado esperado:** La persona accede con su propia cuenta y solo puede realizar las tareas autorizadas.

Relacionadas: [Cómo abrir y cerrar caja](#cash-daily) · [Cómo abrir una mesa o pedido para llevar](#open-order) · [Cómo comandar: digital o digital + impresa](#command-order) · [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete) · [Cómo corregir el pago de una cuenta cerrada](#correct-payment)

<a id="kitchen-flow"></a>

## Cómo gestionar comandas en Cocina

Avanza cada comanda de Nuevas a En preparación y Listas para entregar, sin perder opciones ni notas.

Para: Cocina, Mesero, Administrador. Tiempo orientativo: 4 min.

### Antes de empezar

- La orden debe haberse comandado digitalmente.
- El usuario debe tener función de Cocina.

### Pasos

1. **Ubica la comanda.** En Cocina revisa la columna Nuevas y comprueba mesa o pedido, hora, piezas, variantes, extras y notas. Efecto: La comanda digital es la referencia aunque la impresión haya fallado.

2. **Pulsa Preparar.** Hazlo cuando una persona toma la comanda para elaborarla. Efecto: La tarjeta pasa de Nuevas a En preparación y comienza a medir ese tiempo.

3. **Pulsa Lista.** Hazlo únicamente cuando todos los productos de esa comanda estén terminados y completos. Efecto: La tarjeta pasa a Listas para entregar y el personal sabe que puede recogerla.

4. **Confirma la entrega desde Mesas.** Cocina no tiene un botón Entregar. La entrega al cliente se registra desde la mesa u orden correspondiente. Efecto: Se cierra el recorrido de servicio sin cerrar ni cobrar la cuenta.

5. **Gestiona una incidencia.** Usa el icono Cancelar producto, confirma cantidad y añade una nota cuando ayude a explicar el motivo. Efecto: Conserva trazabilidad y repone inventario cuando corresponde.

### Ejemplo

**Comanda lista y entrega son pasos distintos.** Pulsa Lista cuando todos los productos del lote estén terminados. El mesero confirma su entrega desde Mesas; Lista no demuestra por sí sola que el cliente ya recibió el pedido.

### Si algo no funciona

- **No veo una comanda:** Comprueba filtros, estado y mismo servidor/puerto. Pregunta si Venta llegó a comandar: añadir productos a la cuenta todavía no envía el lote.
- **Se canceló algo que ya estaba preparado:** Revisa la cantidad cancelada, avisa al responsable y coordina la pérdida física con administración. No prepares otra pieza sin confirmar la nueva instrucción.

### Comprueba antes de terminar

- Mesa, variantes y notas se leyeron antes de preparar.
- El lote sólo se marcó listo al completarlo.
- La entrega se confirmó desde la mesa.

### Efectos de la operación

- Actualiza el estado visible de cada línea.
- No cobra ni cierra la mesa.
- No vuelve a descontar inventario al cambiar estado.
- Mantiene folio, hora y notas de preparación.

**Atención:** No pulses Lista para limpiar el tablero si el producto aún no está completo. La entrega posterior debe confirmarse desde Mesas.

**Resultado esperado:** Cada comanda avanza de Nuevas a En preparación y Listas para entregar, y la entrega se completa desde Mesas.

Relacionadas: [Cómo comandar: digital o digital + impresa](#command-order) · [Cómo configurar mixtos, variantes, extras y notas](#configure-product) · [Cómo quitar productos o cancelar una cuenta](#cancel-item-order) · [Cómo abrir una mesa o pedido para llevar](#open-order)

<a id="attendance-profile"></a>

## Cómo usar Mi perfil y registrar asistencia

Registra Entrada o Salida con tu propio usuario y revisa tus registros personales.

Para: Todos. Tiempo orientativo: 2 min.

### Antes de empezar

- Entrar con la cuenta personal, no con un usuario compartido.

### Pasos

1. **Abre Mi perfil.** Comprueba que nombre y usuario correspondan a la persona que está operando. Efecto: Las acciones posteriores quedarán atribuidas a esa sesión.

2. **Registra Entrada.** En Mi fichaje pulsa Entrada al comenzar la jornada. Efecto: Crea un registro con fecha, hora y usuario.

3. **Opera con la misma cuenta.** No intercambies sesión mientras realizas ventas, comandas o movimientos. Efecto: Mantiene responsabilidad individual.

4. **Registra Salida.** Regresa a Mi perfil y pulsa Salida al finalizar. Efecto: Cierra la duración del turno; no cierra Caja automáticamente.

5. **Revisa incidencias.** Si olvidaste salir, informa al administrador para revisar el registro. Efecto: LibrePOS puede cerrar fichajes abandonados, pero debe validarse la hora real.

### Ejemplo

**Comprobar quién está operando.** Antes de fichar o cobrar mira el nombre de Mi perfil. Entrada y Salida deben corresponder a la persona real; dejar la sesión anterior abierta atribuye acciones al usuario equivocado.

### Si algo no funciona

- **Ya aparece una jornada abierta:** Revisa la hora de entrada y avisa al administrador si se olvidó una salida. No uses otra cuenta para ocultar la incidencia.
- **El resumen no coincide con todo el restaurante:** Mi perfil muestra información personal. Para totales generales y cortes consulta Caja o Datos con la función correspondiente.

### Comprueba antes de terminar

- El perfil corresponde al operador.
- La entrada y salida se registraron una vez.
- Las incidencias se comunicaron con hora y fecha.

### Efectos de la operación

- Registra entrada y salida personal.
- No sustituye apertura o cierre de Caja.
- Vincula acciones con la sesión activa.
- Facilita revisar turnos incompletos.

**Atención:** No fiches con admin ni con la cuenta de otra persona. Un usuario compartido elimina la trazabilidad individual.

**Resultado esperado:** El turno muestra hora de entrada y salida correctas bajo la persona correspondiente.

Relacionadas: [Cómo crear usuarios y asignar funciones](#users-permissions) · [Cómo abrir y cerrar caja](#cash-daily) · [Cómo abrir una mesa o pedido para llevar](#open-order) · [Cómo gestionar comandas en Cocina](#kitchen-flow)

<a id="backup-update"></a>

## Cómo respaldar y actualizar LibrePOS

Protege ventas e inventario antes de una actualización y comprueba el resultado sin reinstalar.

Para: Administrador. Tiempo orientativo: 5 min.

### Antes de empezar

- Usar el equipo servidor.
- No interrumpir ventas durante el respaldo o actualización.
- Tener conexión a Internet solo para actualizar.

### Pasos

1. **Cierra operación activa.** Revisa órdenes abiertas y evita que otros usuarios cambien datos durante el proceso. Efecto: Reduce conflictos entre respaldo y nuevos movimientos.

2. **Exporta respaldo.** Desde Datos descarga Respaldo JSON y guárdalo fuera del equipo servidor. Efecto: Conserva una copia lógica del estado compartido.

3. **Haz copia completa si el cambio es importante.** Con el servidor detenido, copia la carpeta local de datos a otro disco. Efecto: Incluye ventas, usuarios, inventario y configuración local.

4. **Pulsa Actualizar.** Solo el administrador verá el botón cuando exista una versión nueva. Espera hasta que termine. Efecto: Descarga aplicación nueva y conserva la carpeta de datos.

5. **Reinicia el servidor.** Cierra la ventana de LibrePOS y vuelve a abrirla con el acceso normal. Efecto: Carga también cambios del servidor local.

6. **Valida.** Comprueba versión, login, inventario, últimas ventas, impresoras y un flujo controlado. Efecto: Detecta problemas antes de reanudar toda la operación.

### Ejemplo

**Dos copias con fines distintos.** Respaldo JSON sirve para conservar el estado exportado y revisar datos. La copia completa de .librepos, hecha con el servidor detenido, también conserva credenciales y metadatos; es la indicada para recuperar o migrar el servidor.

### Si algo no funciona

- **No aparece Actualizar:** Sólo se ofrece a administradores si hay una versión posterior y GitHub responde. Revisa conexión a Internet y versión instalada; una red local puede funcionar aunque Internet falle.
- **La actualización terminó pero sigo viendo lo anterior:** Cierra y vuelve a abrir el servidor y recarga los dispositivos. Verifica versión y últimas ventas. Si falló la instalación de dependencias, conserva el mensaje y consulta Administración; no borres .librepos.

### Comprueba antes de terminar

- La copia está fuera del equipo y tiene fecha identificable.
- El servidor reinició y muestra la nueva versión.
- Login, ventas, caja, inventario e impresoras fueron revisados.

### Efectos de la operación

- El respaldo no modifica datos.
- La actualización conserva la carpeta local de operación.
- Reiniciar carga todos los componentes nuevos.
- La validación confirma que el estado anterior sigue disponible.

**Atención:** No reinstales ni borres la carpeta de datos para resolver una actualización. Conserva el mensaje de error y utiliza primero la reparación prevista.

**Resultado esperado:** La versión cambia y ventas, usuarios, inventario, configuración e impresoras siguen disponibles.

Relacionadas: [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete) · [Cómo configurar y probar impresoras](#printer-setup) · [Cómo crear usuarios y asignar funciones](#users-permissions) · [Cómo activar, cambiar o iniciar una etapa de IVA](#iva-settings)

<a id="correct-payment"></a>

## Cómo corregir el pago de una cuenta cerrada

Cambia efectivo o tarjeta, la propina y los datos de terminal sin duplicar la venta. Revisa también el efecto sobre un corte cerrado.

Para: Caja, Administrador. Tiempo orientativo: 6 min.

### Antes de empezar

- Tener la venta identificada por folio, fecha e importe y el comprobante real.
- Por defecto solo un administrador puede corregir pagos. Otro usuario necesita función Caja y un permiso explícito: Solo caja abierta o Cualquier caja (incluye cortes cerrados).
- Si hay importe con tarjeta, debe existir una terminal activa.

### Pasos

1. **Localiza la venta.** En Caja, o en Datos si tienes acceso, busca la cuenta y abre Ver cuenta. Comprueba folio, productos, hora y total. Si no ves las últimas columnas, usa Desplazar tabla: arrastra la barra o pulsa las flechas izquierda/derecha encima de las filas. Efecto: Evita cambiar otra venta de importe parecido.

2. **Abre Corregir pago.** Pulsa Corregir pago en la fila o el detalle. Revisa el método actual y el aviso si la caja ya está cerrada. Efecto: No reabre la orden ni crea un nuevo cobro.

3. **Selecciona cada método.** Elige Pago correcto del consumo y Pago de propina por separado. Si quieres pasar todo de tarjeta a efectivo, cambia ambos cuando exista propina. Efecto: Una propina puede permanecer en tarjeta aunque el consumo pase a efectivo.

4. **Completa importes y terminal.** En efectivo indica Efectivo realmente recibido. Si queda alguna parte con tarjeta, selecciona terminal activa y Crédito o Débito. Revisa efectivo, tarjeta y cambio. Efecto: El recibido debe cubrir el importe en efectivo; el total de la venta se conserva.

5. **Escribe motivo y confirma.** Explica el error con 5 a 240 caracteres. Pulsa Guardar corrección y revisa el resumen antes de confirmar. Efecto: Guarda autor, fecha y valores antes/después en el historial.

6. **Verifica corte y comprobante.** Revisa el historial, los totales por método y el corte. Reimprime el postpago actualizado si corresponde. Efecto: En caja cerrada cambia esperado y diferencia, conserva contado y deja el postpago pendiente.

### Ejemplo

**Tarjeta a efectivo después del corte.** Una venta de $220 marcada como tarjeta era $200 de consumo y $20 de propina en efectivo. Cambia ambos métodos. Si recibiste $250, el cambio es $30. El efectivo esperado del corte sube $220 y la diferencia baja $220; el contado no se modifica.

### Si algo no funciona

- **No aparece Corregir pago:** Tener función Caja ya no concede este permiso. Solicita a administración que revise Usuarios → Editar → Permiso para corregir pagos. Sin permiso bloquea la corrección; Solo caja abierta se limita al turno actual y Cualquier caja incluye cortes cerrados.
- **Cambió consumo, pero todavía pide terminal:** Revisa el método de la propina. Si alguna parte sigue en tarjeta, necesita terminal y tipo; cambia la propina sólo si también se pagó en efectivo.
- **El corte ahora muestra otra diferencia:** Es el efecto de reclasificar un pago. Revisa esperado, contado e historial; no cambies el contado para ocultar la diferencia.
- **Pide volver a iniciar sesión:** El permiso se verifica con el servidor. Tras reiniciarlo o al caducar la sesión, entra de nuevo con tu usuario antes de guardar. No repitas la corrección si no has comprobado primero el método de pago actual.
- **No veo Corregir pago al final de la fila:** En el buscador de Datos o en los cobros de Caja, usa Desplazar tabla encima de las filas. Arrastra la barra a la derecha o pulsa la flecha derecha; la flecha izquierda vuelve a las primeras columnas.

### Comprueba antes de terminar

- Folio y total permanecen iguales.
- Consumo y propina reflejan lo que ocurrió.
- Historial, corte y postpago fueron revisados.

### Efectos de la operación

- Conserva productos, total, descuento e IVA.
- Actualiza distribución entre efectivo y tarjeta, incluida propina.
- Conserva historial y efectivo contado; recalcula el corte afectado.
- No realiza cargos ni devoluciones bancarias.

**Atención:** Comprueba el medio realmente usado. Esta acción corrige el registro contable de LibrePOS; un movimiento bancario se gestiona por separado. Evita que dos personas corrijan simultáneamente la misma cuenta.

**Resultado esperado:** La misma venta muestra el método correcto, la corrección queda registrada y caja refleja la nueva distribución.

Relacionadas: [Cómo configurar terminales y registrar tarjetas](#payment-terminals) · [Cómo abrir y cerrar caja](#cash-daily) · [Cuándo imprimir ticket prepago y postpago](#prepaid-postpaid) · [Cómo buscar, reimprimir o borrar una cuenta duplicada](#data-reprint-delete) · [Cómo crear usuarios y asignar funciones](#users-permissions)

<a id="payment-terminals"></a>

## Cómo configurar terminales y registrar tarjetas

Identifica en qué terminal se recibió el pago y si fue crédito o débito. Conserva los nombres usados por las ventas anteriores.

Para: Caja, Administrador. Tiempo orientativo: 6 min.

### Antes de empezar

- Administración configura terminales; Caja las selecciona al cobrar.
- Identificar físicamente cada terminal y el comprobante del cliente.

### Pasos

1. **Abre Terminales.** Como administrador, entra en Configuración → Terminales. Revisa las terminales existentes antes de crear otra. Efecto: Evita duplicar el mismo equipo con nombres diferentes.

2. **Identifica cada equipo.** Asigna un nombre reconocible a cada terminal y guarda. Usa Crear terminal si necesitas otra. Efecto: El selector usa los nombres configurados.

3. **Selecciona al cobrar.** Si consumo o propina lleva tarjeta, indica Terminal y Tipo de tarjeta: Crédito o Débito. Compruébalo contra el comprobante. Efecto: Registra la atribución del pago; no conecta con el banco.

4. **Retira una terminal sin perder historial.** Desactiva una terminal que deje de usarse. Comprueba que ya no pueda seleccionarse para nuevos registros. Efecto: Las ventas conservan el nombre registrado al cobrar.

5. **Corrige un registro anterior.** Si elegiste otra terminal o tipo, usa Corregir pago en la venta, explica el motivo y revisa el resultado. Efecto: Conserva la venta y añade trazabilidad del cambio.

### Ejemplo

**Dos equipos con nombres claros.** Usa nombres como Terminal mostrador y Terminal terraza. Selecciona el que figura en el comprobante aunque otra persona haya realizado el cobro. Si se renombra después, el registro histórico conserva el nombre usado.

### Si algo no funciona

- **No hay terminales activas:** Pide a administración activar o crear una en Configuración → Terminales. No marques efectivo si el pago real fue tarjeta.
- **Una venta antigua dice sin registrar:** Puede ser anterior a esta función. Consulta el comprobante antes de corregir; no adivines terminal o tipo.

### Comprueba antes de terminar

- Los nombres permiten distinguir los equipos físicos.
- Hay al menos una activa si se aceptan tarjetas.
- Terminal y tipo del cobro coinciden con el comprobante.

### Efectos de la operación

- Los pagos con tarjeta requieren terminal activa y tipo.
- Una propina con tarjeta también requiere esos datos.
- Desactivar o renombrar no reescribe el nombre guardado en ventas anteriores.

**Atención:** Una terminal en LibrePOS es un dato de registro. Configurarla no empareja el equipo bancario ni confirma que el banco haya aprobado un cobro.

**Resultado esperado:** Cada pago nuevo con tarjeta identifica terminal y tipo y los equipos retirados dejan de ofrecerse.

Relacionadas: [Cómo cobrar, aplicar descuentos y registrar propina](#checkout-discounts-tips) · [Cómo corregir el pago de una cuenta cerrada](#correct-payment) · [Cómo abrir y cerrar caja](#cash-daily) · [Cómo crear usuarios y asignar funciones](#users-permissions)

<a id="lan-access"></a>

## Cómo entrar desde el teléfono y resolver problemas del QR

Obtén la dirección del servidor y distingue un problema del QR, de conexión local o de sincronización.

Para: Todos. Tiempo orientativo: 6 min.

### Antes de empezar

- LibrePOS debe estar abierto en el equipo servidor y éste debe permanecer encendido.
- Conectar teléfono y servidor a una red que permita comunicación entre dispositivos.
- Administración puede consultar el QR en Mi perfil → Acceso web.

### Pasos

1. **Comprueba el servidor.** En el equipo que ejecuta LibrePOS abre su dirección local y verifica que aparezca la aplicación. Mantén abierta la ventana del servidor. Efecto: Si tampoco abre allí, primero resuelve el arranque; el QR no inicia el servidor.

2. **Actualiza la dirección.** Como administrador abre Mi perfil → Acceso web y pulsa Actualizar direcciones. Si aparecen varias, selecciona la que corresponde a la red del teléfono. Efecto: El enlace y el QR usan la misma dirección; la IP puede cambiar al cambiar de WiFi.

3. **Abre desde el teléfono.** Escanea el QR o escribe exactamente el enlace mostrado, incluyendo http y el puerto. No uses localhost ni 127.0.0.1 en el teléfono. Efecto: En otro dispositivo localhost significa el propio teléfono.

4. **Aísla el fallo.** Si el QR no se reconoce, prueba el enlace escrito. Si tampoco abre, comprueba WiFi, servidor despierto, VPN, firewall y aislamiento de clientes o red de invitados. Efecto: Si el enlace abre, la conexión funciona y puedes revisar cámara, tamaño y brillo del QR.

5. **Comprueba instancia y datos.** Tras iniciar sesión, compara una mesa o folio conocido con el servidor. La operación habitual usa 5173; la demo suele usar 5174 y tiene datos separados. Efecto: Entrar a una demo o a otro servidor no muestra necesariamente los datos operativos.

6. **Ante desconexión durante el servicio.** Comprueba en el servidor si llegó el cobro o comanda antes de repetirlo. Recupera la conexión y contrasta los datos en ambos dispositivos. Efecto: Una pantalla que sigue abierta puede contener datos locales pendientes; no prueba que estén sincronizados.

### Ejemplo

**Dirección de ejemplo.** Si el servidor muestra http://192.168.1.68:5173/, abre esa dirección completa desde el teléfono. Es sólo un ejemplo: usa siempre la que aparece en tu equipo. El puerto 5174 normalmente corresponde a la demo, no a la caja real.

### Si algo no funciona

- **Dice que sólo acepta conexiones de este equipo:** Reinicia LibrePOS con el lanzador actualizado. El servidor debe escuchar en la red; actualizar el QR por sí solo no cambia esa configuración.
- **La IP abre en el servidor, pero no en el teléfono:** Comprueba que no sea red de invitados, que no haya aislamiento WiFi y que el firewall permita el puerto. Revisa si la VPN está cambiando la ruta.
- **Abre, pero faltan ventas o no llegan comandas:** Compara dirección y puerto en ambos dispositivos. Verifica primero lo recibido en el servidor antes de repetir operaciones; evita cobros simultáneos sobre una misma cuenta.

### Comprueba antes de terminar

- El enlace usa la IP del servidor y el puerto correcto.
- El teléfono abre la aplicación desde su red.
- Ambos dispositivos muestran la misma cuenta.

### Efectos de la operación

- No requiere publicar LibrePOS en Internet.
- Actualizar direcciones no cambia ventas ni permisos.
- Un servidor limitado a localhost no anuncia un QR de red.
- La demo y la operación real usan datos distintos.

**Atención:** No borres los datos del navegador ante una desconexión: podrían contener cambios pendientes. No desactives todo el firewall; revisa el permiso de LibrePOS/Node y el puerto de la red local con quien administra el equipo.

**Resultado esperado:** El teléfono abre la misma instancia y muestra los registros esperados; el enlace y el QR coinciden.

Relacionadas: [Cómo crear usuarios y asignar funciones](#users-permissions) · [Cómo respaldar y actualizar LibrePOS](#backup-update) · [Cómo abrir una mesa o pedido para llevar](#open-order) · [Cómo comandar: digital o digital + impresa](#command-order)
