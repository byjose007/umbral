## Context

El gateway es infraestructura: implementa puertos del dominio, no define reglas de
negocio. Su trabajo es que la decisión local del controlador siga siendo posible
(empujar la matriz) y que el servidor tenga una copia fiel y ordenada de lo que pasó
(ingesta idempotente).

## Decisiones

### D1 — mTLS por dispositivo sobre VLAN aislada

Cada controlador tiene su certificado; uno robado se revoca sin tocar a los demás.
La VLAN de control de acceso no tiene ruta a internet. El broker (EMQX) aplica ACL
por dispositivo: un controlador solo publica en sus tópicos.

### D2 — Idempotencia por `event_id`

El controlador genera un `event_id` estable por evento antes de bufferizar. Al
reconectar, reenvía su buffer; el servidor ignora los `event_id` ya vistos. Así el
store-and-forward no duplica ni pierde.

### D3 — La matriz se versiona y se reconcilia

El servidor empuja `CompiledAccessMatrix` con una `matrix_version` monótona. El
controlador reporta su versión en el heartbeat; si va atrasado, el gateway
reenvía. Nunca hay ambigüedad sobre qué matriz está vigente en cada puerta.

### D4 — Salud como señal continua, no ausencia

Cada controlador emite heartbeat periódico con firmware, batería, tamper y deriva
de reloj. La ausencia de heartbeat más allá de un umbral es en sí un evento
(`device.offline`), no silencio.

## Non-goals

- El firmware ESP32 (Fase 2). Aquí el motor edge se ejercita con el
  `SimulatorAdapter`.
- Qué hacer con las alertas (eso es `alerting`); aquí solo se emiten los hechos.
