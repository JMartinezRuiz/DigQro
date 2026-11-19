# Administracion y mantenimiento

Esta guia es para quien instala, opera y mantiene el equipo servidor de LibrePOS.

## Requisitos

- Node.js LTS con `npm`.
- Navegador moderno.
- Red WiFi local para telefonos o tablets.
- Python 3 es opcional en macOS; los scripts `.command` lo usan si existe, pero pueden instalar con `npm` directamente si no esta disponible.

Windows usa los archivos `.bat` con Node.js/npm directamente.

## Instalacion

### macOS

1. Abre `Instalar LibrePOS.command`.
2. Si no hay Node.js/npm, instala Node.js LTS cuando se abra la pagina oficial.
3. Al terminar, abre `Abrir LibrePOS.command`.

### Windows

1. Abre `Instalar LibrePOS.bat`.
2. Si no hay Node.js/npm, instala Node.js LTS cuando se abra la pagina oficial.
3. Al terminar, abre `Abrir LibrePOS.bat`.

### Terminal

```bash
npm install
npm run build
npm start
```

## Arranque y apagado

- Para arrancar: abre el lanzador de tu sistema o ejecuta `npm start`.
- Para apagar: cierra la ventana del servidor o pulsa `Ctrl+C`.
- No apagues el equipo servidor mientras se estan registrando ventas.

LibrePOS escucha en `0.0.0.0:5173`, por eso otros dispositivos de la LAN pueden entrar por la IP del servidor.

## Archivos de datos

Los datos operativos se guardan en:

```text
.librepos/
```

Archivos importantes:

- `.librepos/state.json`: ventas, ordenes abiertas, usuarios, inventario, movimientos, extras, gastos, cortes y configuracion.
- `.librepos/sync-token`: token local usado por la cookie de acceso del servidor.
- `.librepos/app-version.json`: version tecnica instalada cuando se actualiza desde GitHub.

Carpetas y archivos generados que no se suben a Git:

- `node_modules/`
- `dist/`
- `.vite/`
- `.librepos/`
- `*.log`
- `__pycache__/`
- `*.pyc`

## Respaldos

Haz dos tipos de respaldo:

1. Respaldo operativo desde la app: entra como admin, ve a `Datos` y descarga `Respaldo JSON`.
2. Respaldo completo del servidor: con LibrePOS apagado, copia toda la carpeta `.librepos/` a una USB, disco externo o carpeta sincronizada segura.

El respaldo completo de `.librepos/` es el preferido para migrar o restaurar el sistema completo porque conserva hashes de contrasenas, token local y metadatos de version.

## Inventario y caja

- `Subir ticket` en Inventario crea un gasto de categoria `Inventario`, suma existencia y actualiza el costo unitario del insumo.
- Si hay caja abierta, el gasto queda ligado a esa caja y baja el efectivo esperado del corte.
- `Merma` descuenta inventario y deja movimiento con motivo, pero no afecta efectivo.
- `Inventario completo` compara conteo fisico contra cantidad esperada. Al aplicar el conteo, cada descuadro queda como movimiento de `conteo` con perdida o ganancia.
- Los insumos consumidos como extras se marcan como estimados porque dependen del gramaje configurado en el catalogo de extras.

## Restauracion

### Restaurar desde copia completa de `.librepos/`

1. Cierra LibrePOS en el equipo destino.
2. Copia la carpeta `.librepos/` respaldada dentro de la carpeta raiz de LibrePOS.
3. Abre LibrePOS.
4. Entra con un usuario existente y revisa ventas, usuarios, inventario y caja.

### Restaurar desde `Respaldo JSON`

El JSON exportado desde `Datos` contiene el estado compartido de la app, pero no es un importador grafico. Para una restauracion manual, un tecnico debe crear `.librepos/state.json` con esta forma:

```text
{
  "version": 1,
  "state": { ...contenido completo del respaldo JSON... }
}
```

Despues se arranca LibrePOS para que normalice el estado. Esta ruta no es ideal para restaurar usuarios porque el respaldo de interfaz no debe tratarse como copia completa de credenciales. Para recuperacion real usa copia completa de `.librepos/`.

## Actualizaciones

La versión 2.1.0-beta.4 recibe el puente desde la etiqueta pública original. Desde el puente, LibrePOS consulta el canal HTTPS de OVH, verifica la firma Ed25519 y el contenido del paquete, e instala las dependencias en una carpeta independiente. La selección de versión cambia al terminar la validación. Las ventas y la configuración permanecen en el equipo. Actualiza con la caja cerrada.

