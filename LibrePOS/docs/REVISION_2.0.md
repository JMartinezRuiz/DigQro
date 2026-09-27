# Revisión de LibrePOS 2.0 beta

Esta entrega renueva la interfaz y la ayuda, y corrige dos defectos de funcionamiento confirmados durante la revisión. Se prepara para revisión local, sin publicar cambios. La revisión cubrió los módulos y los recorridos principales del código; la concurrencia entre equipos y la impresión física requieren una validación adicional antes de ampliar el uso operativo.

## Arquitectura revisada

| Área | Implementación | Observación |
| --- | --- | --- |
| Interfaz y operación | `src/main.js`, `src/styles.css` | Aplicación JavaScript con renderizado del documento y un estado central. Venta, cocina, caja, catálogo, usuarios, inventario y reportes comparten ese estado. |
| Almacenamiento local | `localStorage`, clave `librepos:v2` | Guarda operación y sesión del navegador; el servidor mantiene una segunda copia compartida. |
| Sincronización | `sync-store.js`, `/api/state`, `/api/events` | Intercambia el estado completo mediante POST y eventos del servidor; compara versiones y combina conflictos en el cliente. |
| Datos del servidor | `.librepos/state.json` | Archivo JSON con versión. La previsualización puede usar `LIBREPOS_DATA_DIR` para mantener datos de demostración separados. |
| Acceso | `/api/login`, `normalizeUsers`, funciones por usuario | Las contraseñas se verifican en el servidor y se guardan con PBKDF2. Las respuestas públicas omiten credenciales. Las restricciones por rol de la interfaz no equivalen a sesiones autorizadas en el servidor; véase pendientes. |
| Catálogo y recetas | Productos base y modificaciones persistidas | Platillos, extras, insumos, variantes, historial de receta y de precio; la receta determina el consumo al comandar. |
| Venta y caja | Órdenes, comandas, ventas, sesiones de caja | Guarda instantáneas de precio/costo e información del cobro; requiere caja abierta para las operaciones principales. |
| Impresión y actualización | `sync-store.js`, scripts del sistema | Integraciones CUPS/Windows y actualizador por GitHub. No se ejecutaron actualizaciones ni impresiones físicas durante esta entrega. |
| Ayuda | `help-content.json`, `help-assistant.js`, `support-chat.js` | Contenido local, motor de palabras clave y sugerencias con accesos a formularios y tutoriales. |

### Grado de cobertura

| Componente | Revisión estática | Ejecución realizada |
| --- | --- | --- |
| Navegación y módulos de operación | Estructura de renderizado, restricciones de acceso, formularios y manejo del estado en `main.js`. | Previsualización local y comprobaciones visuales de la integración; no equivale a una jornada de operación con varios equipos. |
| API local | Rutas de login, estado, eventos, impresoras y actualización; validación de payload, cookie, roles y escritura de datos. | Middleware real con almacenamiento temporal para el recorrido de contraseña y sincronización. |
| Caja, ventas e inventario | Apertura/cierre, creación de venta, conservación de precios, descuento y reposición de insumos, combinación de conflictos. | Reproducción del conteo con la función real y pruebas del plan de ajustes. Cobro simultáneo, cierres concurrentes y recuperación tras corte eléctrico quedan pendientes. |
| Precios y tickets | `catalog-pricing.js`, `receipt-item-pricing.js`, `ticket-settings.js`; precios base/finales, extras y migración de ajustes. | Pruebas de conservación de total al editar, separación de extras, cantidades, modos con/sin IVA y migración de configuración. |
| Ayuda y tutoriales | Intenciones, sugerencias, accesos según funciones, contenido y referencias a recursos locales. | Pruebas de frases naturales/ambiguas, separación entre cambios de catálogo y servicio, permisos, enlaces, integridad de GIF/poster y procedencia de capturas. |
| Actualizador | Descargas por etiqueta/archivo, validación de rutas y hashes cuando existen, directorios preservados, reemplazo de archivos y `npm install`. | Pruebas del comparador de versiones y comprobación estática del reparador Windows. No se ejecutó la actualización remota. |
| Instaladores y arranque | Lanzadores `.command`/`.bat`, `scripts/install.py`, `scripts/start.py`, `scripts/update.js` y configuración de Vite. | El proyecto se levanta localmente con las dependencias existentes. Instalación limpia macOS, ejecución Windows e instalación de Node/Homebrew quedan pendientes. |
| Impresoras físicas | Rutas y permisos, generación de documentos, integración CUPS y PowerShell. | Pruebas de cálculo/formato de tickets; las impresoras y sus controladores no se ejercitaron físicamente. |

## Cambios incluidos

