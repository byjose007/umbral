## Why

Los controladores deciden en la puerta, pero necesitan recibir la matriz de acceso
compilada, entregar sus eventos y ser vigilados. Ese puente es el gateway de
dispositivos: MQTT 5 sobre mTLS, con un certificado por controlador, sobre una VLAN
aislada sin salida a internet. Un controlador caído debe **generar alarma, no
silencio**, y su reloj debe estar disciplinado por NTP o la auditoría no vale nada.

## What Changes

- **Nueva capacidad `device-gateway`**: ingesta MQTT/mTLS, empuje de la matriz de
  acceso compilada, heartbeat y salud del controlador, sincronización de reloj.
- **Provisioning/commissioning**: alta de un controlador con certificado; sin eso
  nadie enchufa un dispositivo al bus.
- **Store-and-forward**: recuperación de eventos bufferizados sin pérdida ni
  duplicados (idempotencia por `event_id`).
- **Detección de deriva de reloj** y de dispositivo caído.
- **Adaptadores por fabricante** detrás de `DoorControllerPort` (Simulator primero).

## Impact

- **Specs afectadas**: `device-gateway` (nueva).
- **Código afectado**: `src/infra/device-gateway/**`, adaptadores, cliente EMQX.
- **Depende de**: `topology` (controladores), `decision-engine` (matriz compilada).
- **Habilita**: `events-audit` (recibe los eventos), `alerting` (dispositivo caído,
  deriva de reloj), `analytics` (salud/capacidad).
