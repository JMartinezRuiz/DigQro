# LibrePOS 2.0.2

Actualización sobre 2.0.1, distribuida desde `main` y la etiqueta `v2.0.2`. Incluye descuentos antes del cobro, permisos configurables de corrección y desplazamiento horizontal de pagos.

Después de actualizar y reiniciar el servidor, recarga los dispositivos e inicia sesión de nuevo. Los usuarios de Caja empiezan sin permiso para corregir pagos; administración puede concederlo desde Usuarios.

## Corrección de pagos

- Solo los administradores pueden corregir por defecto, también cuando la cuenta o el corte están cerrados. Los usuarios existentes de Caja empiezan sin permiso de corrección.
- Administración configura cada usuario en **Usuarios → Editar → Permiso para corregir pagos**: Sin permiso, Solo caja abierta o Cualquier caja (incluye cortes cerrados). Los permisos delegados requieren además función Caja. El último alcance muestra el buscador histórico dentro de Caja.
- La misma regla se usa al mostrar el botón, abrir el formulario y guardar. Se conservan total, auditoría, cálculo del corte y reimpresión existentes.
- El servidor comprueba la identidad autenticada, los permisos guardados y la caja original. No acepta una función o permiso enviado por el cliente para autorizar su propia modificación. Protege también usuarios, credenciales, eliminación de ventas y reapertura de cortes frente a cambios sin autorización.
- Login entrega una sesión individual de 24 horas; se invalida al salir, cambiar contraseña, desactivar el usuario o reiniciar el servidor. Tras un reinicio será necesario entrar de nuevo. Las escrituras del estado se serializan y la revocación de permisos se aplica en la siguiente solicitud.
- Esto no completa la revisión de autorización de todos los endpoints históricos ni convierte todas las operaciones del POS en transacciones de dominio; siguen pendientes los temas de impresión, actualización, lectura y sincronización recogidos en REVISION_2.0.md.

## Desplazamiento de pagos

Las tablas **Cobros de la caja abierta** y **Buscador de ordenes** incluyen una barra visible y flechas izquierda/derecha encima de las filas. Funcionan con ratón, teclado y pantalla táctil, se sincronizan con el desplazamiento nativo y conservan la posición al redibujar la vista. Se ocultan cuando todas las columnas caben.

## Descuento antes del cobro

- En la cuenta abierta, **Descuento de la cuenta** permite asignar o retirar el descuento y ver el total sin llegar a Finalizar. Se guarda al elegir.
- **Prepago y descuento** muestra el total para el cliente y la vista previa del ticket completo, incluidos descuento e IVA. En móvil se abre desde **Prepago** en la barra inferior; también está disponible en las cuentas para llevar.
- El selector de la vista previa actualiza el importe al instante. **Guardar prepago**, **Guardar e imprimir** y **Continuar al cobro** aplican el cambio; cerrar sin guardar conserva el descuento anterior.
- Vista previa e impresión usan el mismo generador de ticket. El cobro reutiliza el descuento una sola vez; si cambia el consumo, recalcula sobre los productos actuales. Cambiar el descuento invalida la impresión anterior. Datos refleja también el descuento de las cuentas abiertas.
- Meseros, Caja y Administración pueden preparar el descuento. Esta acción es distinta del permiso de corregir pagos ya registrados.

## Validación y ayuda

- Pruebas de valores predeterminados, roles antiguos, usuario inactivo, permiso limitado a la caja actual, cortes cerrados, concesión y revocación.
- Prueba con el middleware real y almacenamiento temporal: rechazo de corrección sin sesión, rol o permiso falsificado, cambio de contraseña ajena y reapertura para eludir el permiso. Verifica guardar con permisos explícitos, revocarlos y rechazar una sesión cerrada; dos escrituras de la misma versión producen 200 y 409.
- Demo aislada: guardar un permiso desde Usuarios y comprobarlo en el servidor; botón visible para Caja autorizada y desaparición tras revocar sin cerrar sesión.
- Escritorio 1280 × 720: barra mueve de la primera a la última columna. Móvil 390 × 844: desplazamiento dentro de la tabla, sin desbordamiento horizontal de página.
- Descuentos: pruebas de vista previa sin mutación, conservación de la cuenta abierta, IVA, redondeo, cambios de productos, retirada del descuento y rechazo de cuentas cerradas. Demo aislada: $35 con 20% muestra $28 tanto en ticket como al pasar al cobro; cancelar el borrador conserva el descuento anterior. Acceso al prepago probado desde móvil. No se envió papel a una impresora física.
- **Ayuda actualizada:** guías de corrección, caja, usuarios, prepago y descuentos, asistente, referencia operativa y cuatro tutoriales con capturas reales. Las capturas `pending-*` se tomaron durante el desarrollo de esta entrega, cuando la versión visible todavía era 2.0.1; se conserva su procedencia en `sourceRevision` y su versión real en el manifest.

Resultado final: `npm test` pasa con **59 pruebas, 0 fallos**; `npm run build` termina correctamente. Se mantiene el aviso previo de tamaño del módulo principal (614 kB antes de gzip). `git diff --check` no detecta problemas. Se incrementa la versión a 2.0.2. Los scripts del actualizador no se modifican.
