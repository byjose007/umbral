## 1. Autenticación & Núcleo PWA

- [ ] 1.1 Inicio de sesión seguro con PIN / Biometría (WebAuthn) y provisión de semilla
- [ ] 1.2 Generación de QR dinámico firmado con rotación cada 30 segundos y temporizador circular
- [ ] 1.3 Almacenamiento seguro de semillas criptográficas en WebCrypto/LocalStorage para uso offline sin señal
- [ ] 1.4 Fondo con marca de agua dinámica y timestamp animado anti-captura de pantalla

## 2. Historial & Visitantes

- [ ] 2.1 Historial personal de marcaciones (entradas/salidas) y permisos de horario
- [ ] 2.2 Formulario de emisión de pases temporales para invitados y registro de pases emitidos
- [ ] 2.3 Generador de enlaces e imágenes QR compartibles por WhatsApp / Email
- [ ] 2.4 Modo de coacción silenciosa (generación de QR con flag de alerta de pánico)

## 3. Inspección & Servicio API

- [ ] 3.1 Inspector de accesos autorizados (consulta de puertas y ventanas de horario)
- [ ] 3.2 Servicio API NestJS `/pwa-mobile/user-pass` y `/pwa-mobile/visitor-pass`

## 4. Validación OpenSpec

- [ ] 4.1 `openspec validate add-user-pass-pwa --strict` en verde

