## 1. Almacenamiento inmutable

- [x] 1.1 Hypertable `access_events` (TimescaleDB); solo INSERT
- [x] 1.2 Encadenamiento por hash por cadena/controlador
- [x] 1.3 Continuous aggregates para flujo por hora y por puerta

## 2. Taxonomía de eventos

- [x] 2.1 Enum de tipos con severidad base y campos por tipo
- [x] 2.2 `access.granted`/`access.denied` con dirección y `reason_code`
- [x] 2.3 `door.forced_open`, `door.held_open`, `door.opened`, `door.closed`
- [x] 2.4 `input.active`/`input.inactive`, `input.fault`/`input.fault_cleared`
- [x] 2.5 `rex.activated`, `device.tamper`, `device.offline`, `fire.release_detected`

## 3. Integridad

- [x] 3.1 Operación de verificación de cadena que identifica el primer eslabón roto
- [x] 3.2 Emisión de evento crítico ante ruptura de cadena
- [x] 3.3 Tests: una modificación simulada rompe la verificación

## 4. Retención

- [x] 4.1 Mecanismo de purga automática por tipo de dato (parametrizado por compliance)

## 5. Validación OpenSpec

- [x] 5.1 `openspec validate add-events-and-audit --strict` en verde

