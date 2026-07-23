## Why

El guardia en garita o patrullaje necesita operar al 100% sin conexión al servidor central: verificar pases manualmente en contingencia, atender alertas críticas y, lo más importante en una emergencia (terremoto/incendio), generar el **reporte de evacuación (muster offline)** de quién está dentro del edificio en un clic sin servidor.

## What Changes

- **Nueva capacidad `guard-pwa`**: PWA de guardia offline-first (Ionic + Capacitor).
- **Reporte de Evacuación Offline (Muster Roll)**: Conteo instantáneo de ocupantes (Presentes vs Evacuados) imprimible y exportable sin red.
- **Escaneo y Verificación de QR sin Conexión**: Validación local por clave pública ES256 y CRL (lista de revocación) en IndexedDB/SQLite.
- **Validación Manual & Liberación de Garita**: Búsqueda por cédula/foto en contingencia.
- **Feed de Alertas Activas & Seudonimización LOPDP DP-06**: Enmascaramiento de PII por defecto con botón auditado "Revelar Identidad".

## Impact

- **Specs afectadas**: `guard-pwa` (nueva).
- **Código afectado**: App PWA de guardia, Service Worker, SQLite/IndexedDB, NestJS API module.
- **Depende de**: `credentials` (verificación QR), `events-audit` (base de ocupación), `alerting` (alertas), `compliance` (seudonimización).
