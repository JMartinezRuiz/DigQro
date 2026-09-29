# LibrePOS 2.1.0-beta.2

Actualización distribuida desde `main` y la etiqueta `v2.1.0-beta.2`. Prepara la integración de Uber Eats Marketplace y añade Desarrollo como opción independiente del menú, exclusiva para Admin.

Después de actualizar, reinicia el servidor, recarga los dispositivos e inicia sesión de nuevo. Uber llega desactivado. La actualización no vincula la cuenta del restaurante ni registra su webhook en Uber.

## Pedidos y Pago Uber

- Recepción de webhooks con firma verificada, bandeja persistente, reintentos y protección contra pedidos duplicados.
- Aceptación, rechazo y cancelación con Uber; comandas identificadas para Cocina, notas y variantes conservadas.
- Relación explícita de cada producto y combinación de modificadores con el catálogo, variantes, extras y recetas del POS.
- Aceptación e impresión automáticas opcionales, apagadas por defecto. Consumo de insumos una vez por pedido aceptado.
- Pago Uber separado de efectivo y tarjeta en Caja, Datos, comprobantes y exportaciones. La venta se registra al entregar o al reconciliar una finalización remota admitida.
- Revisión de cambios y cancelaciones con conservación del historial, protección frente a correcciones manuales de forma de pago y ajustes de inventario según el estado de preparación.

## Desarrollo, solo Admin

La opción **Desarrollo** aparece junto a Configuración, con pestañas **Conexión Uber**, **Pruebas** y **Recepción**. Permite configurar credenciales, Store ID, entorno, IVA, preparación, automatización y URL HTTPS del webhook. La URL puede copiarse para registrarla en Uber; guardarla no publica la pasarela ni modifica el portal de Uber.

Las acciones de configuración también requieren una sesión Admin en el servidor. El Client secret se guarda en la carpeta privada del conector, no en el estado compartido ni en el almacenamiento del navegador. Su campo vacío conserva el secreto anterior.

## Pruebas y alcance

- `npm run dev:demo`: recorrido simulado en una instancia aislada, sin llamadas a Uber.
- `npm run dev:uber`: instancia aislada para conectar la app y tienda sandbox.
- `npm run uber:webhook`: pasarela que publica únicamente la ruta de recepción, para colocar detrás de HTTPS.
- **88 pruebas automatizadas aprobadas**, compilación correcta y revisión en navegador de recepción simulada, relaciones, aceptación, cocina, entrega, separación de pagos, configuración, permisos y vista móvil.
- Comprobación de publicación en demo aislada: login, apertura de caja, mesa, para llevar, producto con variante, comanda digital, cocina, cobro en efectivo, exportación CSV y ayuda. No se enviaron impresiones físicas.
- El actualizador reconoce esta versión como posterior a 2.0.2. Se mantiene el aviso de tamaño del módulo principal al compilar.
- **Ayuda actualizada:** guías de Uber y Desarrollo, artículos afectados, asistente, referencia operativa y tutoriales con capturas reales de datos ficticios.

La conexión con una cuenta real y la certificación de producción siguen pendientes. Preparar y marcar listo son estados locales. Esta beta no importa ni publica menús completos, no realiza la vinculación OAuth inicial de restaurantes y no concilia depósitos, comisiones o reembolsos. Producción requiere una habilitación explícita del servidor y validación previa con Uber.

Consulta [la guía de conexión, límites y pruebas](UBER_EATS.md) antes de habilitar la recepción.
