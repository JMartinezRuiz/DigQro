# Digitalización Querétaro

Landing estática de una sola página para GitHub Pages.

## Archivos para publicar

```text
index.html
styles.css
script.js
assets/
  favicon.svg
.nojekyll
```

GitHub Pages puede servir estos archivos directamente desde la raíz del repositorio. El archivo `.nojekyll` está vacío a propósito para desactivar el procesamiento de Jekyll.

## Probar en local

Puedes abrir `index.html` directamente en el navegador o levantar un servidor estático:

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080`.

## Contacto configurado

- WhatsApp: `+52 442 600 0092`
- Teléfono: `+52 442 600 0092`
- Correo: `contacto@digitalizacionqueretaro.com`
- Formspree: `https://formspree.io/f/mykldbwa`

## Seguridad

La versión estática no usa claves, tokens, cookies, almacenamiento local ni librerías externas. El formulario envía los datos a Formspree mediante `POST` y el CTA principal abre WhatsApp con un mensaje codificado.

Se dejó una política CSP en el HTML para limitar ejecución de scripts y carga de recursos al propio sitio, permitiendo únicamente Formspree como destino externo del formulario.
