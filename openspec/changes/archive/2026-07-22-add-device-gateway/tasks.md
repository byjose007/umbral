## 1. Transporte

- [x] 1.1 Cliente EMQX (MQTT 5) sobre mTLS; tópicos por controlador
- [x] 1.2 ACL por dispositivo en el broker
- [x] 1.3 Provisioning: alta de controlador con emisión de certificado

## 2. Matriz y reconciliación

- [x] 2.1 Empuje de `CompiledAccessMatrix` con `matrix_version`
- [x] 2.2 Reconciliación por versión reportada en heartbeat

## 3. Ingesta

- [x] 3.1 Recepción de eventos con idempotencia por `event_id`
- [x] 3.2 Store-and-forward: reintegración del buffer al reconectar

## 4. Salud y reloj

- [x] 4.1 Heartbeat con firmware/batería/tamper/deriva
- [x] 4.2 Detección de `device.offline` por ausencia de heartbeat
- [x] 4.3 Sincronización de reloj (NTP) y alerta de deriva > 2 s

## 5. Adaptadores

- [x] 5.1 `SimulatorAdapter` sobre el gateway
- [x] 5.2 Contrato de adaptador para Suprema/ZKTeco/ESP32 (implementación posterior)

## 6. Validación OpenSpec

- [x] 6.1 `openspec validate add-device-gateway --strict` en verde

