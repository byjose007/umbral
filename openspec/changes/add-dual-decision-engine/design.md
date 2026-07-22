## Context

Dos motores evalúan la misma pregunta —¿esta credencial puede abrir esta puerta
ahora?— en dos lugares distintos: el controlador (offline, autoridad real) y el
servidor (espejo, auditoría y compilación). El diseño gira en torno a evitar que
diverjan y a que la decisión local sea rápida y autosuficiente.

## Goals

- Función de decisión **pura y determinista**: mismas entradas ⇒ misma salida.
- < 300 ms en el edge, sin red; < 500 ms p95 en el servidor.
- Paridad demostrable entre edge y servidor mediante un vector de pruebas único.

## Non-goals

- El transporte de la matriz y de los eventos (lo cubre `device-gateway`).
- La generación de alertas (el motor **emite** hechos como `duress` o
  `impossible_travel`; `alerting` decide qué hacer con ellos).

## Decisiones

### D1 — Contrato de decisión puro

```typescript
// domain/decision/access-decision.ts
export interface DecisionInput {
  readonly credentialHash: Uint8Array;
  readonly doorId: DoorId;
  readonly readerId: ReaderId;
  readonly at: Instant;                 // hora del controlador (RTC/NTP)
  readonly localState: LocalAccessState; // matriz + APB + ocupación cacheados
  readonly presentedPin?: string;        // multifactor / duress
}

export type Decision =
  | { kind: 'granted'; reasonCode: GrantReason; silentAlarm?: 'duress' }
  | { kind: 'denied'; reasonCode: DenyReason };

export function evaluate(input: DecisionInput): Decision; // pura, sin I/O
```

`DenyReason` incluye al menos: `ABSENCE_ACTIVE`, `CREDENTIAL_BLOCKED`,
`CREDENTIAL_EXPIRED`, `OUT_OF_SCHEDULE`, `DOCUMENT_EXPIRED`, `APB_VIOLATION`,
`UNKNOWN_CREDENTIAL`, `INTERLOCK_BLOCKED`.

### D2 — La matriz cacheada es la fuente local de verdad

El servidor **compila** niveles de acceso × horarios × estado de persona en una
`CompiledAccessMatrix` plana por controlador, con una `matrix_version` monótona. El
controlador no razona sobre grupos ni herencia: consulta una estructura ya resuelta.
Esto mantiene la lógica edge simple y auditable, y permite que el firmware ESP32
(Fase 2) la ejecute con recursos limitados.

### D3 — El estado laboral y las ausencias son derivados, no banderas

El acceso "permitido" de una persona se calcula de: periodo de empleo vigente +
ausencias que bloquean + documentos requeridos vigentes + credencial activa. El
compilador aplica esto al construir la matriz; el edge solo ve el resultado
(credencial presente o ausente en la matriz vigente, con sus ventanas horarias).

### D4 — Modo offline configurable por controlador

`offline_mode ∈ { cached, deny_all, allow_known, unlocked }`. `cached` (por defecto)
decide con la última matriz conocida. La elección es política del cliente por zona y
se audita. Nunca contradice el free egress: la salida sigue siendo mecánica.

### D5 — Anti-passback y viaje imposible

APB se evalúa contra el estado de ocupación/último paso cacheado. `hard` deniega la
segunda entrada sin salida; `soft` concede pero marca; `timed` se resetea tras
`apb_reset_sec`. El viaje imposible se detecta cuando la misma credencial aparece en
dos lectores cuya distancia es incompatible con el tiempo transcurrido; el motor
**emite el hecho**, no bloquea necesariamente (lo decide `alerting`).

### D6 — Coacción (duress)

Un PIN de coacción concede el acceso (para no poner en riesgo a la persona) y a la
vez marca la decisión con `silentAlarm: 'duress'`, que aguas abajo dispara una
alarma silenciosa. La concesión y la alarma son la misma decisión atómica.

### D7 — Vector de pruebas compartido (garantía de paridad)

`test/fixtures/decision-vectors/*.json` describe entradas y la decisión esperada. La
suite del dominio (servidor) **y** la del motor edge (ejecutado en el simulador, y
en Fase 2 en el firmware) corren el **mismo** vector. Un caso nuevo se añade una vez
y protege ambos motores. Cualquier divergencia rompe CI.

## Riesgos y mitigaciones

- **Deriva de reloj entre controlador y servidor** rompe horarios y auditoría → RTC
  con batería + disciplina NTP; alerta `device.clock_drift` si supera 2 s (esto se
  materializa en `device-gateway`/`alerting`, pero el contrato de decisión usa la
  hora del controlador como autoridad local).
- **Matriz desactualizada tras cambios de permisos** → `matrix_version` y
  reconciliación al reconectar; mientras tanto, `cached` es explícito y auditado.

## Open questions

- ¿La regla de dos personas y el interlock se resuelven íntegramente en el edge o
  requieren coordinación entre controladores? Para el MVP se asume alcance por
  controlador; multi-controlador se difiere.
