# Guia de usuario

Esta guia cubre el uso diario de LibrePOS en restaurante. La app corre en un equipo servidor y otros telefonos, tablets o computadoras entran por la misma red WiFi.

## Roles y permisos

- Todos los usuarios: `Mi perfil`, fichaje y vista personal.
- Mesero: venta, mesas y ordenes para llevar.
- Cocina: tablero de comandas y cambios de estado.
- Caja: apertura, cobro, gastos y cierre de caja.
- Administrador: inventario, catalogo, datos, usuarios y actualizaciones.

Un usuario puede tener varias funciones al mismo tiempo.

## Primer acceso

```text
Usuario: admin
Contrasena: admin
```

En operacion real, entra como admin y cambia esta contrasena desde `Usuarios`. Despues crea usuarios por persona y asigna solo las funciones que necesiten.

## Arranque diario

1. En el equipo servidor abre `Abrir LibrePOS.command` en macOS o `Abrir LibrePOS.bat` en Windows.
2. Deja abierta la ventana del servidor mientras se usa LibrePOS.
3. Entra en el navegador con `http://localhost:5173/` desde el servidor.
4. En telefonos o tablets usa la URL WiFi que aparece en la ventana, por ejemplo `http://192.168.1.73:5173/`.
5. Inicia sesion con tu usuario.
6. Abre caja antes de vender. Mientras la caja este cerrada, la app bloquea nuevas mesas, ordenes para llevar y cobros.

## Venta por mesa

1. En `Venta` o `Mesas`, toca `Nueva mesa`.
2. Selecciona numero de mesa, comensales y mesero responsable.
3. Agrega productos al ticket.
4. Configura variantes, extras, notas o partes mixtas cuando el producto lo permita.
5. Usa `Comandar` para mandar los productos pendientes a cocina o barra.
6. Cuando el cliente pida la cuenta, abre `Prepago y descuento` para revisar el total, guardar el descuento e imprimir la cuenta.
7. Confirma el cobro para cerrar la orden y generar la venta.

Los productos ya comandados no deben modificarse como si fueran nuevos. Si necesitas retirar algo, usa la accion de cancelacion disponible en el ticket para que quede registro.

## Venta para llevar

1. En `Venta`, toca `Para llevar`.
2. Captura el nombre o nota del pedido cuando aplique.
3. Agrega productos y comandas igual que en mesa.
4. Cobra desde el ticket cuando el pedido este listo o pagado.

## Cocina

La vista `Cocina` agrupa comandas por estado. El personal de cocina puede avanzar cada partida segun el flujo operativo:

- Nuevo o pendiente: producto recibido por cocina/barra.
- En preparacion: producto tomado por la estacion.
- Listo: producto terminado y listo para entregar.

Las comandas se sincronizan entre dispositivos conectados al mismo servidor local.

## Caja

La caja controla la jornada de cobro.

1. Abre caja con fondo inicial.
2. Registra ventas desde los tickets.
3. Captura gastos operativos cuando correspondan.
4. Al final del turno, cuenta efectivo y cierra caja.
5. Revisa diferencia, ventas en efectivo, ventas con tarjeta, propinas y notas del cierre.

Si una venta tiene pago en efectivo, LibrePOS calcula efectivo a recibir, recibido y cambio.

## Inventario

La vista `Inventario` es para administradores.

- Revisa insumos, unidades, proveedores, costos y cantidad disponible.
- Usa `Subir ticket` para registrar compras de insumos: captura insumo, cantidad y coste del ticket. LibrePOS suma inventario, actualiza el costo unitario y descuenta el importe del efectivo esperado si hay caja abierta.
- Usa `Merma` para descontar insumos por caducidad, rotura, preparacion fallida u otro motivo operativo.
- Usa `Inventario completo` para comparar lo que debe haber contra el conteo fisico. La diferencia se calcula como perdida o ganancia y se puede aplicar como ajuste de inventario.
- Las recetas y extras descuentan insumos al comandar, no al añadir la línea al ticket.
- Los insumos usados por extras muestran aviso porque el gramaje de extra es estimado.
- La accion `Inventario a cero` es destructiva para cantidades; usala solo cuando sea intencional.

## Catalogo y recetas

La vista `Catalogo` permite administrar productos, extras e ingredientes.

- Productos: nombre, seccion, subseccion, precio, estacion, estado activo y receta por unidad.
- Extras: nombre del extra, precio de venta, insumo de inventario vinculado y gramaje/cantidad estimada que se descuenta al comandarlo.
- Insumos: categoria, proveedor, unidad, costo unitario, cantidad y elegibilidad para receta.
- Productos inactivos se conservan para historial, pero no aparecen como vendibles.
- Extras inactivos se conservan para historial, pero ya no aparecen en venta.

## Datos y exportaciones

