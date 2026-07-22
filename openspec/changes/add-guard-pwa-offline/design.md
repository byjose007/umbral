## Context

La PWA es el punto donde "funciona sin red" deja de ser un eslogan y se prueba. El
diseño asume desconexión como caso normal, no como excepción.

## Decisiones

### D1 — Offline-first real, no "modo degradado"

Service Worker + SQLite local guardan la ACL relevante, la CRL y el estado de
ocupación necesario para el muster. La verificación de QR es local por clave pública
(ES256) — no consulta al servidor. Al reconectar, se sincroniza.

### D2 — El muster se deriva de datos que ya existen

Quién está dentro ahora se calcula del estado de ocupación (entradas/salidas)
sincronizado; el muster es una vista de eso, disponible sin red. No requiere ningún
dato nuevo: es "gratis" a partir de anti-passback/ocupación.

### D3 — Seudonimización coherente

La PWA respeta la misma regla que el feed: por defecto seudonimiza; revelar
identidad es acción auditada. En una evacuación, el muster puede requerir nombres:
ese modo es un permiso explícito y auditado, no el estado por defecto.

## Non-goals

- App nativa de tienda (la PWA/Capacitor cubre el MVP).
- Lectura NFC en iOS sin entitlements (se decide en Fase 0; QR es el mínimo común).
