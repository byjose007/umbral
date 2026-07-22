## Context

La topología es la capa sobre la que se apoya todo el sistema. Las decisiones aquí
tienen consecuencias de seguridad de vida (§2 de `project.md`), así que se diseñan
con dos redes de seguridad: invariantes de dominio (código) **y** restricciones
`CHECK` en la base de datos. Si una capa falla, la otra sostiene.

## Goals

- Modelar la instalación física sin acoplarse a ningún fabricante de controlador.
- Hacer **imposible por construcción** una configuración de puerta insegura.
- Permitir operar sin hardware real mediante un `SimulatorAdapter`.

## Non-goals

- Decidir accesos (eso es `decision-engine`).
- Hablar MQTT real con controladores (eso es `device-gateway`).

## Decisiones

### D1 — El perfil de cerradura es un Value Object, no un enum de "tipo de puerta"

El requisito del cliente "todos los parámetros configurables" se cumple modelando
la actuación como un perfil, no como un tipo cerrado. Una `Door` referencia un
`LockProfile`; el mismo perfil se reutiliza entre puertas equivalentes.

```typescript
// domain/topology/lock-profile.vo.ts
export const LockActuationMode = {
  PULSE: 'pulse',           // cerraderos, torniquetes, barreras
  MAINTAINED: 'maintained', // maglocks
  TOGGLE: 'toggle',         // desbloqueo programado
} as const;

export const FailState = {
  FAIL_SAFE: 'fail_safe',     // sin energía → ABIERTA (obligatorio en evacuación)
  FAIL_SECURE: 'fail_secure', // sin energía → CERRADA (solo zonas críticas)
} as const;

export interface LockProfile {
  readonly id: LockProfileId;
  readonly name: string;
  readonly actuationMode: LockActuationMode;
  readonly pulseDurationMs: number;      // 100–10000, solo PULSE
  readonly unlockWindowMs: number;       // solo MAINTAINED
  readonly failState: FailState;
  readonly relayInverted: boolean;
  readonly hasDoorPositionSensor: boolean;
  readonly hasRexInput: boolean;
  readonly hasTamperInput: boolean;
  readonly heldOpenTimeoutSec: number | null;  // null si no hay DPS
  readonly heldOpenPrewarnSec: number | null;
  readonly rexGraceSec: number;                // default 8
  readonly isEgressRoute: boolean;
  readonly releasesOnFire: boolean;
}
```

**Invariantes del VO** (rechazan la construcción si no se cumplen):
- `isEgressRoute ⇒ failState === FAIL_SAFE`
- `isEgressRoute ⇒ releasesOnFire === true`
- `!hasDoorPositionSensor ⇒ heldOpenTimeoutSec === null`
- `actuationMode === PULSE ⇒ 100 ≤ pulseDurationMs ≤ 10000`

### D2 — Los mismos invariantes viven en la base de datos

No confiamos solo en el dominio: un `INSERT` directo o una migración futura no
deben poder crear un perfil inseguro.

```sql
CONSTRAINT chk_egress_failsafe
  CHECK (NOT is_egress_route OR fail_state = 'fail_safe'),
CONSTRAINT chk_egress_fire_release
  CHECK (NOT is_egress_route OR releases_on_fire),
CONSTRAINT chk_dho_needs_sensor
  CHECK (has_dps OR held_open_timeout_sec IS NULL)
```

Y para lectores Wiegand (§3.4 de la especificación):

```sql
CONSTRAINT chk_wiegand_risk
  CHECK (protocol <> 'wiegand' OR risk_accepted_by IS NOT NULL)
```

### D3 — `DoorControllerPort` en el dominio; `SimulatorAdapter` primero

El puerto se define en el dominio de topología/decisión y lo implementan los
adaptadores de infraestructura. El primero es el simulador: puertas en memoria que
emiten `RawDeviceEvent` por un `Observable`, permitiendo la demo y los tests E2E
sin hardware. Suprema/ZKTeco/ESP32 llegan como adaptadores posteriores sin tocar
el dominio.

### D4 — Configuración versionada, no sobrescrita

Cada cambio de configuración crea una nueva versión con `changed_by`, `changed_at`
y `reason`. Los cambios sobre campos de seguridad de vida (`fail_state`,
`is_egress_route`, `releases_on_fire`) exigen un segundo aprobador distinto del
autor. Esto se modela como un pequeño flujo de aprobación local, no como edición
directa de la fila.

## Riesgos y mitigaciones

- **Sensores DPS inexistentes en sitio** → detectado en Fase 0. Si el cliente no
  los paga, `hasDoorPositionSensor = false` y la alerta de puerta abierta
  simplemente no existe para esa puerta (queda documentado, no roto).
- **Parque instalado Wiegand/125 kHz** → se admite solo en modo migración con
  aceptación de riesgo firmada y auditada; se reporta por escrito como hallazgo.

## Open questions

- ¿El interlock (esclusa) se modela como grupo de zonas o como relación
  puerta-puerta? Se difiere a `access-rights`/`decision-engine`; aquí solo se
  reserva `interlock_group` en `zones`.
