# Uber Eats en LibrePOS · 2.1.0-beta.2

El conector está preparado para pruebas de **Uber Eats Marketplace**. Llega desactivado. La demo permite probar el recorrido local; no contacta con Uber. No se ha conectado la cuenta del restaurante ni validado una certificación de producción.

## Qué hace

- Recibe webhooks firmados, los guarda antes de responder `200` vacío y procesa los pedidos desde el servidor, aunque no haya un navegador abierto.
- Deduplica eventos y pedidos; reintenta errores de consulta y reconcilia estados con Uber. Una aceptación repetida no vuelve a descontar inventario.
- Muestra **Uber Eats**, el código externo, nombre del cliente, variantes y notas, con **Pago Uber · No cobrar**.
- Usa los importes del pedido Uber, en MXN. Las recetas y costos vienen del catálogo local mediante relaciones explícitas por combinación de modificadores. Los precios locales no sustituyen los precios de Uber.
- Permite aceptar/comandar, rechazar, cancelar, consultar, preparar, marcar listo, confirmar entrega e imprimir. Aceptación e impresión automática son opciones separadas, apagadas inicialmente.
- Cocina ve las comandas aceptadas. Aceptar descuenta los insumos una vez. Confirmar entrega, o recibir el estado remoto `FINISHED` de un pedido comandado, registra una venta una vez.
- Caja, Datos, comprobantes y CSV distinguen Pago Uber. El importe no se suma a efectivo ni a tarjeta. La venta se vincula a la caja abierta al entregarse; si no hay caja, queda sin corte y aparece en ventas del día. Un pedido Uber pendiente no impide cerrar la caja física.
- Administración puede probar OAuth/lectura de tienda, pausarla 30 minutos o reabrirla, con los permisos de API correspondientes.

## Qué falta para conectar tu aplicación de pruebas

1. Confirmar que la app tenga acceso a **Eats Marketplace APIs**, no solamente Uber Direct o una cuenta activa de Uber Eats Manager.
2. `client_id` y `client_secret` de esa app, y el **Store ID de pruebas** autorizado. Introduce el secreto en el formulario del POS; no lo incluyas en commits, capturas ni ejemplos compartidos.
3. Scopes aprobados: `eats.order` para pedidos y acciones; `eats.store` para lectura de tienda. Pausar/reabrir necesita además `eats.store.status.write` y solicita su propio token.
4. Tienda vinculada a esa aplicación y la aplicación nominada como gestora de pedidos (*order manager*), con envío de pedidos al POS habilitado. Crear una organización o app de desarrollador no realiza esa vinculación.
5. Una URL HTTPS pública y estable para `/api/uber/webhook`, con acceso al equipo servidor. El servidor debe seguir encendido y con Internet.
6. Un menú de pruebas publicado en Uber con los IDs de productos y modificadores, para relacionarlos con el catálogo del POS. Hace falta confirmar si el subtotal de ese menú ya incluye IVA.
7. Acceso al procedimiento de pedidos sandbox asignado por Uber: tienda, usuario comprador de prueba y permisos de prueba. Primero validaremos un payload real anonimizado contra el contrato descrito abajo.

El desarrollador configura la app y el webhook desde su organización de desarrollo. La propietaria o administradora autorizada del restaurante vincula su tienda; las credenciales de login de Uber Eats Manager no son las credenciales OAuth del conector. En LibrePOS se necesita un usuario con función **Admin** para configurar. La pantalla **Desarrollo**, dentro de Administración, reúne Conexión Uber, Pruebas y Recepción; no aparece para Caja, Cocina ni Mesero. Las rutas de configuración también verifican Admin en el servidor.

## Prueba local sin cuenta ni credenciales

```bash
npm run dev:demo
```

