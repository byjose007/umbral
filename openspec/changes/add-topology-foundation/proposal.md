## Why

UMBRAL necesita un cimiento antes de cualquier decisión de acceso: el modelo físico
de la instalación (sitios, zonas, puertas, controladores, lectores) y —lo más
importante— el **perfil de cerradura** que codifica cómo actúa cada puerta y qué
garantías de seguridad de vida ofrece.

Este cimiento no es un CRUD cualquiera. Es donde viven los invariantes que impiden
configurar una instalación insegura: una puerta en ruta de evacuación **no puede**
ser `fail_secure`, una alerta de "puerta abierta" **no puede** existir sin un
sensor de posición físico, y un lector Wiegand **no puede** entrar en servicio sin
aceptación explícita de riesgo. Codificar esto primero —en el dominio y en la base
de datos— convierte la seguridad de vida en algo que el sistema **hace cumplir**,
no en algo que se documenta y se olvida.

Además, esta capa habilita el `SimulatorAdapter`: puertas virtuales que abren, se
quedan trabadas y disparan alertas en pantalla. Es lo que permite la **demo
comercial sin llevar un solo cable** a la reunión (hito de la semana 4).

## What Changes

- **Nueva capacidad `topology`**: sitios, zonas (con jerarquía y reglas de zona),
  perfiles de cerradura, controladores, puertas y lectores.
- **Perfil de cerradura como Value Object configurable** (modo de actuación,
  fail-state, temporizaciones DHO/DFO, sensores presentes) en lugar de un "tipo de
  puerta" hardcodeado.
- **Invariantes de seguridad de vida** codificados en el dominio y como `CHECK` en
  Postgres: egress ⇒ fail-safe, egress ⇒ libera por incendio, DHO ⇒ requiere DPS,
  Wiegand ⇒ requiere aceptación de riesgo firmada.
- **Configuración versionada y auditada** con doble aprobación para cambios de
  seguridad de vida.
- **`DoorControllerPort`** definido en el dominio + **`SimulatorAdapter`** como
  primera implementación (sin hardware).
- Esquema Drizzle + migraciones para las tablas de topología, y semilla de
  configuración exportable/importable (JSON versionado).

## Impact

- **Specs afectadas**: `topology` (nueva).
- **Código afectado**: `src/domain/topology/**`, `src/domain/ports/door-controller.port.ts`,
  `src/infra/adapters/simulator/**`, `src/db/schema/topology.ts`, migraciones.
- **Depende de**: nada (es el cimiento). Habilita `decision-engine`,
  `device-gateway`, `access-rights`.
- **Fuera de alcance de este change**: personas/credenciales (`identity`),
  evaluación de acceso (`decision-engine`), ingesta MQTT real (`device-gateway`).