Para el primer cambio desde beta.4, termina el corte, cierra LibrePOS y copia la carpeta completa `.librepos/` a otra ubicación. La exportación JSON de Datos también sirve para consultar la operación. Para incluir las credenciales usa la copia de la carpeta con el servidor detenido. Desde la carpeta de instalación ejecuta el siguiente comando y espera a que termine antes de abrir LibrePOS como de costumbre. Si utilizas el botón antiguo, la pantalla puede recargarse antes de confirmar. Comprueba la versión 2.1.0-beta.5.1 tras el reinicio.

Para actualizar desde terminal:

```bash
npm run update
```

Despues de actualizar, cierra y vuelve a abrir LibrePOS.

## Seguridad

- Usa LibrePOS solo en una red WiFi de confianza. Si ofreces WiFi a tus clientes, conecta LibrePOS a una red separada: la conexión con el servidor no va cifrada.
- No publiques el puerto `5173` a internet.
- Cambia la contrasena inicial de `admin`. Los datos solo llegan a quien inició sesión, así que esa contraseña es lo que los protege.
- Usa usuarios individuales y permisos minimos.
- Guarda respaldos fuera del equipo servidor.
- Protege fisicamente el equipo servidor; quien accede a `.librepos/` puede acceder a datos operativos.

## Solucion de problemas

### `npm` no se reconoce

Instala Node.js LTS y vuelve a abrir el instalador.

### El telefono no abre LibrePOS

En Mi perfil → Acceso web pulsa Actualizar direcciones. Si hay varias, selecciona la red del teléfono. Escribe el enlace manualmente para distinguir un problema de cámara/QR de uno de conexión. Si sólo acepta conexiones del propio equipo, reinicia con el lanzador actualizado.

Verifica:

- El telefono esta en la misma red WiFi que el servidor.
- Estas usando la IP del servidor, no `localhost`.
- El firewall permite conexiones entrantes al puerto `5173`.
- La ventana del servidor sigue abierta y el equipo no está suspendido.
- La red de invitados o el punto de acceso no aísla dispositivos entre sí.
- Una VPN no está desviando la conexión.
- El puerto corresponde a la operación (habitualmente 5173) o a la demo (5174), según lo que quieres abrir.

Si abre pero los datos no coinciden, compara servidor y puerto en ambos equipos. Antes de repetir cobros o comandas tras un corte, comprueba lo recibido en el servidor. No borres el almacenamiento del navegador con cambios pendientes.

### El puerto `5173` ya esta ocupado

Cierra ventanas anteriores de LibrePOS. Para una prueba temporal puedes arrancar en otro puerto:

```bash
npm start -- --port 5174
```

En ese caso tambien debes usar el nuevo puerto desde telefonos y tablets.

### No aparece el boton de actualizar

Solo lo ven administradores. Tambien puede ocultarse si el canal no responde, si no hay internet o si ya estas en la version mas reciente.

### La actualizacion falla

Ejecuta:

```bash
npm run update
```

Si falla la descarga o la validación, revisa la conexión y reintenta. Para regresar al programa anterior al último cambio de versión firmado, cierra LibrePOS, ejecuta `node scripts/update.js --rollback` en la carpeta original y vuelve a abrirlo. El reparador local de Windows prepara de nuevo la versión firmada. La ruta histórica del reparador público permanece disponible para recuperar la instalación del puente.

### El login falla despues de una restauracion manual

Si se restauro desde un JSON incompleto, pueden faltar datos de contrasenas. Restaura desde copia completa de `.librepos/` siempre que sea posible.

## Permiso para corregir pagos

Por defecto solo los administradores pueden corregir pagos, con la caja abierta o con el corte cerrado. Los usuarios existentes con función Caja no reciben permiso automáticamente.

En **Usuarios → Editar → Permiso para corregir pagos**, administración puede configurar cada usuario:

- **Sin permiso:** puede cobrar si tiene Caja, pero no corregir pagos.
- **Solo caja abierta:** con función Caja, corrige ventas de la caja actualmente abierta.
- **Cualquier caja (incluye cortes cerrados):** con función Caja, corrige también ventas históricas; el buscador aparece en Caja.

Los administradores siempre conservan acceso a todas las correcciones. El servidor verifica el permiso guardado y la identidad de quien inició sesión. Si pide iniciar sesión de nuevo tras un reinicio o caducidad, hazlo antes de corregir.

Las tablas de cobros de Caja y del buscador de Datos tienen **Desplazar tabla** encima de las filas. Arrastra la barra o usa las flechas; la tabla también conserva el desplazamiento táctil y con teclado.