Abre `http://127.0.0.1:5174`, entra con `admin` / `admin`, abre **Desarrollo → Pruebas** y pulsa **Crear pedido simulado**. Después usa **Abrir pedidos Uber Eats**. Se crea un producto, insumo y relación ficticios en la carpeta temporal de la demo. Acepta, prepara, marca listo y confirma entrega. En Caja debe aparecer $80 en Pago Uber y $0 en efectivo/tarjeta para esa venta. Puedes abrir caja antes para comprobar también el corte. No actives impresión para esta prueba si no quieres usar papel.

Los pedidos simulados y su endpoint sólo existen en la demo aislada. No prueban OAuth, permisos, conectividad HTTPS ni el contrato real de la cuenta Uber.

## Prueba con Uber sandbox, separada del restaurante

```bash
npm run dev:uber
```

Abre `http://127.0.0.1:5175`. Cada ejecución crea una carpeta de datos temporal y anuncia su ruta. Para continuar pruebas anteriores, establece `LIBREPOS_TEST_DATA_DIR` apuntando a **esa carpeta de pruebas**, antes de arrancar. Utiliza este puerto en un perfil de navegador separado; nunca copies el almacenamiento del navegador operativo a una instancia nueva. Cambia las credenciales iniciales de Admin cuando corresponda.

En **Desarrollo → Conexión Uber**, selecciona Sandbox, introduce Store ID, Client ID y Client secret, deja aceptación e impresión automáticas apagadas y guarda. **Probar conexión guardada** confirma OAuth y lectura de la tienda; no certifica que lleguen webhooks ni que la app pueda aceptar pedidos. Habilita la recepción cuando la tienda de pruebas esté preparada.

Guarda también la **URL HTTPS pública del webhook** en Conexión Uber. El panel Webhook de pedidos permite copiar la URL guardada. Este dato es una referencia para registrarla en Uber: no crea ni publica el túnel, no cambia los servidores de API y no registra la URL remotamente. Debe terminar en `/api/uber/webhook`, sin credenciales, parámetros ni fragmentos.

En otra terminal:

```bash
LIBREPOS_PORT=5175 npm run uber:webhook
```

En PowerShell:

```powershell
$env:LIBREPOS_PORT = '5175'
npm run uber:webhook
```

La pasarela escucha en `127.0.0.1:8788`. Publica **ese puerto** mediante un túnel o proxy HTTPS y registra `https://TU-DOMINIO/api/uber/webhook` en Uber. Reenvía método POST, cuerpo sin modificar y cabecera `X-Uber-Signature`. La pasarela sólo admite esa ruta, limita el cuerpo a 1 MiB y no reenvía cookies. No publiques los puertos del POS (5173/5175): contienen administración y sincronización interna. `UBER_WEBHOOK_PORT` permite cambiar 8788.

La URL no se crea ni se registra automáticamente: hacen falta el dominio/túnel y acceso al portal Uber. Al detener el POS o el túnel se deja de recibir. Uber reintenta webhooks; conviene vigilar su aplicación durante las pruebas.

## Primera orden sandbox

1. Crea una orden siguiendo el procedimiento sandbox de Uber para esa tienda.
2. Comprueba **Recepción**: el evento debe pasar a `done`. Un evento `done` significa importado/procesado, no aceptado automáticamente.
3. En el pedido, abre **Revisión y cancelación**. Un Admin relaciona cada producto/variante con un producto local, sus opciones y los extras exactos. Las cantidades de extras son por unidad del producto Uber. Guarda cada relación.
4. Comprueba código, cantidad, notas, IVA, promoción y total contra Uber. Si el modo de IVA era incorrecto, corrige la configuración y pulsa **Consultar Uber** antes de aceptar. Modificarlo no altera ventas anteriores.
5. Pulsa **Aceptar y comandar**. Verifica aceptación en Uber, una sola comanda en Cocina y un único descuento de insumos. Si la receta está incompleta o no hay stock, la aceptación se bloquea. Las notas de texto no modifican automáticamente una receta.
6. Cocina pulsa **Preparar** y **Listo para recoger**. Son estados **locales**: esta versión no llama a una API remota de “pedido listo”. El tiempo de preparación configurado se envía como `pickup_time` al aceptar.
7. Caja confirma la entrega física. Verifica una sola venta Pago Uber en Caja/Datos y su comprobante. No vuelvas a cobrarla con efectivo o tarjeta.
8. Sólo tras validar varios productos, variantes, IVA y notas, habilita aceptación automática. Configura una impresora de comandas antes de habilitar impresión automática.

