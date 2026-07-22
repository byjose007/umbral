## ADDED Requirements

### Requirement: Registro de eventos append-only encadenado por hash

El sistema SHALL registrar todo evento de acceso de forma append-only, sin permitir
UPDATE ni DELETE, con encadenamiento criptográfico donde cada evento incorpora el
hash del anterior de su cadena.

#### Scenario: Un evento no puede alterarse sin romper la cadena

- **DADO** una secuencia de eventos encadenados
- **CUANDO** se altera o elimina un evento intermedio
- **ENTONCES** el recálculo de la cadena deja de coincidir a partir de ese punto

### Requirement: Verificación de integridad de la cadena

El sistema SHALL ofrecer una operación de verificación que recorra la cadena y, si
detecta una ruptura, emita una alerta crítica identificando el primer eslabón roto.

#### Scenario: Ruptura detectada e identificada

- **DADO** una cadena con un eslabón manipulado
- **CUANDO** se ejecuta la verificación
- **ENTONCES** el sistema emite una alerta crítica
- **Y** señala el primer eslabón donde la verificación falla

### Requirement: Eventos de decisión de acceso con dirección y razón

El sistema SHALL registrar cada decisión como `access.granted` o `access.denied`,
incluyendo la puerta, el lector, la dirección (entrada/salida), la persona y la
credencial cuando apliquen, y el `reason_code` en las denegaciones.

#### Scenario: Admisión con dirección

- **CUANDO** una credencial es admitida en un lector de entrada
- **ENTONCES** el sistema registra `access.granted` con dirección de entrada, puerta,
  persona y credencial referenciada por identificador interno

#### Scenario: Denegación con razón

- **CUANDO** el motor deniega un acceso
- **ENTONCES** el sistema registra `access.denied` con su `reason_code`

### Requirement: Eventos de puerta derivados del sensor de posición

El sistema SHALL registrar `door.opened`, `door.closed`, `door.forced_open` y
`door.held_open` a partir del contacto de posición, y SHALL no generarlos para
puertas sin sensor de posición.

#### Scenario: Puerta forzada

- **DADO** una puerta cuyo contacto abre sin concesión previa ni REX en la ventana
  de gracia
- **CUANDO** el sensor reporta la apertura
- **ENTONCES** el sistema registra `door.forced_open`

#### Scenario: Puerta sin DPS no genera eventos de puerta

- **DADO** una puerta sin contacto de posición
- **CUANDO** se concede un acceso en ella
- **ENTONCES** el sistema no registra `door.opened` ni `door.closed` para esa puerta

### Requirement: Falla de línea supervisada como evento

El sistema SHALL registrar `input.fault` cuando una entrada supervisada detecte
corte o puenteo de su cable, y `input.fault_cleared` cuando la condición se
normalice, de modo que la manipulación física de un sensor no pase inadvertida.

#### Scenario: Cable cortado se delata

- **DADO** un contacto de posición supervisado con EOL
- **CUANDO** se corta o puentea su cable
- **ENTONCES** el sistema registra `input.fault` para esa entrada

#### Scenario: Falla despejada

- **CUANDO** la entrada supervisada vuelve a un estado válido
- **ENTONCES** el sistema registra `input.fault_cleared`

### Requirement: Registro de activación de REX y liberación por incendio

El sistema SHALL registrar `rex.activated` cuando se accione el botón o sensor de
salida, y `fire.release_detected` cuando la entrada de incendio indique liberación,
sin que el software participe en la liberación misma.

#### Scenario: Salida legítima por REX

- **CUANDO** se acciona el REX de una puerta
- **ENTONCES** el sistema registra `rex.activated`
- **Y** la apertura del contacto dentro de la ventana de gracia no se marca como
  puerta forzada

#### Scenario: Liberación por incendio se registra

- **CUANDO** la entrada de incendio indica liberación
- **ENTONCES** el sistema registra `fire.release_detected` como constancia, sin haber
  intervenido en la liberación eléctrica
