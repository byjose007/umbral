## Context

Ver proposal.md - Why. Constraints técnicas relevantes descubiertas durante la
investigación:

- `apps/user` (quien genera el QR que el guardia escanea) no tiene login real contra
  la API — es un signal local hardcodeado (`currentUser`). No puede llevar `orgId`
  ni resolver secretos por organización.
- El motor de decisión puro (`evaluateAccess`/`evaluateAPB`,
  `packages/core/src/domain/decision/`) ya soportaba anti-passback por zona antes de
  este change; el hueco era que nada en `apps/api` lo alimentaba con datos reales ni
  compartía el estado de anti-passback entre canales.
- El broker MQTT (EMQX) ya estaba provisionado en `docker-compose.yml` y corriendo;
  no había cliente MQTT en ningún `package.json`.

## Goals / Non-Goals

**Goals:**
- Un solo motor de decisión para cualquier canal (guardia humano u hardware futuro),
  con anti-passback compartido.
- Aislamiento del secreto de credenciales entre organizaciones distintas.
- Camino MQTT real y verificado contra el broker existente.

**Non-Goals:**
- Aislamiento de datos por organización en el resto de la API (identity,
  credentials, access-rights, topology, alerting, events-audit, workflow,
  user-pass) — solo el secreto de credenciales queda aislado en este change.
- PKI de mTLS por dispositivo (CA, emisión/revocación de certificados, ACL en el
  broker) — el requisito de transporte de `device-gateway` ya lo exige; este change
  no lo satisface, solo implementa el transporte MQTT sobre el que correrá después.
- Selección de organización en `apps/user` — requiere login real ahí primero.

## Decisions

- **Anti-passback centralizado en `DecisionService`, no en el cliente**: el estado
  `lastPassState` vive en memoria en el servicio de decisión de `apps/api`, no en lo
  que el llamador envía. Alternativa descartada: que cada canal (guard-pwa, futuro
  hardware) mantenga su propio estado — se descartó explícitamente porque produce
  motores de anti-passback divergentes que un atacante puede explotar cruzando
  canales.
- **Compatibilidad hacia atrás vía organización por defecto**: `organizationId` es
  opcional en los DTOs de creación de sitio/operador, con default a una
  organización `org-default` sembrada automáticamente (mismo secreto que el literal
  legado). Alternativa descartada: hacerlo obligatorio en todos lados — habría roto
  `apps/console` y el flujo de `apps/user` sin darles una vía de login real primero.
- **Compilador de matriz de acceso como servicio nuevo, no como cambio al motor
  puro**: `AccessMatrixCompilerService` une identity+credentials+access-rights y
  llama al `compileAccessMatrix` ya existente — el motor de decisión
  (`packages/core/src/domain/decision/`) no se modifica.
- **MQTT sin mTLS por ahora**: se prioriza cablear el transporte real (pub/sub
  contra el broker existente) sobre construir la PKI completa, dado que son
  preocupaciones independientes y la PKI es un subsistema de seguridad grande por sí
  solo. El puerto de dominio (`DoorControllerPort`) no cambia — ya estaba bien
  diseñado para soportar cualquier transporte detrás.

## Risks / Trade-offs

- [Sin aislamiento de datos por organización fuera del secreto de credenciales] →
  Mitigación: documentado explícitamente como no-goal; cualquier extensión futura
  del modelo `Organization` para cubrir el resto de la API es un change aparte.
- [Transporte MQTT sin autenticación por certificado de dispositivo] → Mitigación:
  el requisito de mTLS permanece intacto en el spec de `device-gateway` como meta
  declarada; no se diluye el requisito, solo se reconoce como pendiente.
- [`apps/user` sigue usando el secreto de la organización por defecto sin poder
  elegir organización] → Mitigación: es el comportamiento actual sin cambios (no
  regresión); requiere login real en `apps/user` para resolverse, fuera de alcance.
