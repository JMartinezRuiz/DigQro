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
- `assets/help/`: GIFs, posters y una imagen por paso, disponibles sin conexion.
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
5. Captura la interfaz real a 1280 x 720 px, sin datos personales ni informacion de clientes. Si otra altura permite mostrar mejor una pantalla, declara su `viewport` en ese fotograma.
6. Guarda las capturas en `assets/help/source/` y actualiza `manifest.json`. Las capturas nuevas deben indicar la version de `package.json` en `captureVersion`. Las antiguas conservan su version real; nunca se renombra una captura anterior como si perteneciera al nuevo diseño. Un fotograma puede sobrescribir `captureVersion`, `capturedAt` y `viewport` globales.
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

10. Revisa cada GIF completo y confirma que el fotograma corresponde al texto de ese paso. Comprueba tambien las imagenes individuales: permiten leer sin limite de tiempo.
11. Revisa en LibrePOS escritorio y movil: busqueda, categorias, articulo, paso anterior/siguiente, reproduccion opcional del GIF, pausa, relacionados y textos largos.
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
- La version visible coincide con el `captureVersion` del fotograma, o el global si no se sobrescribe.
- No hay datos personales, mensajes de error reales ni informacion de un cliente.
- El GIF y los pasos se generan a 1280 x 800 px, con titulos de 30 px y un maximo de dos lineas, sin recortar palabras ni usar puntos suspensivos.
- Cada paso permanece visible al menos cinco segundos y ofrece suficiente tiempo para localizar el control.
- Si hay zoom o realce, se aplica a la captura real y el control sigue completo. No se dibujan controles ni se simulan resultados que la captura no muestra.

## Contrato de recursos visuales

Cada articulo produce estos archivos, con pasos numerados desde 1:

- `{id}.gif`: recorrido animado completo.
- `{id}-poster.png`: primer paso estatico.
- `{id}-step-{n}.png`: cada paso para navegacion manual y movimiento reducido.

La cantidad y orden de pasos visuales los define `manifest.articles[id]`; puede diferir de los pasos escritos, que incluyen contexto operativo adicional. El reproductor debe usar el manifest para evitar imagenes inexistentes.

Ejemplo de fotograma:

```json
{
  "image": "catalog-product-recipe-v2.jpg",
  "caption": "Selecciona un insumo y la cantidad que consume una unidad",
  "focus": [242, 289, 795, 241],
  "hint": "Si la unidad es KILO: 0.200 equivale a 200 gramos",
  "durationMs": 6500,
  "captureVersion": "2.0.0-beta.1",
  "capturedAt": "2026-09-07",
  "viewport": { "width": 1280, "height": 720 }
}
```

`focus` es opcional y usa pixeles de la captura original: izquierda, arriba, ancho y alto. El generador amplia esa region dejando contexto y señala el control real con un recuadro. `hint` es una pista corta opcional. `durationMs` permite entre 5000 y 12000 ms; sin valor, el tiempo se calcula a partir del texto.

Para regenerar solo una guia:

```bash
python3 scripts/generate_help_media.py --article create-edit-recipe
```

El generador valida el manifest completo y falla si falta una captura, un recorte se sale de la imagen o el texto no cabe de forma legible. No borra recursos ajenos ni capturas anteriores. Los archivos en desuso se revisan manualmente antes de retirarlos.

## Ayudante beta

La ayuda rapida por palabras clave ofrece opciones y accesos a guias. Debe distinguir entre crear un platillo, cambiar su receta, ocultarlo del menu y cancelar una linea de una cuenta. Las frases ambiguas, como «quitar plato», deben mostrar las alternativas antes de elegir una accion.

El ayudante explica sus limites y se identifica como beta. Sus respuestas deben basarse en los articulos y nombres de controles vigentes; escribir una consulta no debe modificar recetas, precios, inventario ni ventas. Los cambios se realizan desde las pantallas habituales, con los permisos existentes.

Las guias de crear/cambiar receta y retirar/reactivar platillos forman parte de la cobertura obligatoria de esta version.

## Tickets de soporte

El formulario de tickets permanece intencionalmente deshabilitado. No debe guardar ni enviar datos hasta que exista la arquitectura de servidor, autenticacion, privacidad, adjuntos, estados y tratamiento de errores aprobados.

Activar solo el boton sin completar esas condiciones se considera una regresion de seguridad y experiencia.


## Ampliación editorial 2.0.1

Las 26 guías incluyen `example` (título y caso desarrollado), `troubleshooting` (síntoma y resolución) y `verification` (comprobaciones finales). `reviewedAt` declara la fecha de revisión escrita, independiente de la fecha y versión de las capturas. Los diagnósticos se muestran con desplegables nativos accesibles y todo el texto se escapa antes de renderizarlo.

El buscador indexa ejemplos, diagnósticos y verificaciones. El asistente reconoce correcciones, terminales, red y sincronización como intenciones distintas de cobrar. Sus accesos deben respetar el rol; una consulta no ejecuta la operación. Las pruebas incluyen los nombres de guías usados en Novedades para evitar enlaces vacíos.

La referencia extensa `GUIAS_OPERATIVAS.md` se genera con `python3 scripts/generate_help_reference.py` a partir del mismo JSON de la aplicación. Regénérala después de cambios editoriales. Mantén las fechas de las capturas anteriores: actualizar el texto no convierte una imagen antigua en evidencia de la versión nueva.
