## Context

Dos propiedades gobiernan este contexto: inmutabilidad (nunca UPDATE/DELETE) y
orden temporal a escala (millones de filas). TimescaleDB da lo segundo; el
encadenamiento por hash da lo primero de forma verificable.

## Decisiones

### D1 — Solo INSERT, encadenado por hash

Cada evento almacena el hash del evento anterior de su cadena. Recalcular la cadena
detecta cualquier borrado o modificación. La cadena es por controlador (o por
partición de cadena) para permitir verificación paralela y no serializar toda la
ingesta.

### D2 — La taxonomía es cerrada y tipada

Los tipos de evento son un conjunto enumerado, no texto libre. Esto permite
continuous aggregates fiables (flujo por hora, DHO por puerta) y evita el "muro de
texto" de los PACS clásicos. Cada tipo declara su severidad base y sus campos.

### D3 — Eventos derivados del sensor, no de la concesión

`door.opened`/`door.closed` provienen del contacto de posición (DPS), no de la
concesión de acceso. Sin DPS, esos eventos no existen para esa puerta (coherente
con `topology`). `input.fault`/`input.fault_cleared` provienen de la supervisión
EOL: son la señal de que alguien cortó o puenteó un cable.

### D4 — La verificación es una operación de primera clase

Verificar la integridad de la cadena no es un script suelto: es una operación que
cualquier auditor puede correr y que, si falla, emite un evento crítico
identificando el primer eslabón roto.

## Non-goals

- Decidir qué alertar (eso es `alerting`).
- La política de retención concreta por tipo (la fija `compliance`; aquí solo el
  mecanismo de purga).
