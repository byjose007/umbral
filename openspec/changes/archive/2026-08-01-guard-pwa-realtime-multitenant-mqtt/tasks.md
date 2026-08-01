Nota: este change documenta trabajo ya implementado, probado y verificado
manualmente en la sesión que lo originó. Todas las tareas quedan marcadas como
completas.

## 1. guard-pwa: verificación en tiempo real + anti-passback

- [x] 1.1 Agregar protocolo `qr-camera` a `ReaderProtocol` y campos
      `apbMode`/`apbResetSec` a `Zone` (`packages/core/src/domain/topology/`)
- [x] 1.2 Agregar `assignedReaderId` a `Operator` (checkpoint del guardia)
- [x] 1.3 Crear `AccessMatrixCompilerService` (identity + credentials +
      access-rights → `CompiledAccessMatrix`), incluyendo conversión de horarios
      (`schedule-adapter.ts`)
- [x] 1.4 Hacer `DecisionService.evaluate` autoritativo para `lastPassState`
      (estado de anti-passback compartido en memoria, no provisto por el llamador)
- [x] 1.5 Nuevo endpoint `POST /guard/verify-realtime` en `guard-pwa`
- [x] 1.6 Guard app (Angular): `processScannedToken` online-first con fallback
      offline automático y badge visible de modo sin conexión
- [x] 1.7 Agregar `photoUrl` a `Person` y a `GuardOfflineVerificationResult`;
      mostrar foto en pantalla en escaneo permitido y denegado (online y offline)
- [x] 1.8 Tests: compilador de matriz, anti-passback server-side, endpoint
      realtime, foto en escaneo denegado
- [x] 1.9 Verificación manual E2E contra la API real

## 2. Multi-tenant núcleo

- [x] 2.1 Crear entidad `Organization` (`packages/core/src/domain/topology/`)
- [x] 2.2 `Site.organizationId` y `Operator.organizationId` requeridos a nivel de
      dominio, opcionales en los DTOs con default a `org-default`
- [x] 2.3 `TopologyService`: sembrar `org-default` (`OnModuleInit`), CRUD de
      organizaciones, validar `organizationId` en `createSite`
- [x] 2.4 `GuardPwaService`: resolver `seedSecret` por organización del operador
      autenticado en `getSyncData`, `verifyQR` y `verifyRealtime`
- [x] 2.5 Incluir `organizations` en export/import de topología
      (`config-export.ts`)
- [x] 2.6 Tests: aislamiento de credenciales entre organizaciones (token firmado
      con el secreto de una organización es rechazado en otra)
- [x] 2.7 Verificación manual E2E: organización nueva con secreto distinto,
      confirmado por HTTP real

## 3. device-gateway: MQTT real

- [x] 3.1 Agregar dependencia `mqtt` a `apps/api`
- [x] 3.2 Crear `MqttClientService` (conexión al broker, publish/subscribe
      genéricos)
- [x] 3.3 Crear `MqttDoorControllerAdapter` implementando `DoorControllerPort`
      sobre MQTT real (ingesta de events/heartbeat, publicación de
      matrix/commands)
- [x] 3.4 Caché de matriz por controlador en `DeviceGatewayService` y endpoint
      `POST /device-gateway/controllers/:id/matrix`
- [x] 3.5 Reconciliación automática: heartbeat con versión atrasada dispara
      republicación de la matriz cacheada
- [x] 3.6 Test de integración contra el broker EMQX real (no mockeado)
- [x] 3.7 Verificación manual E2E con clientes MQTT externos
      (`mosquitto_pub`/`mosquitto_sub`)

## 4. Documentación

- [x] 4.1 Crear change retroactivo de OpenSpec con proposal, specs delta, design
      y tasks
- [x] 4.2 Archivar el change para sincronizar los specs principales
      (`guard-pwa`, `topology`, `multi-tenant`)
