## 1. Motor de reglas

- [x] 1.1 Modelo de regla: condición + alcance + severidad + dedup + escalado + canales
- [x] 1.2 Evaluación sobre el flujo tipado de `events-audit`
- [x] 1.3 Deduplicación por ventana; escalado por tiempo sin reconocimiento

## 2. Alertas base

- [x] 2.1 DHO y DFO con severidades y pre-alarma local
- [x] 2.2 Tamper, `device.offline`, deriva de reloj
- [x] 2.3 Coacción (silenciosa), viaje imposible, `input.fault`

## 3. Feed de actividad en vivo

- [x] 3.1 Stream WSS de actividad, filtrable por severidad y sitio
- [x] 3.2 Seudonimización por defecto de la persona
- [x] 3.3 Revelado de PII como acción auditada (integra `compliance`)
- [x] 3.4 Reconocimiento (ack) de alarmas por el operador

## 4. Validación OpenSpec

- [x] 4.1 `openspec validate add-alerting --strict` en verde

