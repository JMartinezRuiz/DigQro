# LibrePOS

POS sencillo para restaurante, con venta por mesas y para llevar, comandas digitales, cocina, inventario, usuarios, fichaje, datos diarios y sincronizacion local por red WiFi.

## Instalar con doble click

### macOS

1. Abre `Instalar LibrePOS.command`.
2. Cuando termine, abre `Abrir LibrePOS.command`.
3. El navegador abrira `http://localhost:5173/`.

### Windows

1. Abre `Instalar LibrePOS.bat`.
2. Cuando termine, abre `Abrir LibrePOS.bat`.
3. El navegador abrira `http://localhost:5173/`.

Los archivos `.bat` de Windows no dependen de Python. Funcionan con Node.js/npm directamente, asi que no importa si tienes Python 3.14.4 u otra version instalada.

## Acceso desde telefono o tablet

El equipo que corre LibrePOS actua como servidor local. En otros dispositivos de la misma red WiFi no uses `localhost`; usa la IP que muestra la ventana al arrancar, por ejemplo:

```text
http://192.168.1.73:5173/
```

## Login inicial

```text
Usuario: admin
Contrasena: admin
```

Cambia la contrasena desde la seccion de usuarios cuando empieces a usarlo en serio.

## Dependencias incluidas

El repositorio incluye:

- `package.json`
- `package-lock.json`
- Scripts Python opcionales de instalacion y arranque en `scripts/`
- Launchers point-and-click para macOS y Windows

No se sube `node_modules/` porque es una carpeta generada. El instalador ejecuta `npm install` usando `package-lock.json`, por lo que instala exactamente las dependencias del proyecto.

No hay dependencias `pip`; Python se usa solo para los scripts de ayuda.

## Instalacion manual

Si prefieres terminal:

```bash
npm install
npm run build
npm start
```

## Datos locales

Los datos reales del restaurante se guardan localmente en:

```text
.librepos/state.json
```

Esa carpeta esta ignorada por Git para no publicar ventas, usuarios, tokens ni informacion de operacion. Si migras el POS a otro equipo y quieres conservar datos, copia manualmente la carpeta `.librepos/`.

## Seguridad local

La sincronizacion usa una API local servida por Vite. No esta pensada para internet publico. Usala solo dentro de una red WiFi de confianza.
