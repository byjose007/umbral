## Why

El fallo de seguridad número uno en instalaciones reales es que la baja de un
empleado despedido depende de que alguien entre al panel a bloquearlo. Los PACS
enterprise resuelven esto con un servicio que vigila una fuente de RRHH e importa
altas y bajas automáticamente (en la referencia observada, "Import Watcher"). UMBRAL
adopta ese patrón, simple: una carpeta/endpoint vigilado que sincroniza personas y
vínculos laborales desde RRHH, alimentando el estado de acceso derivado de
`identity` para que el deprovisioning ocurra sin intervención humana.

## What Changes

- **Nueva capacidad `hris-sync`**: importador que vigila una fuente de RRHH (CSV por
  carpeta/SFTP programado, o API/LDAP) y sincroniza personas y periodos de empleo.
- **Alta, baja y actualización automáticas**; la baja cierra el periodo de empleo y
  dispara el bloqueo derivado.
- **Conciliación idempotente** por `external_ref` y reporte de discrepancias.

## Impact

- **Specs afectadas**: `hris-sync` (nueva).
- **Código afectado**: `src/infra/hris-sync/**`, watcher + parser + conciliador.
- **Depende de**: `identity` (personas y periodos de empleo).
- **Habilita**: deprovisioning automático real (VB-02, VB-03).
