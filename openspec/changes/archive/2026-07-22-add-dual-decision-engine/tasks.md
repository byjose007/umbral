## 1. Contrato de decisión (dominio)

- [x] 1.1 Definir `DecisionInput`, `Decision`, `GrantReason`, `DenyReason`,
      `LocalAccessState`
- [x] 1.2 Implementar `evaluate(input): Decision` como función **pura** (sin I/O)
- [x] 1.3 Reglas de denegación: ausencia, credencial bloqueada/caducada, fuera de
      horario, documento vencido
- [x] 1.4 Tests unitarios por cada `reason_code`

## 2. Compilador de matriz de acceso

- [x] 2.1 `CompiledAccessMatrix` plana por controlador con `matrix_version` monótona
- [x] 2.2 Compilar niveles de acceso × horarios × estado de persona (empleo +
      ausencias + documentos + credencial) a la matriz
- [x] 2.3 Puertos hacia `identity`/`credentials`/`access-rights` con dobles de
      prueba (aún no implementados)
- [x] 2.4 Tests del compilador (persona bloqueada no aparece autorizada)

## 3. Horarios y feriados

- [x] 3.1 Evaluación de ventanas horarias por día de semana
- [x] 3.2 Aplicación de calendario de feriados y excepciones
- [x] 3.3 Tests de borde (fin de franja, feriado, cambio de día)

## 4. Anti-passback, viaje imposible e interlock

- [x] 4.1 APB `hard` / `soft` / `timed` contra estado cacheado
- [x] 4.2 Detección de `credential.impossible_travel` (emitir hecho, no bloquear)
- [x] 4.3 Reserva de interlock por controlador (alcance MVP)

## 5. Coacción (duress)

- [x] 5.1 PIN de coacción: concede acceso + marca `silentAlarm = 'duress'`
- [x] 5.2 Test: ninguna diferencia perceptible en la salida del lector

## 6. Modo offline y buffer

- [x] 6.1 Implementar `offline_mode` (`cached`/`deny_all`/`allow_known`/`unlocked`)
- [x] 6.2 Bufferizado de eventos durante desconexión (idempotencia por `event_id`)

## 7. Vector de pruebas compartido (paridad edge/servidor)

- [x] 7.1 Formato JSON de `test/fixtures/decision-vectors/*.json`
- [x] 7.2 Runner que ejecuta el vector contra el motor servidor (dominio)
- [x] 7.3 Runner que ejecuta el vector contra el motor edge del `SimulatorAdapter`
- [x] 7.4 CI falla ante cualquier divergencia entre ambos

## 8. Espejo en el servidor (NestJS)

- [x] 8.1 Módulo `decision` que reutiliza la función pura del dominio
- [x] 8.2 Endpoint de evaluación en línea (< 500 ms p95) para operación remota
- [x] 8.3 Métricas de latencia (Prometheus)

## 9. Validación OpenSpec

- [x] 9.1 `openspec validate add-dual-decision-engine --strict` en verde
- [x] 9.2 Cobertura de todos los scenarios por tests
