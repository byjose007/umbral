## Why

Las alertas no sirven si no llegan a quien debe actuar. Notifications entrega los
avisos por WhatsApp (Cloud API directa), email y Web Push, con plantillas por idioma
y destinatarios por rol, respetando el escalado que define `alerting`.

## What Changes

- **Nueva capacidad `notifications`**: canales WhatsApp/email/Web Push con plantillas
  y destinatarios por rol.
- **Cola con reintentos** (BullMQ) e idempotencia de envío.
- **Plantillas por idioma** y por tipo de alerta.

## Impact

- **Specs afectadas**: `notifications` (nueva).
- **Código afectado**: `src/infra/notifications/**`, workers BullMQ.
- **Depende de**: `alerting` (qué y a quién).
