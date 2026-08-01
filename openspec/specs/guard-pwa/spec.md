# guard-pwa Specification

## Purpose

Proporcionar al guardia de seguridad en garita o patrullaje la capacidad operativa offline-first para verificar pases dinámicos mediante clave pública y CRL local, gestionar contingencias manuales con auditoría, generar reportes de evacuación Muster roll en emergencias, y atender alertas seudonimizadas bajo LOPDP DP-06.

## Requirements

### Requirement: Verificación en tiempo real con anti-passback y fallback offline

El sistema SHALL verificar el QR dinámico del guardia en tiempo real contra el motor
de decisión de acceso compartido (incluyendo anti-passback por zona), usando la
puerta y zona reales del punto de control del guardia, y SHALL caer
automáticamente a verificación offline (firma HMAC + CRL sincronizada localmente)
únicamente cuando la verificación en tiempo real no responde, señalizando de forma
visible al guardia que está operando en modo degradado.

#### Scenario: QR válido verificado en tiempo real

- **DADO** un guardia autenticado con un punto de control (lector) asignado
- **CUANDO** escanea un QR dinámico vigente de una persona con acceso permitido a
  esa puerta en ese horario
- **ENTONCES** el sistema evalúa la solicitud contra el motor de decisión y confirma
  el acceso

#### Scenario: Reentrada sin salida es denegada por anti-passback

- **DADO** una credencial que ya registró entrada por una puerta cuya zona tiene
  anti-passback activo, sin salida registrada
- **CUANDO** la misma credencial se escanea de nuevo en esa zona
- **ENTONCES** el sistema deniega el acceso según el modo de anti-passback
  configurado
- **Y** el mismo estado de anti-passback aplica sin importar si la reentrada la
  detecta el guardia o un lector de hardware

#### Scenario: Sin conexión, cae a verificación offline

- **DADO** una PWA con la clave y la CRL sincronizadas localmente
- **CUANDO** la llamada de verificación en tiempo real no responde
- **ENTONCES** la PWA verifica localmente con firma HMAC y CRL
- **Y** muestra al guardia una indicación visible de que está en modo sin conexión

#### Scenario: Credencial revocada rechazada offline

- **DADO** una credencial presente en la CRL sincronizada
- **CUANDO** se escanea su QR sin red
- **ENTONCES** la PWA rechaza el acceso

### Requirement: Foto del portador visible al escanear

El sistema SHALL mostrar la foto de la persona enrolada en la pantalla del guardia
al momento del escaneo, tanto en accesos permitidos como denegados, para que el
guardia pueda comparar visualmente contra quien presenta la credencial y así
dificultar el préstamo de credenciales entre personas.

#### Scenario: Foto visible en escaneo exitoso

- **DADO** una persona enrolada con foto registrada
- **CUANDO** su QR es escaneado y el acceso resulta permitido
- **ENTONCES** la pantalla del guardia muestra su foto junto al resultado

#### Scenario: Foto visible también en escaneo denegado

- **DADO** una persona enrolada con foto registrada
- **CUANDO** su QR es escaneado y el acceso resulta denegado por cualquier motivo
- **ENTONCES** la pantalla del guardia igual muestra su foto junto al resultado

### Requirement: Muster funcional sin red

El sistema SHALL producir, sin conexión y en un clic, el listado de quién se
encuentra dentro en ese momento, exportable e imprimible, para uso en evacuaciones.

#### Scenario: Muster durante una evacuación sin red

- **DADO** una PWA con el estado de ocupación sincronizado y sin red
- **CUANDO** el guardia solicita el muster
- **ENTONCES** la PWA muestra el listado de personas dentro
- **Y** permite exportarlo o imprimirlo

### Requirement: Consulta seudonimizada por defecto

El sistema SHALL presentar la consulta de persona y las alarmas activas con la
identidad seudonimizada por defecto, revelando nombre y credencial solo como acción
auditada.

#### Scenario: Alarma sin PII por defecto

- **CUANDO** el guardia ve una alarma activa
- **ENTONCES** la persona aparece seudonimizada
- **Y** revelar su identidad queda registrado como consulta auditada
