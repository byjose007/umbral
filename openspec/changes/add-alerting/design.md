## Context

`alerting` no genera hechos: los consume. Su valor es filtrar, priorizar y no
repetir. La diferencia entre "muro de 577 eventos" y "tres cosas que importan" vive
aquí.

## Decisiones

### D1 — Reglas sobre un flujo tipado, no sobre texto

Como la taxonomía de `events-audit` es cerrada y tipada, las reglas se expresan
sobre tipos y campos, no sobre cadenas. Una regla es condición + alcance + severidad
+ deduplicación + escalado + canales.

### D2 — Deduplicación y escalado explícitos

Una puerta que rebota su contacto no debe generar cien alertas. Cada regla define
una ventana de deduplicación y una escalada (a quién y en cuánto tiempo si nadie
reconoce). El objetivo es que el operador vea señal, no repetición.

### D3 — Pre-alarma local antes que alarma remota

El DHO tiene una pre-alarma en el propio lector (zumbador) unos segundos antes de
elevar el evento, para que la logística legítima (una camilla cruzando) no dispare
una alarma real.

### D4 — Feed seudonimizado por defecto

El feed en vivo muestra puerta, tipo de evento, severidad y hora, y **seudonimiza a
la persona** (p. ej. un identificador corto) por defecto. Revelar nombre y
credencial es una acción explícita que queda auditada (quién consultó a quién),
alineado con `compliance` DP-06. Esto contrasta con los PACS clásicos, que muestran
nombre y número de tarjeta en claro en el log.

## Non-goals

- Enviar los mensajes (eso es `notifications`; aquí se decide qué y a quién).
- La retención del feed (eso es `events-audit`/`compliance`).
