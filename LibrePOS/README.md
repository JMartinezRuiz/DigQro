# LibrePOS

LibrePOS es un punto de venta local para restaurante. Incluye venta por mesas y para llevar, comandas digitales, cocina, caja, inventario, catalogo, usuarios, fichaje, exportacion de datos y sincronizacion por red WiFi.

## Versión 2.0.2

La versión 2.0.2 permite elegir el descuento en la cuenta abierta y ver el ticket prepago con el total antes de imprimir o cobrar. Solo administración puede corregir pagos por defecto y puede conceder permisos desde Usuarios. Las tablas de pagos incluyen una barra horizontal visible. La ayuda y los tutoriales explican estos cambios.

Para probar con datos de demostración separados de la operación:

```bash
npm run dev:demo
```

Abre `http://127.0.0.1:5174/` e ingresa con `admin` / `admin`. Cada ejecución crea una carpeta temporal de datos de prueba. El almacenamiento del navegador también está separado. `npm start` continúa usando los datos habituales del restaurante.

Consulta [las notas de la versión 2.0.2](docs/VERSION_2.0.2.md) y [la revisión técnica de 2.0](docs/REVISION_2.0.md). Ayuda actualizada: 26 guías con ejemplos, diagnóstico de problemas, comprobaciones finales y capturas reales. Incluye corrección de pagos, terminales y conexión desde teléfono. Las capturas de versiones previas conservan su versión visible. El asistente por palabras clave sigue en beta.

## Documentacion

- [Manual detallado de las 26 guías](docs/GUIAS_OPERATIVAS.md): pasos, ejemplos, errores frecuentes y verificaciones, también disponibles en Ayuda.
- [Guia de usuario](docs/USUARIO.md): flujo diario para meseros, cocina, caja y administradores.
- [Administracion y mantenimiento](docs/ADMINISTRACION.md): instalacion, datos locales, respaldos, restauracion, actualizaciones y seguridad.
- [Desarrollo](docs/DESARROLLO.md): estructura del proyecto, comandos, arquitectura y checklist de release.
- [Mantenimiento de la ayuda](docs/AYUDA.md): regla obligatoria, criterios editoriales y regeneracion de GIFs.
- [API local](docs/API_LOCAL.md): endpoints internos usados por la app para sincronizacion, login y actualizaciones.

## Inicio rapido

### macOS

1. Abre `Instalar LibrePOS.command`.
2. Cuando termine, abre `Abrir LibrePOS.command`.
3. El navegador abrira `http://localhost:5173/`.

### Windows

1. Abre `Instalar LibrePOS.bat`.
2. Cuando termine, abre `Abrir LibrePOS.bat`.
3. El navegador abrira `http://localhost:5173/`.

Los archivos `.bat` de Windows no dependen de Python. Funcionan con Node.js/npm directamente, asi que no importa si tienes Python 3.14.4 u otra version instalada.

## Login inicial

```text
Usuario: admin
Contrasena: admin
```

Cambia la contrasena desde `Usuarios` antes de usar LibrePOS en operacion real.

## Acceso desde telefono o tablet

El equipo que corre LibrePOS actua como servidor local. En otros dispositivos de la misma red WiFi no uses `localhost`; usa la IP que muestra la ventana al arrancar, por ejemplo:

```text
http://192.168.1.73:5173/
```

La red debe permitir conexiones al puerto `5173` del equipo servidor (`5174` para la demo). La demo también admite teléfonos de la misma red; reiníciala si estaba abierta antes de este cambio.

En **Perfil → Acceso web**, pulsa **Actualizar direcciones** y escanea el QR. Si hay varias interfaces, selecciona la dirección de la red del teléfono. El QR no se muestra si el servidor sólo escucha en localhost. Mantén abierta la ventana del servidor; revisa el firewall del equipo y evita redes de invitados con aislamiento entre dispositivos. El inicio habitual falla si el puerto 5173 está ocupado, en vez de abrir silenciosamente otro puerto.

## Corregir el pago de una cuenta cerrada

En **Datos**, busca la cuenta y pulsa **Corregir pago**. Selecciona Efectivo o Tarjeta para consumo y propina, indica el efectivo recibido o los datos de terminal y escribe el motivo. Guarda y confirma. También está disponible en el detalle de la venta y en Caja.

Caja puede corregir ventas de la caja abierta; administración también puede corregir cortes cerrados. Se conserva el total, IVA, productos y efectivo contado; se recalculan los importes por método, el efectivo esperado y la diferencia del corte. Queda historial del cambio y el postpago pendiente de reimpresión.

## Instalacion manual

Si prefieres terminal:

```bash
npm install
npm run build
npm start
```

Comandos disponibles:

```bash
npm start      # servidor local Vite en 0.0.0.0:5173
npm run build  # compilacion de produccion en dist/
npm run preview
npm run update # actualizacion desde GitHub
```

## Datos locales

Los datos reales del restaurante se guardan localmente en:

```text
.librepos/state.json
```

La carpeta `.librepos/` esta ignorada por Git para no publicar ventas, usuarios, tokens ni informacion de operacion. Para migrar el POS a otro equipo y conservar datos completos, copia la carpeta `.librepos/` con el servidor detenido.

## Actualizaciones

LibrePOS consulta `https://github.com/JMartinezRuiz/DigQro` y muestra el boton `Actualizar` solo a usuarios admin cuando `package.json` publica una version posterior. La comprobacion no consume la cuota de la API de GitHub.

Al actualizar se descargan los archivos del proyecto, se ejecuta `npm install` y se conserva completa la carpeta `.librepos/`, por lo que ventas, mesas, usuarios, inventario, fichajes y datos locales no se borran. Tras actualizar, cierra y vuelve a abrir LibrePOS para cargar tambien los cambios del servidor local.

La version visible en la pantalla sale de `package.json` y se muestra como `vX.Y.Z`. Cada update publicado debe aumentar el campo `version` en `package.json` y `package-lock.json`, crear la etiqueta coincidente `vX.Y.Z` y subir ambos a GitHub.

## Seguridad local

LibrePOS esta pensado para uso local en una red WiFi de confianza. No lo expongas a internet publico. Protege el equipo servidor, cambia la contrasena inicial de `admin` y guarda los respaldos fuera del equipo donde corre el POS.