La vista `Datos` concentra ventas, cortes, gastos e inventario. Los administradores pueden exportar:

- `Ventas CSV`
- `Cortes CSV`
- `Gastos CSV`
- `Inventario CSV`
- `Respaldo JSON`

Los CSV sirven para revision en Excel. El respaldo JSON contiene el estado compartido de operacion y se debe guardar fuera del equipo servidor.

## Impresion

Solo los administradores pueden abrir `Config` -> `Impresion`. La subpestana `Tickets` permite seleccionar una impresora instalada en el equipo servidor, configurar margenes y logotipo, previsualizar una cuenta y ejecutar pruebas cortas o completas.

Si la impresora no aparece en la lista, captura su nombre exacto en `Nombre manual` y pulsa `Seleccionar para tickets`. Las impresoras Bluetooth deben estar vinculadas e instaladas en Windows o macOS para aparecer automaticamente.

En `Precio por producto`, `IVA incluido` es el modo predeterminado. Cada producto y extra muestra en el ticket su precio final, sin agregar una leyenda de IVA a la linea. Al final del ticket se conservan separados `Subtotal s/IVA`, `IVA` y `TOTAL`. Esta opcion solo cambia la presentacion impresa: no modifica precios de catalogo, ventas, inventario ni calculos fiscales guardados.

La subpestana `Comandas` tiene su propia impresora y el interruptor de impresion automatica. Valida primero `Imprimir prueba comanda` antes de activar la automatizacion.

## Usuarios

Desde `Usuarios`, el admin puede crear, activar o desactivar usuarios, cambiar contrasenas y asignar funciones.

Recomendaciones:

- No compartas el usuario `admin`.
- Usa un usuario por persona.
- Desactiva usuarios que ya no trabajen en el restaurante.
- Cambia contrasenas cuando un dispositivo se pierda o deje de ser confiable.

## Actualizaciones

Cuando hay una version nueva, los administradores ven el boton `Actualizar`. Despues de aplicar una actualizacion:

1. Espera a que termine.
2. Cierra la ventana del servidor.
3. Vuelve a abrir LibrePOS.
4. Verifica que la version visible haya cambiado.

Las actualizaciones conservan `.librepos/`, donde viven ventas, usuarios, inventario y configuracion local.

## Soporte y ayuda

La seccion `Soporte` esta disponible para todos los usuarios y funciona sin Internet. Incluye buscador, categorias y guias paso a paso con GIFs creados a partir de capturas reales de LibrePOS, requisitos, impactos, advertencias y resultados esperados.

Las guias administrativas estan identificadas por rol. Consultarlas no modifica ventas, caja, inventario ni configuracion.

La opcion `Abrir ticket` aparece como proxima funcion, pero permanece deshabilitada. El formulario de vista previa no guarda ni envia informacion fuera del equipo.

## Buenas practicas

- Haz un respaldo JSON al cerrar cada jornada.
- Haz copia completa de `.librepos/` antes de actualizaciones importantes o cambios de equipo.
- Manten el equipo servidor conectado a corriente y en una red WiFi estable.
- No uses LibrePOS desde redes publicas ni lo abras hacia internet.


## Resolver una duda durante el servicio

En **Ayuda → Asistente**, puedes escribir «corregir un pago», «configurar terminales», «el teléfono no abre el QR» o «no se sincronizan las mesas». El asistente reconoce palabras clave y abre guías o vistas permitidas para tu función; no guarda ni cambia datos por una frase.

En **Tutoriales**, busca la tarea o el síntoma. Cada guía contiene requisitos, pasos, ejemplo con números, problemas frecuentes desplegables y comprobaciones finales. Puedes avanzar las capturas una a una o reproducir el GIF. Las imágenes antiguas muestran su versión real; los pasos escritos describen la interfaz vigente.

Consulta el [manual completo de las 26 guías](GUIAS_OPERATIVAS.md) para leerlo fuera de la aplicación.

## Corregir una cuenta ya cobrada

En **Caja → Ver cuenta → Corregir pago**, revisa el folio y cambia el método de consumo y propina por separado. Indica el efectivo recibido o terminal y tipo, escribe el motivo y revisa la confirmación. Administración también puede hacerlo desde Datos y después de cerrar el corte. El total y efectivo contado no cambian; esperado y diferencia se recalculan. El postpago queda pendiente de reimpresión. No se realiza ningún movimiento bancario.

## Conectar teléfonos

Administración abre **Mi perfil → Acceso web → Actualizar direcciones**. Comparte el enlace completo o el QR. El teléfono necesita la IP del servidor y su puerto, no localhost. Si abre la aplicación pero faltan datos, comprueba que no sea otra instancia o la demo. Ante una desconexión, revisa en el servidor si la operación llegó antes de repetirla; no borres datos del navegador que puedan contener cambios pendientes.
