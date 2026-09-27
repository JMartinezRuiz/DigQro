# LibrePOS 2.0.1

Publicado como paquete de LibrePOS en `main` y etiqueta `v2.0.1`. Esta entrega incorpora el trabajo local de la versión 2.0 y la ampliación de ayuda 2.0.1.

## Ayuda actualizada

- 26 guías revisadas, con un ejemplo práctico, dos o más diagnósticos de problemas y tres comprobaciones finales por guía.
- Nuevos recorridos de corrección de pago de cuentas cerradas, configuración de terminales y acceso desde teléfonos por WiFi/QR.
- Instrucciones de prepago actualizadas: el descuento se guarda antes del cobro y se reutiliza una sola vez.
- Búsqueda ampliada a ejemplos, síntomas y comprobaciones; diagnósticos desplegables accesibles.
- Asistente local con intenciones separadas para correcciones, terminales, red y sincronización; accesos filtrados por función. Sigue en beta y no ejecuta cambios de operación.
- 26 GIFs, 26 posters y 136 imágenes de pasos. Ocho capturas nuevas proceden de la demo 2.0.1 con datos ficticios. Las capturas anteriores mantienen su versión real, visible en la ayuda.
- Manual completo en `GUIAS_OPERATIVAS.md`, generado desde el mismo contenido de la aplicación para evitar divergencias.

## Operación y acceso local incluidos

- Corrección de efectivo/tarjeta y propina con motivo, autor e historial; conserva el total y recalcula la caja correspondiente. Administración puede corregir cortes cerrados conservando el efectivo contado.
- Terminal y Crédito/Débito en los pagos que incluyan tarjeta; nombres históricos conservados.
- Demo accesible desde la red local; puerto real en enlaces, preferencia por interfaces físicas, selección entre direcciones y aviso si sólo admite acceso local.
- Inicio habitual con puerto estricto para evitar que el lanzador abra otro servidor silenciosamente.
- Diseño 2.0, recetas, disponibilidad de productos y correcciones locales de credenciales y conteo incluidas en el conjunto de cambios previo a esta publicación.

## Validación

- `npm test`: 51 pruebas correctas, sin fallos.
- `npm run build`: correcto. Persiste el aviso de tamaño del módulo principal, aproximadamente 598 kB antes de gzip.
- Revisión de la secuencia completa de 136 fotogramas y validación de duración entre 5 y 12 segundos, dimensiones y procedencia. Se ajustó la captura de tarjeta para que terminal y tipo queden visibles.
- En navegador: consulta «Me equivoqué: tarjeta a efectivo», enlace a Configuración → Terminales, guía completa, diagnósticos desplegables, búsqueda por «aislamiento», pasos siguiente/anterior y reproducción/retorno desde GIF.
- Revisión visual de ayuda a 1280 px y 390 px, sin desbordamiento horizontal de página ni imágenes rotas en las vistas revisadas.
- Capturas de formularios de prepago, cobro y corrección con datos ficticios. Se verificó que $31.50 de efectivo con $50 recibidos muestra $18.50 de cambio. La confirmación nativa de cobro bloqueó una pestaña de la herramienta de revisión; se continuó con una venta ficticia preparada en la API de la demo. Las pruebas automatizadas cubren la transformación de corrección y el ajuste del corte; esta revisión no afirma haber completado el cobro físico ni su confirmación final desde el navegador.
- Acceso HTTP por IP local probado en este equipo. El firewall del restaurante, cámara QR de un teléfono físico e impresión física requieren validación en el equipo de operación.

## Actualización

Haz respaldo, aplica la actualización y reinicia el servidor. Recarga los dispositivos para cargar la nueva ayuda. La carpeta `.librepos/` se conserva; no se publica en Git ni se usó para capturas.

La revisión técnica anterior permanece en `REVISION_2.0.md`: esta versión no resuelve los límites de autenticación, concurrencia y recuperación allí documentados. Evita operaciones simultáneas sobre la misma cuenta y comprueba en el servidor una operación tras una interrupción antes de repetirla.