## Cancelaciones, cambios y recuperación

- Rechazar antes de comandar envía `deny_pos_order`; cancelar envía `cancel`. Ambos necesitan motivo. Una denegación POS puede ser aceptada después desde una tableta de Uber; el conector consulta y reconcilia ese caso.
- Una cancelación recibida antes de una notificación impide que una notificación tardía resucite la orden. Las cancelaciones repetidas no reponen dos veces el inventario.
- Si ninguna comanda empezó, se restauran sus insumos al cancelar. Después de comenzar la preparación, se mantiene el consumo. Si la venta ya existía, se conserva y se marca **revisar liquidación**; no se inventa una devolución ni un depósito de Uber.
- Si Uber cambia productos, notas o importes después de aceptar, la orden queda en **Pedido modificado: revisar** y sale de las comandas accionables. Caja/Admin revisa los datos nuevos con cocina y usa **Confirmar revisión y actualizar**. Las relaciones nuevas deben estar guardadas; pueden editarse desde Revisión y cancelación mientras hay una revisión pendiente. Se registra historial y una comanda de revisión. Sólo el aumento del consumo se descuenta; la reducción se repone únicamente si no había comenzado la preparación. Tras preparación, lo retirado sigue como consumo, no vuelve a stock.
- Si la revisión afecta una venta ya registrada, se actualizan sus importes con historial. Si pertenecía a un corte cerrado, se ajustan el total Uber/ventas/IVA/descuentos; el efectivo contado y esperado no cambian. La venta queda señalada para revisar liquidación con Uber.
- Si una orden aparece por primera vez ya `FINISHED`, queda **Finalizado en Uber: por registrar**. Después de comprobar que no se registró manualmente, **Registrar venta finalizada** crea venta y consumo una vez sin volver a cocinarla.
- Se consulta el estado de hasta 30 pedidos recientes por ciclo (cada minuto, ventana de 48 horas), recorriéndolos por bloques para no dejar atrás los más antiguos. Webhooks siguen siendo la vía principal. Después de esa ventana usa **Consultar Uber** o revisa la plataforma.
- Un fallo de impresión queda visible. Revisa el papel antes de **Reimprimir comanda**: una impresora puede haber impreso aunque se pierda la respuesta. No se promete impresión física exactamente una vez.
- Deshabilitar el conector **no pausa** la tienda. Para detener nuevos pedidos usa **Pausar tienda 30 min** o la aplicación de Uber; reiniciar el servidor no debe ser el mecanismo de pausa.

## Contrato de API y límites de esta beta

Se implementó el contrato documentado **Get Order Details v2** (`GET /v2/eats/order/{id}`), con acciones v1 (`/v1/eats/orders/{id}/accept_pos_order`, `deny_pos_order`, `cancel`) y estado de tienda (`/v1/eats/store/{id}/status`, singular `store`). No se adivinan ni mezclan payloads de nuevas versiones de Order API. Si Uber asignó a tu app otro contrato, hay que adaptar y verificar ese payload antes de habilitar pedidos.

Sandbox usa `https://test-api.uber.com` y `https://sandbox-login.uber.com/oauth/v2/token`. Producción usa `https://api.uber.com` y `https://auth.uber.com/oauth/v2/token`, y está bloqueada salvo `UBER_ALLOW_PRODUCTION=true` al arrancar el servidor operativo. Ese desbloqueo no reemplaza permisos, validación ni aprobación de Uber.

