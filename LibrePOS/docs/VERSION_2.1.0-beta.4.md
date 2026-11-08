# LibrePOS 2.1.0-beta.4 · Entrega de propinas

En **Caja → Corte de caja → Entrega de propinas** aparece el importe pendiente de entregar del día, incluidos los cobros de propina en efectivo y tarjeta.

- **Efectivo**, por defecto: cuenta el dinero antes de repartirlo. El corte descuenta la entrega del efectivo esperado y del contado para conservar cualquier diferencia real. Si el cajón no alcanza, el aviso en rojo indica cuánto falta.
- **Tarjeta**: realiza el pago fuera de LibrePOS. El sistema registra la entrega y la resta de tarjeta neta, sin tocar el efectivo ni los cobros originales.
- **Dividir entre (personas)** muestra cuánto entregar a cada persona. Si sobran centavos, se distribuyen para que el total coincida con la entrega.
- **Dejar pendiente** permite cerrar sin registrar una entrega. Un corte posterior del mismo día recupera lo pendiente y excluye lo ya entregado.

El historial de cortes y **Cortes CSV** muestran las entregas por método. La opción aparece al abrir caja.

## Instalar

En el equipo servidor, inicia sesión como administrador y pulsa **Actualizar**. Al terminar, cierra y vuelve a abrir LibrePOS y recarga los demás dispositivos. También puedes ejecutar `npm run update` desde la carpeta de LibrePOS. El actualizador conserva los datos locales.

## Verificación

- Compilación y pruebas automatizadas.
- Pruebas en navegador con datos de demostración: efectivo, tarjeta, aviso de efectivo insuficiente, reparto con centavos, ausencia de duplicados entre cortes y exportación de Cortes CSV.
- Ayuda actualizada: guía **Cómo abrir y cerrar caja**, recorrido visual, Novedades y asistente de ayuda.
