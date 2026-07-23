## Context

La PWA de guardia es el centro de control operativo y de emergencias en campo. Asume desconexión de red como el estado normal y esperado.

## Decisiones

### D1 — Offline-First Real para Garitas y Patrullaje
Service Worker + SQLite/IndexedDB guardan la CRL (lista de revocación) y la ocupación del sitio. La verificación de QR por cámara se ejecuta localmente mediante la clave pública ES256 sin llamar al servidor.

### D2 — Muster Roll de Evacuación Derivado Offline (Emergencias)
El conteo de ocupantes dentro del sitio se calcula del estado de ocupación/Anti-Passback sincronizado en la PWA del guardia. En un terremoto o incendio, el guardia genera el reporte de evacuación (Muster roll) en un clic sin red, listo para exportar a PDF/CSV o imprimir en el punto de encuentro.

### D3 — Validación Manual & Contingencia en Garita
Si falla un lector físico de $54 o se corta un cable de red, el guardia puede buscar al empleado por documento/foto en su PWA y autorizar la apertura de garita, quedando registrado en la auditoría.

### D4 — Seudonimización LOPDP DP-06 por Defecto
La consola del guardia muestra identidades seudonimizadas por defecto (`USR-XXXXXX`). Revelar nombre y cédula en emergencias es una acción explícita auditada.

## Non-goals

- Generación de pases para usuarios finales (cubierto en `add-user-pass-pwa`).
