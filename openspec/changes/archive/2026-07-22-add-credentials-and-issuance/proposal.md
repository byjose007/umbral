## Why

El cliente pidió "QR, NFC o RFID". Detrás de esas tres palabras hay decisiones de
seguridad que definen si el sistema es serio o clonable en segundos. UMBRAL adopta
DESFire EV2/EV3 y QR dinámico firmado como estándar, prohíbe 125 kHz y MIFARE
Classic, y **nunca almacena el número de credencial en claro** — solo su hash. Esto
último es además una ventaja de privacidad frente a los PACS del mercado, que
muestran el número de tarjeta y el nombre en claro en sus registros.

Una persona puede tener **N credenciales** de distinto tipo, cada una con su ciclo
de vida: emisión, extravío, bloqueo inmediato, temporal, caducidad, reemplazo. Y
existe el código de coacción (duress): un PIN alterno que concede el acceso y a la
vez dispara una alarma silenciosa.

## What Changes

- **Nueva capacidad `credentials`**: credenciales de tipo `mifare_desfire`,
  `nfc_phone`, `qr_dynamic`, `qr_single_use`, `pin`.
- **Almacenamiento solo por hash** (`credential_hash`), nunca el número en claro.
- **Ciclo de vida completo**: emisión, vigencia efectiva, bloqueo con motivo,
  caducidad, reemplazo; N credenciales por persona.
- **QR dinámico firmado** (JWT corto ES256 + nonce + rotación) verificable offline.
- **Código de coacción (duress)** por credencial.
- **Prohibición de tecnologías clonables**; Wiegand/125 kHz solo bajo riesgo aceptado
  (heredado de `topology`).

## Impact

- **Specs afectadas**: `credentials` (nueva).
- **Código afectado**: `src/domain/credentials/**`, `src/db/schema/credentials.ts`,
  verificación ES256 compartida con la PWA.
- **Depende de**: `identity` (persona).
- **Habilita**: `decision-engine` (matriz), `guard-pwa` (verificación de QR offline).