Esta versión admite MXN, cantidades enteras, entrega por Uber (`DELIVERY_BY_UBER`) y recogida (`PICK_UP`). Bloquea pedidos con cobro en efectivo solicitado por Uber o modalidades de entrega del restaurante; no los clasifica silenciosamente como Pago Uber. Los cargos adicionales del comercio (bolsas, preparación, otros fees) y las sustituciones o faltantes se bloquean para revisar su desglose antes de registrarlos; esta beta no los omite ni los suma por suposición. Las alergias estructuradas y las notas se conservan en la comanda. Mantén la aplicación Uber disponible para atender pedidos que requieran revisión.

No publica/sincroniza menús, no realiza el onboarding OAuth de múltiples restaurantes, no maneja repartidores ni transmite un estado remoto “listo”. Las relaciones son para una tienda por instalación. Cambiar tienda o entorno requiere finalizar pedidos/eventos pendientes y limpia las relaciones de catálogo de la conexión anterior. No concilia depósitos, comisiones, retenciones, reembolsos ni propinas del repartidor. **Pago Uber es una clasificación de venta gestionada por Uber, no una confirmación de liquidación bancaria.** El desglose recibido se conserva en `uber.charges` para una conciliación posterior.

## Operación y datos

El secreto vive sólo en `LIBREPOS_DATA_DIR/uber/config.json` (por defecto `.librepos/uber/config.json`); no se devuelve al navegador ni al estado compartido. Se escribe con permisos de archivo restringidos donde el sistema los admite. Los tokens OAuth se mantienen en memoria. No es cifrado en disco: protege la cuenta del sistema y sus copias.

La bandeja persistente está en `uber/inbox.json`; el estado operativo en `state.json`. Las escrituras se sustituyen mediante archivo temporal y renombrado. Los eventos/pedidos y su historial conservan identidades para impedir duplicados. El Respaldo JSON de Datos incluye ventas/pedidos, pero no credenciales ni la bandeja del conector: para trasladar la instalación preserva también la carpeta privada, sin mezclar dos servidores activos de la misma tienda. No borres el historial Uber para reiniciar pruebas; crea otra instancia aislada.

Permisos del POS: Admin configura credenciales, relaciones y estado de tienda; Caja/Admin acepta, rechaza, cancela, consulta y confirma entrega; Cocina puede preparar, marcar listo e imprimir. Se validan con sesiones del servidor, no con un `userId` enviado por el navegador. Reiniciar el servidor requiere volver a iniciar sesión para estas acciones.

## Verificación automatizada

```bash
npm test
npm run build
```

Los tests usan directorios temporales, clientes HTTP falsos y puertos locales. Cubren firma sobre bytes originales, persistencia antes del ACK, duplicados/reinicio, stock y variantes, cambios de pedido, cancelación fuera de orden, timeout tras aceptación, permisos de usuario, separación de pagos, protección del secreto y límites de la pasarela. No contactan con Uber ni imprimen físicamente.

## Fuentes oficiales consultadas

- [Webhooks](https://developer.uber.com/docs/eats/guides/webhooks): firma, eventos y reintentos.
- [Sandbox](https://developer.uber.com/docs/eats/guides/sandbox): entornos y pruebas.
- [Get Order Details v2](https://developer.uber.com/docs/eats/references/api/v2/get-eats-order-orderid): contrato de pedido, productos e importes.
- [Aceptar](https://developer.uber.com/docs/eats/references/api/v1/post-eats-order-orderid-acceptposorder), [rechazar](https://developer.uber.com/docs/eats/references/api/v1/post-eats-order-orderid-denyposorder) y [cancelar](https://developer.uber.com/docs/eats/references/api/v1/post-eats-order-orderid-cancel): acciones del gestor de pedidos.
- [Consultar tienda](https://developer.uber.com/docs/eats/references/api/v1/get-eats-stores-storeid-status) y [cambiar estado](https://developer.uber.com/docs/eats/references/api/v1/post-eats-stores-storeid-status): rutas, estados y scopes.

Revisión: 2026-09-28. **Ayuda actualizada.** La integración debe validarse con la app y tienda asignadas antes de operar pedidos reales.
