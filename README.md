# Digitalización Querétaro

Web estática de una sola página, publicada con GitHub Pages desde la carpeta `docs/` en https://digitalizacionqueretaro.com.

## Web

Todo lo que se publica está en `docs/`. No necesita compilación ni dependencias.

```text
docs/
  index.html
  404.html
  styles.css
  app.js
  robots.txt
  sitemap.xml
  CNAME
  .nojekyll
  assets/
    favicon.svg
    og-image.png
    fonts/
```

`.nojekyll` está vacío a propósito para desactivar el procesamiento de Jekyll. `404.html` usa rutas absolutas porque GitHub Pages lo sirve en cualquier ruta que no exista.

Para probarla en local:

```bash
python3 -m http.server 8080 --directory docs
```

Después abre `http://localhost:8080`.

### Contacto configurado

- WhatsApp y teléfono: `+52 442 600 0092`
- Correo: `contacto@digitalizacionqueretaro.com`

### Seguridad

La web no usa formularios, cookies, almacenamiento local, analítica ni recursos externos. Las fuentes (licencia SIL OFL) se sirven desde `docs/assets/fonts/`; `newsreader-display-latin.woff2` es Newsreader con los ejes fijados en `opsz=48` y `wght=500` para reducir su peso. La política CSP del HTML limita scripts, estilos, imágenes y fuentes al propio sitio.

## LibrePOS

El proyecto POS para restaurante está en la carpeta `LibrePOS/` y no se publica en la web. Su actualizador descarga de esa carpeta en este repositorio, así que no debe moverse ni cambiar de nombre sin actualizar `LibrePOS/sync-store.js` y `LibrePOS/scripts/repair-update.ps1`.

- Instalación point-and-click para macOS: `LibrePOS/Instalar LibrePOS.command`
- Arranque point-and-click para macOS: `LibrePOS/Abrir LibrePOS.command`
- Instalación point-and-click para Windows: `LibrePOS/Instalar LibrePOS.bat`
- Arranque point-and-click para Windows: `LibrePOS/Abrir LibrePOS.bat`

Los datos locales del POS se guardan en `LibrePOS/.librepos/` y no se publican en Git.
