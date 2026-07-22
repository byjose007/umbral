## ADDED Requirements

### Requirement: Múltiples credenciales por persona

El sistema SHALL permitir que una persona tenga varias credenciales activas de
distinto tipo simultáneamente, cada una con su propia vigencia y estado.

#### Scenario: Persona con tarjeta y QR

- **DADO** un empleado con una credencial `mifare_desfire` activa
- **CUANDO** se le emite además una credencial `qr_dynamic`
- **ENTONCES** ambas quedan activas y utilizables de forma independiente

### Requirement: Almacenamiento solo por hash

El sistema SHALL almacenar únicamente el hash de la credencial (`credential_hash`) y
SHALL no persistir ni exponer el número de credencial en claro en ninguna respuesta,
log o reporte.

#### Scenario: El número en claro nunca se persiste

- **CUANDO** se emite una credencial a partir de su número
- **ENTONCES** el sistema guarda solo su hash
- **Y** ninguna consulta posterior devuelve el número original

#### Scenario: Los logs no filtran el número

- **CUANDO** se genera un evento asociado a una credencial
- **ENTONCES** el evento referencia la credencial por identificador interno, no por
  su número en claro

### Requirement: Bloqueo inmediato con motivo

El sistema SHALL permitir bloquear una credencial de forma inmediata registrando el
motivo y el instante, de modo que deje de conceder acceso a partir de ese momento.

#### Scenario: Extravío bloquea la credencial

- **DADO** una credencial activa reportada como extraviada
- **CUANDO** un administrador la bloquea
- **ENTONCES** el sistema marca `blocked_at` y el motivo
- **Y** el motor de decisión la deniega en adelante

### Requirement: Vigencia efectiva de la credencial

El sistema SHALL respetar `valid_from` y `valid_until` de cada credencial, de modo
que fuera de esa ventana la credencial no conceda acceso.

#### Scenario: Credencial temporal caduca sola

- **DADO** una credencial con `valid_until` a fin de mes
- **CUANDO** pasa esa fecha
- **ENTONCES** la credencial deja de conceder acceso sin acción manual

### Requirement: QR dinámico firmado verificable offline

El sistema SHALL emitir credenciales `qr_dynamic` como tokens cortos firmados
(ES256) con nonce y rotación periódica, verificables por clave pública sin conexión
al servidor.

#### Scenario: Verificación offline de un QR válido

- **DADO** un guardia con la clave pública sincronizada y sin conexión
- **CUANDO** escanea un QR dinámico vigente
- **ENTONCES** la PWA verifica la firma localmente y confirma la validez

#### Scenario: QR expirado se rechaza

- **CUANDO** se presenta un QR dinámico cuyo tiempo de rotación ya venció
- **ENTONCES** la verificación falla y no se concede acceso

### Requirement: Código de coacción por credencial

El sistema SHALL permitir configurar, para credenciales con PIN, un código de
coacción distinto del PIN normal, cuya presentación concede el acceso y marca la
decisión para alarma silenciosa.

#### Scenario: PIN de coacción concede y alarma

- **DADO** una credencial con PIN normal y PIN de coacción
- **CUANDO** se presenta el PIN de coacción
- **ENTONCES** el sistema concede el acceso
- **Y** marca la decisión para que se dispare una alarma silenciosa
