## Why

La auditoría es el activo legal y comercial de UMBRAL: en un sistema de seguridad de
vida, "qué pasó, cuándo y quién decidió" no puede ser alterable. Todo evento es
**append-only y encadenado por hash**, de modo que borrar o modificar un eslabón se
detecta. Si la cadena se rompe, el sistema lo grita.

La taxonomía de eventos está validada contra un PACS enterprise real en operación
(C·CURE 9000 sobre iSTAR): admisión con dirección, puerta forzada, puerta abierta,
puerta abierta/cerrada, entrada activa/inactiva, **falla de línea supervisada**
(cable cortado o puenteado) y su despeje, activación de REX, tamper y liberación por
incendio. Incorporamos esos tipos como eventos de primera clase.

## What Changes

- **Nueva capacidad `events-audit`**: registro append-only de eventos en una
  hypertable TimescaleDB, encadenado por hash, con verificación de integridad.
- **Taxonomía de eventos** completa: `access.granted` / `access.denied` (con
  dirección y razón), `door.forced_open`, `door.held_open`, `door.opened`,
  `door.closed`, `input.active` / `input.inactive`, `input.fault` /
  `input.fault_cleared` (línea supervisada), `rex.activated`, `device.tamper`,
  `fire.release_detected`.
- **Verificación de cadena de hash** que identifica el primer eslabón roto.
- **Retención por tipo de dato con purga automática** (base de `compliance`).

## Impact

- **Specs afectadas**: `events-audit` (nueva).
- **Código afectado**: `src/domain/events/**`, hypertable + continuous aggregates,
  verificador de cadena.
- **Depende de**: `device-gateway` (recibe los eventos), `topology` (objetos).
- **Habilita**: `alerting`, `analytics`, `compliance`, `guard-pwa` (muster).