- Capa visual `src/design-v2.css`: colores cálidos, navegación lateral azul tinta en escritorio, destinos visibles y navegación desplazable en tablet y teléfono; títulos, controles, tablas, formularios y estados más consistentes.
- Inicio de sesión con contexto y mejor jerarquía, etiquetas de campos legibles, foco de teclado visible y controles táctiles. Las reglas de rediseño se limitan a pantalla para conservar la salida de impresión.
- Ayuda beta por palabras clave: admite sinónimos, acentos y errores frecuentes de escritura; distingue crear recetas, agregar platillos, ocultarlos, quitar líneas de una orden y resolver dificultades básicas. Las sugerencias abren recorridos y formularios; los cambios se revisan y confirman en los controles existentes.
- Mejoras de tutoriales y material animado con instrucciones por pasos, ejemplos y resultados esperados. El contenido de ayuda sigue siendo local.
- Conservación de contraseña del administrador al sincronizar y corrección del conteo físico de múltiples insumos, detalladas abajo.

## Defectos corregidos y evidencia

### La sincronización restablecía la contraseña de admin

`publicState()` elimina contraseña y hash antes de responder. La normalización anterior de usuarios en el navegador interpretaba la ausencia de ambos como una cuenta inicial y añadía `password: "admin"`. El siguiente envío del estado podía reemplazar la contraseña cambiada en el servidor por la predeterminada.

`src/user-credentials.js` conserva únicamente una contraseña explícita. Una respuesta pública sin contraseña produce un campo vacío, que el servidor ya interpreta como conservar su hash existente. La instalación inicial mantiene `admin/admin` porque esas credenciales están expresamente definidas en los datos iniciales.

**Validación:** prueba de integración con el middleware real y almacenamiento temporal. Se establece una contraseña diferente, se recibe el estado público, se normaliza y se vuelve a enviar. La contraseña cambiada continúa aceptándose y `admin/admin` se rechaza. También se comprueba que una credencial inicial explícita se conserva. Archivos: `test/user-credentials.test.js`, `src/main.js` → `normalizeUsers`.

### El conteo completo perdía ajustes de filas anteriores

`currentInventory()` normaliza y reemplaza la colección por nuevos objetos. `applyFullInventoryCount()` lo llamaba una vez por fila y guardaba referencias para aplicarlas después de la confirmación. Las primeras referencias ya no pertenecían al inventario persistido cuando llegaba la confirmación.

El conteo prepara ahora los ajustes usando una sola colección estable mediante `src/inventory-count.js`. Se conserva la confirmación existente y el registro de movimientos.

**Reproducción:** para existencias iniciales `[10, 20]` y conteo físico `[8, 17]`, la función anterior terminaba con `[10, 17]`. La función corregida termina con `[8, 17]`. Las pruebas verifican que todas las filas apuntan a los insumos vigentes, que preparar el conteo no modifica existencias antes de confirmar y que una celda vacía se distingue de un cero explícito. Archivo: `test/inventory-count.test.js`.

## Pendientes prioritarios encontrados

Estos problemas son anteriores al rediseño. Se documentan con sus desencadenantes y las funciones relevantes para abordarlos sin introducir una migración de datos o un cambio financiero durante esta entrega visual.

| Prioridad | Problema y efecto | Evidencia del código | Siguiente corrección propuesta |
| --- | --- | --- | --- |
| Alta | **La cookie de acceso a la API no autentica a una persona.** Abrir la aplicación entrega una cookie compartida antes del login. Con ella se puede leer o enviar el estado completo; las rutas de impresora confían en el `userId` suministrado y la de actualización carece de control de administrador. | `sync-store.js` → `setAccessCookie`, `requireAccess`, `createSyncMiddleware`, `requireAdminUser`; rutas `/api/state`, `/api/login`, `/api/update/apply`. | Crear una sesión de servidor por login, vincularla al usuario y verificar permisos en cada operación. El rol de la interfaz y el identificador enviado por el cliente no deben ser la autoridad. |
| Alta | **Una actualización remota puede sustituir cambios locales pendientes.** Si otro equipo publica dentro de la espera de 150 ms o mientras hay un envío local, el evento remoto reemplaza el estado completo sin fusionar esos cambios. Un envío fallido también queda marcado como si fuera el último contenido sincronizado. | `src/main.js` → `queueSyncState`, `pushSharedState`, `applyRemoteSyncPayload`, `initNetworkSync`. `syncLastPayload` cambia antes de confirmar el POST; los eventos remotos se aplican directamente. | Separar estado confirmado de cambios pendientes; serializar envíos; reintentar errores y combinar eventos remotos con los cambios aún no confirmados. Mostrar el estado de sincronización. |
| Alta | **El cobro y las existencias no tienen una transacción central por operación.** Dos cajas con la misma orden abierta pueden producir ventas diferentes para esa orden; la combinación por identificador conserva ambas. Dos consumos concurrentes sobre un mismo insumo pueden conservar ambos movimientos y una sola disminución de cantidad. | `src/main.js` → `chargeOrder`, `mergeArrayById`, `chooseMergedValue`; `sync-store.js` → comprobación de versión seguida de `await saveSharedState()`. No existe unicidad de venta por orden ni bloqueo de esa operación en el servidor. | Centralizar cobros y movimientos mediante operaciones identificables y atómicas, con reintentos idempotentes. Probar dos clientes cobrando/comandando simultáneamente. |
| Alta | **El archivo de estado no se escribe de forma atómica.** Una interrupción durante la escritura puede dejar JSON incompleto; al leerlo, cualquier error se trata como estado inexistente. | `sync-store.js` → `writeStateFile` usa `writeFile` directo; `loadSharedState` captura cualquier error y asigna estado nulo/version cero. | Escribir en un archivo temporal y reemplazar atómicamente, serializar escrituras, mantener una copia anterior verificable y distinguir archivo ausente de archivo dañado. |
| Media | **Cambiar una receta puede alterar la reposición de una comanda previa.** Las cancelaciones y ediciones calculan el consumo con la receta actual. Además, el descuento se limita a cero, pero la reposición suma la receta completa aunque se hubiera podido descontar menos. | `src/main.js` → `inventoryUsageForLine`, `deductInventoryForLines`, `restoreInventoryForLines`, `deleteSaleFromForm`. Ejemplo: existían 5, se requieren 7, se descuentan 5 y se pueden reponer 7. | Guardar el consumo efectivamente aplicado por línea/comanda y revertir esa misma operación, manteniendo sus identificadores e importes históricos. |
| Media | **Renombrar insumos puede desenganchar recetas existentes.** El editor permite cambiar el nombre, pero varias rutas de cálculo eliminan `itemId` y resuelven por nombre; los insumos base ausentes por nombre se vuelven a incorporar al normalizar. | `src/main.js` → `saveIngredient`, `inventoryRecipeForSelections`, `estimateProductStock`, `normalizeInventory`. | Resolver recetas mediante identificadores estables, conservarlos durante todo el cálculo y definir una migración explícita para el catálogo base y sus renombres. |
| Media | **La actualización reemplaza archivos antes de comprobar que la instalación terminó correctamente.** Conserva `.librepos`, pero elimina archivos locales ausentes del paquete remoto, reemplaza el resto, marca la versión y después ejecuta la instalación; un fallo puede dejar una mezcla incompleta y modificaciones locales perdidas. | `sync-store.js` → `applyGithubRepositoryUpdate`, `removeStaleProjectFiles`, `writeDownloadedProjectFiles`, `installDependencies`. | Preparar y verificar el paquete en otra carpeta, respaldar la instalación anterior y permitir volver a ella si falla la actualización. |

