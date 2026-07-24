## Context

El valor no es guardar todo, es responder rápido lo que importa. TimescaleDB con
continuous aggregates precalcula los agregados de flujo para que "día de mayor flujo
del último año" responda en milisegundos.

## Decisiones

### D1 — Muster desde el mismo estado de ocupación

El muster del servidor y el de la PWA leen el mismo modelo de ocupación
(entradas/salidas). Uno es online y el otro offline; la definición de "quién está
dentro" es única.

### D2 — Tracking con control de acceso propio

El mapa de recorrido por persona es potente y sensible: tiene su propio control de
acceso y su propio log (quién consultó a quién), coherente con `compliance` DP-06.
No cualquiera ve el recorrido de cualquiera.

### D3 — Salud y capacidad como monitoreo, no como candado

Se reportan las mismas dimensiones que un PACS comercial licencia (lectores online,
entradas, controladores, cardholders, clientes), pero como panel operativo para
detectar degradación, sin convertirlas en límites de pago.

## Non-goals

- Biometría o LPR (fuera del MVP).
- Anomalías avanzadas de Fase 2 (privilege creep completo, tailgating por visión).
