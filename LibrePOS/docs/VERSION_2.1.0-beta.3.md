# LibrePOS 2.1.0-beta.3

Actualización de seguridad distribuida desde `main` y la etiqueta `v2.1.0-beta.3`. Corrige la exposición de datos a cualquier dispositivo conectado a la misma red que el servidor.

Después de actualizar, reinicia el servidor, recarga los dispositivos e inicia sesión de nuevo en cada uno.

## Qué estaba expuesto

Sin iniciar sesión, cualquiera en la red podía:

- Descargar `.librepos/state.json`, con los hashes de contraseñas y toda la operación, y `.librepos/uber/config.json`, con el Client secret de Uber.
- Leer ventas, usuarios, inventario y caja mediante `/api/state` y `/api/events`, usando la cookie que el servidor entrega a quien abre la página.
- Guardar cambios en el estado compartido, salvo los ya protegidos de usuarios y pagos, y lanzar una actualización.

## Qué cambia

- **Carpeta de datos:** el servidor rechaza cualquier URL que apunte a `.librepos/`, en cualquier codificación, y Vite la tiene además en su lista de rutas prohibidas.
- **Estado y avisos:** leer, guardar y recibir cambios exige una sesión iniciada. Un servidor sin estado sigue aceptando el estado inicial del primer dispositivo.
- **Actualizar:** consultar requiere sesión y aplicar requiere una sesión de administración.
- **Intentos de acceso:** cinco contraseñas incorrectas seguidas bloquean ese usuario un minuto en ese dispositivo.
- **Vite 7.3.7:** corrige las vulnerabilidades conocidas de la versión anterior. `npm audit` no reporta ninguna.

## Qué notará el equipo

- Cada dispositivo debe iniciar sesión tras la actualización y cada vez que se reinicie el servidor.
- La sesión dura 24 horas desde la última actividad. Antes contaban desde el acceso. Una pantalla de cocina en uso no se cierra a media jornada.
- Si la sesión termina con cambios sin guardar, aparece «Tu sesión terminó. Vuelve a iniciar sesión.» y esos cambios se combinan y se envían al volver a entrar, siempre que no se recargue la página antes.

## Lo que no cubre

- La conexión con el servidor sigue siendo HTTP sin cifrar. Si el restaurante ofrece WiFi a sus clientes, conecta LibrePOS a una red separada.
- La contraseña inicial `admin` / `admin` no se cambia sola. Cámbiala: la sesión es lo que protege los datos.
- Las rutas de impresión siguen identificando al usuario por el `userId` que reciben. No entregan datos del restaurante, pero permiten imprimir o quitar impresoras sin sesión.
- Quien ya descargó datos antes de esta versión los conserva. Si la red era accesible a terceros, cambia las contraseñas y el Client secret de Uber.

## Pruebas

- **96 pruebas automatizadas aprobadas**, incluidas 8 nuevas en `test/data-access.test.js` con un servidor Vite real y variantes de ruta y codificación. Se comprobó que fallan al retirar cada protección.
- Compilación correcta y `npm audit` sin vulnerabilidades.
- Recorrido en demo aislada, con dos dispositivos simulados: acceso, caja, mesa, para llevar, producto con variante, comanda digital, cocina con otro usuario y sin recargar, cobro en efectivo, exportación CSV, ayuda, recarga con sesión activa, cierre de sesión, sesión terminada con cambios pendientes y bloqueo por intentos.
- Sin probar en Windows ni con impresoras físicas.
- **Ayuda actualizada:** guías de usuarios, acceso desde el teléfono y actualización, Novedades y referencia operativa. Las capturas no cambian porque la interfaz es la misma, salvo los mensajes nuevos de la pantalla de acceso.
