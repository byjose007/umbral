## ADDED Requirements

### Requirement: Entrega multicanal de alertas

El sistema SHALL entregar notificaciones de alerta por WhatsApp, email y Web Push,
seleccionando canal y destinatarios según la configuración de la regla y el rol.

#### Scenario: Alerta crítica a seguridad

- **DADO** una alerta crítica cuya regla notifica al rol de seguridad por WhatsApp
- **CUANDO** se genera la alerta
- **ENTONCES** el sistema encola el mensaje a los destinatarios con rol de seguridad

### Requirement: Entrega fiable con reintentos e idempotencia

El sistema SHALL reintentar los envíos fallidos con backoff y SHALL no enviar dos
veces la misma notificación al mismo destinatario para la misma alerta.

#### Scenario: Reintento tras fallo transitorio

- **DADO** un envío que falla por un error transitorio del canal
- **CUANDO** el worker reintenta
- **ENTONCES** el mensaje se entrega
- **Y** el destinatario no recibe duplicados de esa alerta

### Requirement: Plantillas por idioma

El sistema SHALL seleccionar la plantilla del mensaje según el idioma del
destinatario y el tipo de alerta.

#### Scenario: Destinatario en español

- **CUANDO** se notifica a un destinatario cuyo idioma es español
- **ENTONCES** el sistema usa la plantilla en español para ese tipo de alerta
