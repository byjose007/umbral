# alerting Specification

## Purpose
TBD - created by archiving change add-alerting. Update Purpose after archive.
## Requirements
### Requirement: Motor de reglas sobre eventos

El sistema SHALL evaluar reglas sobre el flujo tipado de eventos, donde cada regla
define condición, alcance, severidad, deduplicación, escalado y canales, produciendo
alertas cuando la condición se cumple.

#### Scenario: Regla de puerta forzada

- **DADO** una regla activa para `door.forced_open` con severidad de alarma
- **CUANDO** se registra ese evento en una puerta dentro del alcance de la regla
- **ENTONCES** el sistema genera una alerta de esa severidad

### Requirement: Deduplicación de alertas

El sistema SHALL deduplicar alertas repetidas dentro de la ventana configurada por
la regla, de modo que un mismo evento rebotando no genere múltiples alertas
idénticas.

#### Scenario: Contacto que rebota

- **DADO** una regla con ventana de deduplicación
- **CUANDO** la misma condición se dispara varias veces dentro de la ventana
- **ENTONCES** el sistema mantiene una sola alerta activa
- **Y** no genera una alerta por cada repetición

### Requirement: Escalado por falta de reconocimiento

El sistema SHALL escalar una alerta no reconocida según la política de la regla,
notificando a un destinatario superior tras el tiempo configurado.

#### Scenario: Nadie reconoce a tiempo

- **DADO** una alerta con escalado a los cinco minutos
- **CUANDO** transcurre ese tiempo sin reconocimiento
- **ENTONCES** el sistema escala la alerta al siguiente destinatario

### Requirement: Pre-alarma local de puerta abierta

El sistema SHALL permitir configurar una pre-alarma local (zumbador en el lector)
que se active unos segundos antes de elevar el evento de puerta abierta, para no
alarmar por aperturas legítimas breves.

#### Scenario: Camilla cruzando

- **DADO** una puerta con pre-alarma configurada
- **CUANDO** la puerta permanece abierta acercándose al umbral
- **ENTONCES** el lector emite la pre-alarma local
- **Y** si la puerta se cierra antes del umbral, no se genera alerta de puerta
  abierta

### Requirement: Alerta de falla de línea supervisada

El sistema SHALL generar una alerta cuando se registre `input.fault` en una entrada
supervisada, tratándola como posible manipulación física de un sensor.

#### Scenario: Sensor manipulado alerta

- **CUANDO** se registra `input.fault` en un contacto supervisado
- **ENTONCES** el sistema genera una alerta de seguridad para esa entrada

### Requirement: Feed de actividad en vivo seudonimizado

El sistema SHALL presentar un feed de actividad en tiempo real, filtrable por
severidad y sitio, que seudonimice a la persona por defecto; revelar el nombre y la
credencial SHALL ser una acción explícita que queda auditada.

#### Scenario: El feed no expone PII por defecto

- **CUANDO** un operador observa el feed en vivo
- **ENTONCES** cada evento muestra puerta, tipo, severidad y hora
- **Y** la persona aparece seudonimizada, sin nombre ni número de credencial

#### Scenario: Revelar identidad queda auditado

- **DADO** un operador con permiso para revelar identidad
- **CUANDO** solicita ver a quién corresponde un evento
- **ENTONCES** el sistema muestra la identidad
- **Y** registra quién consultó a quién y cuándo

