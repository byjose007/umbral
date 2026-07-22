## Why

Un PACS enterprise en operación real emite cientos de eventos en minutos (en la
referencia observada, 577 en menos de veinte). Volcar ese firehose a un operador es
lo que hace el producto incumbente, y es precisamente donde UMBRAL gana: el motor de
alertas convierte ese ruido en las pocas señales que exigen acción, con
deduplicación y escalado, y presenta un **feed de actividad en vivo seudonimizado**
que respeta la LOPDP (el detalle con nombre y credencial vive detrás de una consulta
auditada, no expuesto en pantalla como en los sistemas clásicos).

## What Changes

- **Nueva capacidad `alerting`**: motor de reglas sobre el flujo de eventos, con
  severidad, deduplicación, escalado y canales.
- **Alertas base**: DHO (puerta abierta), DFO (puerta forzada), tamper,
  `device.offline`, deriva de reloj, coacción, viaje imposible y **falla de línea
  supervisada** (`input.fault`).
- **Pre-alarma local** de DHO (zumbador N segundos antes) para evitar alarmas por
  logística legítima.
- **Feed de actividad en vivo seudonimizado**, filtrable por severidad y sitio, con
  el detalle PII detrás de acceso auditado.

## Impact

- **Specs afectadas**: `alerting` (nueva).
- **Código afectado**: `src/domain/alerting/**`, motor de reglas, feed en vivo (WSS).
- **Depende de**: `events-audit` (fuente de hechos), `decision-engine` (coacción,
  viaje imposible), `device-gateway` (dispositivo caído, deriva).
- **Habilita**: `notifications` (canales), consola y `guard-pwa` (alarmas activas).
