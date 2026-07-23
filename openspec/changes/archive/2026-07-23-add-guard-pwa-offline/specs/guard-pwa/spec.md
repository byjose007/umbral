# guard-pwa Specification

## Purpose

Proporcionar al guardia de seguridad en garita o patrullaje la capacidad operativa offline-first para verificar pases dinámicos mediante clave pública y CRL local, gestionar contingencias manuales con auditoría, generar reportes de evacuación Muster roll en emergencias, y atender alertas seudonimizadas bajo LOPDP DP-06.

## Requirements

### Requirement: Verificación de QR sin conexión

El sistema SHALL permitir al guardia escanear y verificar un QR dinámico firmado sin
conexión al servidor, validando la firma con la clave pública sincronizada
localmente.

#### Scenario: QR válido verificado offline

- **DADO** una PWA con la clave pública y la CRL sincronizadas, y sin red
- **CUANDO** el guardia escanea un QR dinámico vigente y no revocado
- **ENTONCES** la PWA confirma la validez localmente

#### Scenario: Credencial revocada rechazada offline

- **DADO** una credencial presente en la CRL sincronizada
- **CUANDO** se escanea su QR sin red
- **ENTONCES** la PWA rechaza el acceso

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