## Validación y límites de la entrega

### Comprobación visual local de esta entrega

La demostración se ejecutó en `http://127.0.0.1:5174/` con `npm run dev:demo`, una carpeta temporal y una clave de almacenamiento de navegador independiente. No se utilizaron los datos de operación de `.librepos/`.

- Se recorrieron las once secciones a 390 px de ancho, sin desbordamiento horizontal de la página. Se inspeccionaron ayuda en tablet (768 px), escritorio (1280 px) y formulario de nuevo platillo en teléfono.
- Desde el asistente se abrió el formulario de platillo. Se creó una tostada de ejemplo con precio de $85 y receta de 0.200 kg; se añadió y quitó una segunda fila de ingredientes. Se ocultó y recuperó el platillo, conservando receta y precio.
- Se guardaron un insumo y un extra ficticios. El platillo apareció en la búsqueda de Venta. Se abrió caja y una mesa; la comanda digital recorrió Nueva, Preparación y Lista en Cocina. Se abrió el formulario de cobro y se comprobó el total de $85, sin ejecutar un cobro ni una impresión física.
- Se comprobó la desambiguación de «quitar un plato», el enlace del chat a formularios, el cambio entre asistente y biblioteca y los controles Paso anterior/siguiente, Reproducir GIF y Ver paso a paso. No se registraron errores de navegador al cerrar estas comprobaciones.
- La ayuda incluye 23 guías, 23 GIFs y 123 imágenes de pasos. Hay 41 fotogramas de 17 capturas nuevas: siete guías íntegramente 2.0 y dos mixtas. Las fuentes restantes conservan la etiqueta real 0.5.0. Todos los recursos generados son 1280×800 y el recorrido animado espera entre 5 y 6.5 segundos por imagen.
- `npm run build` terminó correctamente. Vite mantiene una advertencia de tamaño para el módulo principal (~520 kB antes de gzip); dividir el archivo central sigue siendo una mejora de mantenimiento pendiente.

Estado de ayuda: **Ayuda actualizada**. No se crearon commits ni se hizo push.

El conjunto completo `npm test` pasa: **35 pruebas, 0 fallos**, incluidas las cuatro nuevas de credenciales y conteo. La corrección del conteo también se reprodujo ejecutando la función real del formulario con dos filas simuladas. El CSS se analizó con PostCSS sin errores. Estos resultados cubren los casos definidos en las pruebas; las limitaciones de ejecución están indicadas en la tabla de cobertura.

La ayuda beta reconoce intenciones de soporte básico y puede presentar varias opciones cuando una frase es ambigua. Su cobertura se amplía editando el contenido y las reglas locales. No sustituye las comprobaciones de caja ni convierte una frase de chat en una modificación automática de inventario o cobro.

Para la siguiente iteración, la prioridad técnica es fortalecer autenticación, operaciones concurrentes y recuperación del archivo de estado. Son las áreas con mayor impacto potencial sobre varios dispositivos trabajando al mismo tiempo.
