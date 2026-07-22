## 1. Contrato de decisión (dominio)

- [ ] 1.1 Definir `DecisionInput`, `Decision`, `GrantReason`, `DenyReason`,
      `LocalAccessState`
- [ ] 1.2 Implementar `evaluate(input): Decision` como función **pura** (sin I/O)
- [ ] 1.3 Reglas de denegación: ausencia, credencial bloqueada/caducada, fuera de
      horario, documento vencido
- [ ] 1.4 Tests unitarios por cada `reason_code`

## 2. Compilador de matriz de acceso

- [ ] 2.1 `CompiledAccessMatrix` plana por controlador con `matrix_version` monótona
- [ ] 2.2 Compilar niveles de acceso × horarios × estado de persona (empleo +
      ausencias + documentos + credencial) a la matriz
- [ ] 2.3 Puertos hacia `identity`/`credentials`/`access-rights` con dobles de
      prueba (aún no implementados)
- [ ] 2.4 Tests del compilador (persona bloqueada no aparece autorizada)

## 3. Horarios y feriados

- [ ] 3.1 Evaluación de ventanas horarias por día de semana
- [ ] 3.2 Aplicación de calendario de feriados y excepciones
- [ ] 3.3 Tests de borde (fin de franja, feriado, cambio de día)

## 4. Anti-passback, viaje imposible e interlock

- [ ] 4.1 APB `hard` / `soft` / `timed` contra estado cacheado
- [ ] 4.2 Detección de `credential.impossible_travel` (emitir hecho, no bloquear)
- [ ] 4.3 Reserva de interlock por controlador (alcance MVP)

## 5. Coacción (duress)

- [ ] 5.1 PIN de coacción: concede acceso + marca `silentAlarm = 'duress'`
- [ ] 5.2 Test: ninguna diferencia perceptible en la salida del lector

## 6. Modo offline y buffer

- [ ] 6.1 Implementar `offline_mode` (`cached`/`deny_all`/`allow_known`/`unlocked`)
- [ ] 6.2 Bufferizado de eventos durante desconexión (idempotencia por `event_id`)

## 7. Vector de pruebas compartido (paridad edge/servidor)

- [ ] 7.1 Formato JSON de `test/fixtures/decision-vectors/*.json`
- [ ] 7.2 Runner que ejecuta el vector contra el motor servidor (dominio)
- [ ] 7.3 Runner que ejecuta el vector contra el motor edge del `SimulatorAdapter`
- [ ] 7.4 CI falla ante cualquier divergencia entre ambos

## 8. Espejo en el servidor (NestJS)

- [ ] 8.1 Módulo `decision` que reutiliza la función pura del dominio
- [ ] 8.2 Endpoint de evaluación en línea (< 500 ms p95) para operación remota
- [ ] 8.3 Métricas de latencia (Prometheus)

## 9. Validación OpenSpec

- [ ] 9.1 `openspec validate add-dual-decision-engine --strict` en verde
- [ ] 9.2 Cobertura de todos los scenarios por tests
