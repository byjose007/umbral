## 1. Verificación Offline & Contingencia

- [x] 1.1 Verificación offline de QR por cámara con clave pública ES256 y CRL local en SQLite/IndexedDB
- [x] 1.2 Búsqueda manual por documento y fotografía en contingencia con liberación de garita

## 2. Muster Roll & Alertas

- [x] 2.1 Reporte de evacuación (Muster roll offline) en 1-clic imprimible/exportable
- [x] 2.2 Feed de alertas activas con reconocimiento (ACK) y seudonimización LOPDP DP-06

## 3. Servicio API & Persistencia

- [x] 3.1 Esquema Drizzle `muster_snapshots` y `guard_override_logs`
- [x] 3.2 Servicio API NestJS para sincronización de ocupación y registro de acciones de guardia

## 4. Validación OpenSpec

- [x] 4.1 `openspec validate add-guard-pwa-offline --strict` en verde
