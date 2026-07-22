## 1. Motor de reglas

- [ ] 1.1 Modelo de regla: condición + alcance + severidad + dedup + escalado + canales
- [ ] 1.2 Evaluación sobre el flujo tipado de `events-audit`
- [ ] 1.3 Deduplicación por ventana; escalado por tiempo sin reconocimiento

## 2. Alertas base

- [ ] 2.1 DHO y DFO con severidades y pre-alarma local
- [ ] 2.2 Tamper, `device.offline`, deriva de reloj
- [ ] 2.3 Coacción (silenciosa), viaje imposible, `input.fault`

## 3. Feed de actividad en vivo

- [ ] 3.1 Stream WSS de actividad, filtrable por severidad y sitio
- [ ] 3.2 Seudonimización por defecto de la persona
- [ ] 3.3 Revelado de PII como acción auditada (integra `compliance`)
- [ ] 3.4 Reconocimiento (ack) de alarmas por el operador

## 4. Validación OpenSpec

- [ ] 4.1 `openspec validate add-alerting --strict` en verde
