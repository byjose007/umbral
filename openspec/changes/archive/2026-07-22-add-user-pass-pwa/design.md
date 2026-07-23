## Context

El Pase Móvil del Usuario es el punto de contacto principal entre el usuario y la seguridad física. Debe garantizar autenticación segura, privacidad, disponibilidad total en subsuelos y evitar la clonación o compartir credenciales ilegítimamente.

## Decisiones

### D1 — Autenticación e Inicio de Sesión (Login & Biometría)
La PWA exige inicio de sesión inicial con credenciales corporativas / cédula y vinculación de un PIN de 4 dígitos o biometría local (TouchID / FaceID / WebAuthn). Durante este login se aprovisiona y descarga la semilla criptográfica local de forma cifrada.

### D2 — Historial Personal de Accesos y Pases
El usuario dispone de un historial personal en tiempo real que le muestra sus últimas marcaciones (entradas y salidas por puerta con estado concedido/denegado) y el registro de pases de visitantes emitidos por él (estado activo, consumido o vencido).

### D3 — Generación Offline mediante Criptografía HMAC/TOTP Local
La PWA descarga e instala un contenedor de semillas cifradas en WebCrypto/LocalStorage. Esto permite calcular tokens dinámicos válidos cada 30 segundos usando la hora del sistema sin realizar llamadas HTTP al servidor.

### D4 — Firma ES256 / HMAC con OTP de Un Solo Uso
Cada token generado vence a los 30 segundos y contiene un identificador único de uso. Si alguien le toma foto a la pantalla del celular y trata de enviarla por chat, el token vencerá antes de que otra persona pueda usarlo.

### D5 — Protección Anti-Screenshot Dinámica
La interfaz incluye una marca de agua animada con fecha, hora en milisegundos y un patrón de color en movimiento detrás del QR. Cualquier captura estática es evidente a simple vista para la guardia.

### D6 — Emisión Integrada de Pases de Visitantes
El usuario puede crear credenciales temporales con restricciones de fecha, hora y número máximo de usos, generando una URL o imagen QR lista para compartir por WhatsApp o correo electrónico.

### D7 — Coacción Silenciosa
Al presionar el botón de pánico de la app o ingresar el PIN de coacción, la PWA genera un QR que visualmente luce idéntico a un pase válido, pero cuyo payload contiene el flag de coacción que dispara la alarma en la central de seguridad.

## Non-goals

- Impresión física de carnets (cubierto en `credentials`).

