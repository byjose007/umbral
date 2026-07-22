## Why

La decisión de acceso es el corazón de UMBRAL y el punto donde el sistema se vuelve
seguridad de vida. Si esa decisión depende del servidor, una caída de red paraliza
la instalación y encierra personas. Por eso la evaluación debe ocurrir **en el
controlador, offline**, con una matriz de acceso cacheada, y el servidor debe ser un
**espejo** que compila esa matriz, la audita y decide igual cuando está en línea.

Que existan dos motores (edge y servidor) crea un riesgo: que diverjan. Una persona
autorizada por el servidor pero rechazada por el controlador —o al revés— es un
fallo de seguridad. Por eso este change define un **contrato de decisión único** y
un **vector de pruebas compartido** que ambos motores deben satisfacer con
resultados idénticos.

## What Changes

- **Nueva capacidad `decision-engine`**: contrato de evaluación de acceso que toma
  una credencial, una puerta, un instante y el estado local, y devuelve una decisión
  (`granted` / `denied`) con `reason_code`.
- **Decisión local-first**: el controlador decide con su matriz cacheada en < 300 ms
  sin red; el servidor evalúa la misma lógica como espejo en línea.
- **Compilador de matriz de acceso**: el servidor traduce niveles de acceso +
  horarios + estado de persona a una matriz plana que se empuja al controlador.
- **Reglas de denegación**: ausencia vigente que bloquea, credencial fuera de
  vigencia o bloqueada, fuera de horario, documento vencido.
- **Anti-passback** (off/soft/hard/timed) y **viaje imposible** (misma credencial en
  dos lectores incompatibles en el tiempo).
- **Código de coacción (duress)**: PIN alterno que concede acceso y a la vez emite
  una alarma silenciosa.
- **Modo offline configurable** por controlador (`cached` / `deny_all` /
  `allow_known` / `unlocked`) y **vector de pruebas compartido** (fixtures JSON)
  que valida paridad edge/servidor.

## Impact

- **Specs afectadas**: `decision-engine` (nueva).
- **Código afectado**: `src/domain/decision/**`, `src/domain/decision/matrix-compiler.ts`,
  fixtures compartidos `test/fixtures/decision-vectors/**`, mirror en el módulo
  NestJS `decision`.
- **Depende de**: `topology` (puertas, perfiles, controladores). Consume, cuando
  existan, `identity`/`credentials`/`access-rights` a través de puertos; en este
  change se define el contrato con dobles de prueba.
- **Habilita**: `device-gateway` (empuje de matriz e ingesta de decisiones),
  `alerting` (duress, viaje imposible), `analytics`.
- **Fuera de alcance**: transporte MQTT real (eso es `device-gateway`) y el firmware
  ESP32 (Fase 2); aquí el motor edge se valida contra el mismo vector en el
  simulador.
