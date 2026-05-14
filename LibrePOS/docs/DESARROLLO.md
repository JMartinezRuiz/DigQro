# Desarrollo

Esta guia documenta la estructura tecnica de LibrePOS para mantenimiento y cambios futuros.

## Stack

- Vite como servidor local y build frontend.
- JavaScript ESM.
- HTML/CSS sin framework de UI.
- Middleware Node dentro de `sync-store.js` para API local, persistencia, sincronizacion y updates.
- Datos locales en archivo JSON dentro de `.librepos/`.

No hay base de datos externa ni dependencias `pip`.

## Comandos

```bash
npm install
npm start
npm run build
npm run preview
npm run update
```

Detalle:

- `npm start`: arranca Vite en `0.0.0.0` para acceso LAN.
- `npm run build`: genera `dist/`.
- `npm run preview`: sirve el build con el mismo middleware local.
- `npm run update`: aplica actualizacion desde GitHub usando `scripts/update.js`.

## Estructura

```text
.
|-- index.html
|-- package.json
|-- package-lock.json
|-- vite.config.js
|-- sync-store.js
|-- src/
|   |-- main.js
|   |-- styles.css
|   `-- vendor/qrcode-generator.js
|-- scripts/
|   |-- install.py
|   |-- start.py
|   `-- update.js
|-- assets/
|   `-- brand.jpg
|-- docs/
`-- .librepos/        # generado localmente, no versionar
```

## Arquitectura

`src/main.js` contiene la aplicacion de navegador:

- Estado inicial y normalizacion.
- Renderizado de vistas.
- Manejo de usuarios, mesas, cocina, caja, inventario, catalogo, extras y datos.
- Persistencia local en `localStorage` con la llave `librepos:v2`.
- Sincronizacion con `/api/state` y `/api/events`.
- Exportacion CSV/JSON.

`sync-store.js` contiene el servidor local:

- Persistencia compartida en `.librepos/state.json`.
- Token local en `.librepos/sync-token`.
- Login contra usuarios guardados.
- Hash de contrasenas con PBKDF2.
- API local de sincronizacion.
- Server-Sent Events para avisar cambios entre clientes.
- Consulta y aplicacion de updates desde GitHub.

`vite.config.js` registra el middleware `createSyncMiddleware()` tanto en desarrollo como en preview.

## Estado compartido

Las llaves compartidas entre clientes son:

```text
settings
users
orders
sales
cancellations
inventory
ingredientCategories
inventoryMovements
expenses
menuProducts
extraCatalog
attendance
cashSessions
```

El resto del estado de pantalla es local del navegador, por ejemplo vista actual, modal abierto, busquedas o usuario de sesion.

## Persistencia

Cuando la API local esta disponible:

1. El cliente carga `/api/state`.
2. Si el servidor no tiene estado, el cliente sube su estado local.
3. Cada cambio compartido se envia con `POST /api/state`.
4. El servidor incrementa version y notifica por `/api/events`.
5. Otros clientes aplican el nuevo estado y lo guardan en su `localStorage`.

Si el servidor no esta disponible, el navegador sigue funcionando con `localStorage`, pero no sincroniza con otros dispositivos.

## Conflictos

El cliente envia `baseVersion`. Si el servidor tiene otra version, responde `409 version-mismatch`. El cliente intenta fusionar cambios locales y remotos por entidad con `id`, y vuelve a enviar el resultado.

La fusion es pragmatica, no transaccional. Para flujos de alta concurrencia, valida manualmente ventas abiertas y caja despues de cortes de red.

## Actualizador

Constantes en `sync-store.js`:

```text
UPDATE_REPO_OWNER = "JMartinezRuiz"
UPDATE_REPO_NAME = "DigQro"
UPDATE_BRANCH = "main"
UPDATE_PROJECT_PREFIX = "LibrePOS/"
```

El actualizador:

1. Consulta el commit mas reciente que toca `LibrePOS/`.
2. Descarga el arbol de archivos de esa carpeta.
3. Ignora carpetas y archivos preservados.
4. Elimina archivos locales obsoletos no preservados.
5. Escribe archivos descargados.
6. Ejecuta `npm install`.
7. Guarda `.librepos/app-version.json`.

## API local

La referencia de endpoints esta en [API_LOCAL.md](API_LOCAL.md).

## Versionado

La version visible en pantalla sale de `package.json`.

Antes de publicar una actualizacion:

1. Incrementa `version` en `package.json`.
2. Actualiza `package-lock.json` si corresponde.
3. Ejecuta `npm install` si cambiaste dependencias.
4. Ejecuta `npm run build`.
5. Arranca `npm start` y valida login, caja, mesa, para llevar, comanda, cocina, cobro, exportacion y actualizacion visible.
6. Sube los cambios al repositorio esperado por el actualizador.

## Pruebas

No hay suite automatizada configurada en `package.json`. La verificacion minima actual es:

```bash
npm run build
```

Para cambios de comportamiento, agrega verificacion manual del flujo afectado y documenta el resultado en el PR o nota de release.

## Convenciones

- Manten `.librepos/` fuera de Git.
- No guardes datos reales del restaurante en commits.
- Evita cambios grandes no relacionados con el flujo que estas modificando.
- Si agregas datos nuevos al estado compartido, actualiza `SHARED_STATE_KEYS`, normalizacion, exportacion y documentacion.
- Si agregas endpoints, documentalos en `docs/API_LOCAL.md`.
