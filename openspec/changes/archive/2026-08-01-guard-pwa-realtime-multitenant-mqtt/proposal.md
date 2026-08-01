## Why

Una investigación sobre el guard-pwa (apps/guard) encontró que decidía accesos de forma
aislada (HMAC + lista negra local) sin pasar por el motor de decisión real, con un
secreto de credenciales único y global compartido por cualquier organización, y sin
conexión real al bus de dispositivos ya provisionado (EMQX). Esto dejaba tres huecos
concretos: sin anti-passback real en el canal humano, sin aislamiento entre
organizaciones (un guardia podía validar/forjar credenciales de otra empresa), y sin
lectores de hardware físicos conectados pese a existir el broker y los puertos de
dominio ya diseñados.

## What Changes

- guard-pwa pasa de offline-first puro a **online-first con fallback offline
  automático**: valida contra el mismo motor `evaluateAccess`/`evaluateAPB` que usaría
  un lector de hardware (mismo `doorId`/`zoneId`, mismo estado de anti-passback
  compartido), y solo cae al HMAC local si la llamada de red falla.
- Anti-passback real y compartido entre canales: el estado (`lastPassState`) pasa a
  vivir en el servidor, no en el cliente que llama.
- Nuevo compilador de matriz de acceso (identity + credentials + access-rights →
  `CompiledAccessMatrix`) — antes no existía para ningún lector, ni siquiera físico.
- Foto de la persona enrolada visible en pantalla al escanear (permitido o denegado),
  para mitigar el préstamo de credenciales QR entre personas.
- Nueva capa `Organization` sobre `Site`: el secreto que firma/verifica credenciales
  QR pasa de ser global a ser por-organización. Compatible hacia atrás vía una
  organización por defecto sembrada automáticamente.
- Conexión MQTT real al broker EMQX ya provisionado (`docker-compose.yml`):
  ingesta de eventos/heartbeats y publicación de matriz/comandos reemplazan al
  simulador REST como camino real para dispositivos físicos (cambio de
  implementación, no de requisito — ver nota abajo).

## Capabilities

### New Capabilities
- `multi-tenant`: modelo de Organización sobre Site, con secreto de credenciales
  aislado por organización y asignación de operadores a una organización.

### Modified Capabilities
- `guard-pwa`: la verificación deja de ser exclusivamente offline — se añade
  verificación en tiempo real contra el motor de decisión (con anti-passback real) y
  visualización de foto del portador; el modo offline queda como fallback explícito
  y visible para el guardia, no como el único modo.
- `topology`: la jerarquía gana un nivel `Organization` por encima de `Site`; cada
  sitio pertenece a exactamente una organización.

`device-gateway` NO se lista aquí: sus requisitos (transporte MQTT, reconciliación
de matriz, mTLS por certificado) no cambian — este change implementa el transporte
MQTT que el requisito ya exigía, pero el requisito de mTLS sigue siendo la meta
declarada y aún no está satisfecho (ver Impact). No hay texto de requisito que
modificar; el hueco queda registrado como trabajo pendiente, no como cambio de spec.

## Impact

- **Código**: `packages/core/src/domain/topology/` (Organization, Site, Zone, Reader,
  DoorControllerPort sin cambios), `packages/core/src/domain/identity/` (Person.photoUrl),
  `packages/core/src/domain/auth/` (Operator.organizationId), `apps/api/src/modules/{guard-pwa,
  decision,access-matrix,topology,auth,device-gateway}/`, `apps/guard/src/app/home/`.
- **APIs nuevas**: `POST /guard/verify-realtime`, `POST/GET /topology/organizations`,
  `POST /device-gateway/controllers/:id/matrix`.
- **Dependencias nuevas**: `mqtt` (MQTT.js) en `apps/api`.
- **No incluido en este change** (alcance explícitamente diferido, documentado como
  limitación conocida): aislamiento de datos por organización en el resto de la API
  (identity, credentials, access-rights, topology, alerting, events-audit, workflow,
  user-pass); PKI de mTLS por dispositivo (CA, emisión/revocación de certificados,
  ACL en el broker); selección de organización en `apps/user` (no tiene login real).
