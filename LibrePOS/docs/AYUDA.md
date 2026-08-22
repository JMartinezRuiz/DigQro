# Mantenimiento del centro de ayuda

El centro de ayuda forma parte del producto. No es documentacion opcional ni se actualiza solamente al final de una version.

## Regla obligatoria

Todo cambio en LibrePOS debe incluir una revision de impacto sobre la ayuda antes de considerarse terminado.

El resultado de la revision debe ser uno de estos dos:

1. `Ayuda actualizada`: se modificaron articulos, pasos, impactos, advertencias, busqueda o recursos visuales.
2. `Ayuda revisada; no requiere cambios`: el comportamiento y la interfaz visibles no cambiaron.

Este resultado debe quedar indicado en la nota del cambio, commit o pull request cuando se publique.

## Fuentes de la ayuda

- `src/help-content.json`: categorias, articulos, requisitos, pasos, impactos, advertencias, etiquetas y guiones visuales.
- `assets/help/source/`: capturas reales y saneadas de la interfaz actual.
- `assets/help/source/manifest.json`: version capturada, orden y texto breve de cada fotograma.
- `assets/help/`: GIFs y posters generados que se sirven dentro de LibrePOS sin conexion.
- `scripts/generate_help_media.py`: monta GIFs y posters exclusivamente a partir de capturas reales.
- `src/main.js`: presentacion, busqueda, filtros y controles del centro de ayuda.
- `src/styles.css`: presentacion responsive y accesible.

Las capturas fuente, los GIFs y los posters son artefactos de la aplicacion y deben versionarse junto con el contenido que explican. El generador es una herramienta de desarrollo; LibrePOS no necesita Python para ejecutarse.

No se permiten recreaciones, mockups ni controles dibujados para representar LibrePOS. Todo recurso visual debe proceder de la interfaz real de la version indicada en `captureVersion`.

## Cuando actualizar

Actualiza la ayuda cuando cambie cualquiera de estos elementos:

- Nombre, ubicacion, orden o disponibilidad de una accion.
- Permisos necesarios para completar una tarea.
- Calculo de precio, descuento, IVA, propina, caja o margen.
- Momento o cantidad de un movimiento de inventario.
- Flujo de mesas, comandas, cocina, cobro o tickets.
- Comportamiento de cancelacion, borrado, reimpresion o folios.
- Configuracion de impresoras, actualizaciones, respaldos o usuarios.
- Mensajes de advertencia, confirmaciones o resultados esperados.
- Nueva funcion que el usuario deba aprender o cuya consecuencia deba comprender.

Un refactor interno sin cambios observables puede no requerir edicion, pero la revision sigue siendo obligatoria.

## Proceso editorial

1. Identifica los articulos afectados y sus articulos relacionados.
2. Verifica que los nombres de botones, pestañas y campos coincidan exactamente con LibrePOS.
3. Actualiza requisitos, pasos, impacto, advertencia, resultado esperado y etiquetas de busqueda.
4. Abre la version actual de LibrePOS con datos ficticios y recientes en un entorno aislado.
5. Captura la interfaz real y normaliza la fuente a 1280 x 720 px, sin datos personales ni informacion de clientes.
6. Guarda las capturas en `assets/help/source/` y actualiza `manifest.json`. `captureVersion` debe coincidir con la version de `package.json`.
7. Actualiza `visualSteps` cuando cambie el recorrido o el nombre de un control.
8. Regenera todos los recursos:

```bash
python3 scripts/generate_help_media.py
```

9. Ejecuta las pruebas y el build:

```bash
npm test
npm run build
```

10. Revisa cada GIF completo y confirma que el fotograma corresponde al texto de ese paso.
11. Revisa en LibrePOS escritorio y movil: busqueda, categorias, articulo, GIF, pausa, relacionados y textos largos.
12. Registra `Ayuda actualizada` o `Ayuda revisada; no requiere cambios` en la entrega.

## Criterios de calidad

Cada articulo debe explicar:

- Quien puede realizar la accion.
- Que debe estar preparado antes de empezar.
- Pasos en el orden real de la interfaz.
- Efecto de cada paso sobre operacion y datos.
- Impacto final sobre venta, IVA, inventario, caja, impresion o historial.
- Advertencias para acciones irreversibles o de amplio alcance.
- Resultado observable que confirma que termino correctamente.
- Guias relacionadas para continuar o corregir.

Usa datos ficticios y tiempos recientes. No captures ventas, usuarios, telefonos, impresoras o informacion real de clientes en GIFs ni posters. Evita cuentas antiguas con duraciones irreales aunque los datos no sean personales.

Antes de aprobar un recurso visual confirma:

- Los nombres de botones y campos coinciden literalmente con la aplicacion.
- La captura no representa una accion disponible en otra pantalla.
- La version visible coincide con `captureVersion`.
- No hay datos personales, mensajes de error reales ni informacion de un cliente.
- El texto sigue siendo legible despues de generar el GIF a 960 x 540 px.

## Tickets de soporte

El formulario de tickets permanece intencionalmente deshabilitado. No debe guardar ni enviar datos hasta que exista la arquitectura de servidor, autenticacion, privacidad, adjuntos, estados y tratamiento de errores aprobados.

Activar solo el boton sin completar esas condiciones se considera una regresion de seguridad y experiencia.
