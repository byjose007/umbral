## Why

El usuario final (empleado, contratista o visitante) necesita su credencial digital en el smartphone de forma 100% segura y disponible aun sin conectividad móvil en parqueaderos o subsuelos. Esta PWA le permite autenticarse de forma segura (login con PIN/Biometría), presentar su QR dinámico en los lectores de pared de $54, consultar su historial personal de accesos, emitir pases temporales para sus visitantes y contar con protección anti-captura de pantalla y coacción silenciosa.

## What Changes

- **Capacidad `user-pass` completa**: PWA instalable de Pase Móvil del Usuario final.
- **Autenticación e Inicio de Sesión (Login)**: Inicio de sesión seguro con PIN / Biometría (WebAuthn / TouchID / FaceID) y descarga de semilla criptográfica.
- **Historial de Accesos y Pases**: Consulta del historial personal de marcaciones (entradas/salidas) y lista de pases de visitantes emitidos (activos, usados, vencidos).
- **QR Dinámico Rotativo (30 s)**: Generación con firma criptográfica ES256/HMAC y OTP de un solo uso.
- **Semillas Offline (WebCrypto / LocalStorage)**: Funcionamiento sin red celular ni Wi-Fi.
- **Protección Anti-Screenshot**: Marca de agua animada en tiempo real.
- **Emisión de Pases para Visitantes**: Generación y envío directo por WhatsApp / Email.
- **Modo Coacción Silenciosa**: Generación de QR de coacción que dispara alerta silenciosa sin delatar al usuario.
- **Inspector de Permisos**: Consulta de puertas y horarios autorizados.

## Impact

- **Specs afectadas**: `user-pass` (nueva).
- **Código afectado**: App PWA móvil, Service Worker, WebCrypto, `@umbral/core` credentials, NestJS API module.
- **Depende de**: `credentials` (generación y firma de QR), `identity` (datos de usuario), `access-rights` (horarios y permisos).

