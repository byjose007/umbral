## Why

Aquí está el diferenciador. Los datos que UMBRAL ya captura permiten responder lo
que un jefe de seguridad industrial pregunta primero: ¿quién está dentro ahora
(muster)?, ¿cuál fue el día de mayor flujo?, ¿cómo se mueve la gente por la planta
(tracking)?, ¿hay anomalías (accesos huérfanos, tailgating inferido, privilege
creep)? Y un **dashboard de salud y capacidad** —inspirado en las métricas que los
PACS enterprise licencian por unidad— pero aquí como monitoreo operativo, no como
límite comercial.

## What Changes

- **Nueva capacidad `analytics`**: agregados de flujo y ocupación, reporte de
  evacuación (muster) también desde servidor, tracking de recorrido por persona y
  detección de anomalías.
- **Dashboard de salud y capacidad**: lectores/entradas/controladores en línea vs.
  totales, cardholders activos, clientes conectados — como salud, no como licencia.
- **Reportes con filtros guardados, programación y exportación**.

## Impact

- **Specs afectadas**: `analytics` (nueva).
- **Código afectado**: consultas sobre continuous aggregates de TimescaleDB,
  dashboards Grafana embebidos.
- **Depende de**: `events-audit` (fuente), `topology` (planos), `device-gateway`
  (salud).
- **Habilita**: el argumento comercial del §14; consumido por consola y `guard-pwa`.
