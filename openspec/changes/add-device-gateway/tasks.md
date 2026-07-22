## 1. Transporte

- [ ] 1.1 Cliente EMQX (MQTT 5) sobre mTLS; tópicos por controlador
- [ ] 1.2 ACL por dispositivo en el broker
- [ ] 1.3 Provisioning: alta de controlador con emisión de certificado

## 2. Matriz y reconciliación

- [ ] 2.1 Empuje de `CompiledAccessMatrix` con `matrix_version`
- [ ] 2.2 Reconciliación por versión reportada en heartbeat

## 3. Ingesta

- [ ] 3.1 Recepción de eventos con idempotencia por `event_id`
- [ ] 3.2 Store-and-forward: reintegración del buffer al reconectar

## 4. Salud y reloj

- [ ] 4.1 Heartbeat con firmware/batería/tamper/deriva
- [ ] 4.2 Detección de `device.offline` por ausencia de heartbeat
- [ ] 4.3 Sincronización de reloj (NTP) y alerta de deriva > 2 s

## 5. Adaptadores

- [ ] 5.1 `SimulatorAdapter` sobre el gateway
- [ ] 5.2 Contrato de adaptador para Suprema/ZKTeco/ESP32 (implementación posterior)

## 6. Validación OpenSpec

- [ ] 6.1 `openspec validate add-device-gateway --strict` en verde
