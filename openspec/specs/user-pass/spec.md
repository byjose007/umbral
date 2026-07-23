# user-pass Specification

## Purpose
TBD - created by archiving change add-user-pass-pwa. Update Purpose after archive.
## Requirements
### Requirement: Autenticación de usuario con PIN / Biometría

El sistema SHALL exigir un proceso de autenticación e inicio de sesión con PIN o biometría local (WebAuthn / TouchID / FaceID) antes de desplegar el pase digital del usuario y permitir la generación de códigos QR.

#### Scenario: Inicio de sesión exitoso aprovisiona semilla offline

- **DADO** un usuario autenticado válidamente
- **CUANDO** inicia sesión en la PWA móvil
- **ENTONCES** la PWA almacena de forma segura la semilla criptográfica local en WebCrypto
- **Y** permite la generación de pases offline

### Requirement: Historial personal de marcaciones y pases emitidos

El sistema SHALL permitir al usuario consultar su historial personal de accesos recientes (entradas/salidas) y el listado de pases de visitantes emitidos por su cuenta.

#### Scenario: Consulta de historial personal

- **DADO** un usuario autenticado en su PWA
- **CUANDO** accede a la pestaña de historial
- **ENTONCES** el sistema muestra sus marcaciones recientes con fecha, hora, puerta y estado

### Requirement: Generación de QR dinámico del usuario sin conexión

El sistema SHALL permitir al usuario generar su QR dinámico de acceso firmado criptográficamente sin necesidad de conectividad celular activa, utilizando semillas pre-cacheadas localmente, con rotación automática de 30 segundos y marca de agua dinámica anti-captura de pantalla.

#### Scenario: Generación de QR en parqueadero subterráneo sin red

- **DADO** un usuario con la PWA instalada y semillas criptográficas cacheadas localmente, sin señal celular
- **CUANDO** abre la PWA del Pase de Usuario
- **ENTONCES** la aplicación genera un QR dinámico válido y firmado por ES256/HMAC
- **Y** rota automáticamente el código cada 30 segundos con marca de agua dinámica

### Requirement: Emisión de pases temporales para visitantes desde la app

El sistema SHALL permitir a un usuario autorizado emitir y compartir pases temporales QR para visitantes con límite de tiempo y número máximo de usos.

#### Scenario: Enviar pase de visita por WhatsApp

- **DADO** un usuario autenticado en su PWA
- **CUANDO** emite un pase de visitante para una fecha y rango de horas
- **ENTONCES** el sistema genera un QR firmado de visita listo para compartir por WhatsApp o Email

### Requirement: Coacción silenciosa desde el pase móvil

El sistema SHALL permitir al usuario activar una función de coacción que genere un QR de apariencia idéntica a su pase normal pero con payload de alerta silenciosa.

#### Scenario: Activación de coacción en puerta

- **CUANDO** el usuario presenta un QR generado bajo modo de coacción en el lector
- **ENTONCES** el sistema permite la apertura para no poner en riesgo al usuario
- **Y** emite una alerta silenciosa de coacción en la central de seguridad

