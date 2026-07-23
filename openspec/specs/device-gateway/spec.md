# device-gateway Specification

## Purpose
TBD - created by archiving change add-device-gateway. Update Purpose after archive.
## Requirements
### Requirement: Transporte seguro por dispositivo

El sistema SHALL comunicar servidor y controladores mediante MQTT sobre mTLS, con un
certificado por controlador y control de acceso por dispositivo en el broker, sobre
una red sin ruta a internet.

#### Scenario: Controlador con certificado propio

- **DADO** un controlador provisto con su certificado
- **CUANDO** se conecta al broker
- **ENTONCES** el broker lo autentica y le permite publicar solo en sus tópicos

#### Scenario: Certificado revocado

- **CUANDO** se revoca el certificado de un controlador comprometido
- **ENTONCES** ese controlador deja de conectarse
- **Y** los demás controladores siguen operando normalmente

### Requirement: Provisioning de controladores

El sistema SHALL exigir un proceso de alta (commissioning) que provea el certificado
del controlador antes de admitirlo en el bus, de modo que ningún dispositivo no
provisto pueda incorporarse.

#### Scenario: Dispositivo no provisto es rechazado

- **CUANDO** un dispositivo sin proceso de alta intenta conectarse
- **ENTONCES** el sistema lo rechaza y registra el intento

### Requirement: Empuje y reconciliación de la matriz de acceso

El sistema SHALL empujar al controlador la matriz de acceso compilada con una
versión monótona, y SHALL reenviarla cuando el controlador reporte una versión
anterior a la vigente.

#### Scenario: Controlador atrasado se actualiza

- **DADO** un controlador que reporta una `matrix_version` anterior a la vigente
- **CUANDO** el gateway recibe su heartbeat
- **ENTONCES** el gateway le reenvía la matriz vigente

### Requirement: Ingesta idempotente con store-and-forward

El sistema SHALL recibir los eventos de los controladores de forma idempotente por
`event_id`, y SHALL reintegrar sin pérdida ni duplicados los eventos que el
controlador bufferizó durante una desconexión.

#### Scenario: Reconexión sin duplicados

- **DADO** un controlador que estuvo sin conexión y bufferizó eventos
- **CUANDO** reconecta y reenvía su buffer
- **ENTONCES** el sistema integra los eventos nuevos
- **Y** descarta los que ya había recibido por su `event_id`

### Requirement: Salud del controlador como señal continua

El sistema SHALL recibir heartbeats periódicos con firmware, batería, tamper y
deriva de reloj, y SHALL emitir `device.offline` cuando la ausencia de heartbeat
supere el umbral configurado.

#### Scenario: Controlador caído genera alarma

- **DADO** un controlador que deja de emitir heartbeat
- **CUANDO** se supera el umbral de ausencia
- **ENTONCES** el sistema emite `device.offline`
- **Y** no queda en silencio

### Requirement: Disciplina de reloj y alerta de deriva

El sistema SHALL disciplinar el reloj de los controladores por NTP y SHALL alertar
cuando la deriva respecto al servidor supere dos segundos.

#### Scenario: Deriva de reloj detectada

- **CUANDO** un controlador reporta una deriva mayor a dos segundos
- **ENTONCES** el sistema emite una alerta de deriva de reloj para ese controlador

