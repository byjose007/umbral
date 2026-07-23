## Context

Privacidad por diseño: la seudonimización por defecto ya vive en `alerting`,
`analytics` y `guard-pwa`. `compliance` es donde se define la política que todas
consumen y donde se centraliza la auditoría de "quién vio qué".

## Decisiones

### D1 — Retención por tipo con purga automática

Cada tipo de dato (eventos, fotos de visitante, videos) tiene su periodo de
retención. Un job de purga elimina lo vencido. La foto de un visitante no vive cinco
años.

### D2 — El acceso a PII es un evento auditable

Revelar identidad o consultar un recorrido genera un registro (quién, a quién,
cuándo, por qué). Este log es en sí mismo auditable y separado del operativo.

### D3 — ARCO como operación de primera clase

Exportar, rectificar y eliminar los datos de una persona son operaciones soportadas,
no favores manuales. La eliminación respeta la inmutabilidad del audit log
(se anonimiza el vínculo donde la ley lo permite, sin romper la cadena de hash).

## Non-goals

- Biometría (Fase 4, con evaluación de impacto previa).
