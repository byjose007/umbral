## Why

El guardia en garita necesita trabajar aunque la red se caiga: escanear un QR,
verificar quién es una persona, ver las alarmas activas y —lo más importante en una
emergencia— sacar el **reporte de evacuación (muster)** de quién está dentro ahora,
en un clic, sin servidor. Una PWA offline-first cubre esto sin app nativa, y el
muster offline es probablemente el diferenciador comercial más potente del proyecto.

## What Changes

- **Nueva capacidad `guard-pwa`**: PWA de guardia offline-first (Ionic + Capacitor).
- **Escaneo y verificación de QR sin conexión** (clave pública ES256 local).
- **Consulta de persona** con seudonimización coherente con `alerting`/`compliance`.
- **Alarmas activas** en el dispositivo del guardia.
- **Muster offline**: listado de quién está dentro, imprimible/exportable, funcional
  sin red, con CRL (lista de revocación) sincronizada.

## Impact

- **Specs afectadas**: `guard-pwa` (nueva).
- **Código afectado**: app Ionic/Capacitor, Service Worker, SQLite local, WebCrypto.
- **Depende de**: `credentials` (verificación QR), `events-audit` (base del muster),
  `alerting` (alarmas), `compliance` (seudonimización).
