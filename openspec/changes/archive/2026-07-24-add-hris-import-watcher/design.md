## Context

Inspirado en el "Import Watcher" de los PACS enterprise, pero simple: no un ETL
pesado, sino un conciliador idempotente entre una fuente de RRHH y `identity`.

## Decisiones

### D1 — `external_ref` es la clave de conciliación

Cada persona importada se casa con su registro en RRHH por `external_ref`. La
importación es idempotente: reejecutarla no duplica ni corrompe.

### D2 — La baja cierra el periodo, no borra a la persona

Cuando RRHH marca una baja, el importador cierra el periodo de empleo con su fecha.
El bloqueo de acceso es consecuencia del estado derivado de `identity`, no una
acción directa del importador. Así una sola regla gobierna el acceso.

### D3 — Discrepancias se reportan, no se adivinan

Si un registro de RRHH no casa (documento inconsistente, persona inexistente), el
importador lo reporta como discrepancia para revisión humana, sin inventar datos.

## Non-goals

- Ser la fuente de verdad de RRHH (UMBRAL consume, no gobierna, el dato laboral
  cuando existe integración).
