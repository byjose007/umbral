## Why

UMBRAL registra movimientos de personas dentro de una instalación: eso es tratamiento
de datos personales, y en Ecuador la LOPDP tiene régimen sancionador vigente. El
cumplimiento no es un módulo opcional al final; es una capacidad transversal:
retención con purga automática, minimización, derechos ARCO, y segregación auditada
de consultas (quién consultó el recorrido de quién). Guardar todo para siempre es un
pasivo, no un activo.

## What Changes

- **Nueva capacidad `compliance`**: política de retención por tipo de dato con purga
  automática, minimización, derechos ARCO (exportar/rectificar/eliminar), y el
  registro de auditoría de consultas de PII.
- **Base de licitud y aviso de privacidad** para empleados y visitantes.
- **Segregación**: el detalle de recorrido/identidad requiere permiso y queda
  auditado (integra `alerting`, `analytics`, `guard-pwa`).

## Impact

- **Specs afectadas**: `compliance` (nueva).
- **Código afectado**: `src/domain/compliance/**`, jobs de purga, auditoría de acceso
  a PII.
- **Depende de**: `events-audit` (mecanismo de purga), `identity` (personas).
- **Habilita**: seudonimización coherente en toda la plataforma.
