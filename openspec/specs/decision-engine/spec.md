# decision-engine Specification

## Purpose
TBD - created by archiving change add-dual-decision-engine. Update Purpose after archive.
## Requirements
### Requirement: Decisión de acceso local en el controlador

El sistema SHALL emitir la decisión de acceso en el controlador, usando su matriz
de acceso local, en menos de 300 ms desde la presentación de la credencial, sin
depender del servidor.

#### Scenario: Concesión offline dentro de horario

- **DADO** un controlador con matriz cacheada vigente y sin conexión al servidor
- **CUANDO** se presenta una credencial autorizada para esa puerta dentro de su
  ventana horaria
- **ENTONCES** el controlador concede el acceso en menos de 300 ms
- **Y** la decisión no requiere ninguna consulta al servidor

#### Scenario: Denegación por credencial desconocida

- **CUANDO** se presenta una credencial que no está en la matriz local
- **ENTONCES** el controlador deniega con `reason_code = UNKNOWN_CREDENTIAL`

### Requirement: Operación degradada según modo offline

El sistema SHALL continuar decidiendo mientras el controlador esté sin conexión,
según su `offline_mode` configurado (`cached`, `deny_all`, `allow_known`,
`unlocked`), y SHALL bufferizar los eventos generados durante la desconexión.

#### Scenario: Modo cached sin red

- **DADO** un controlador con `offline_mode = cached` y sin conexión
- **CUANDO** se presentan credenciales
- **ENTONCES** el controlador decide con la última matriz conocida
- **Y** almacena los eventos para envío diferido al reconectar

#### Scenario: Modo deny_all sin red

- **DADO** un controlador con `offline_mode = deny_all` y sin conexión
- **CUANDO** se presenta cualquier credencial
- **ENTONCES** el controlador deniega todo acceso mientras dure la desconexión

### Requirement: Denegación por ausencia vigente que bloquea

El sistema SHALL denegar todo acceso de las credenciales de una persona mientras
tenga una ausencia vigente con `blocks_access = true`, indicando
`reason_code = ABSENCE_ACTIVE`.

#### Scenario: Empleado de vacaciones

- **DADO** un empleado con una ausencia vigente que bloquea el acceso
- **CUANDO** presenta una credencial suya en cualquier lector
- **ENTONCES** el sistema deniega con `reason_code = ABSENCE_ACTIVE`
- **Y** el evento de denegación queda registrado sin borrar su histórico

### Requirement: Denegación por credencial fuera de vigencia o bloqueada

El sistema SHALL denegar el acceso cuando la credencial esté bloqueada o fuera de
su ventana `valid_from`/`valid_until`.

#### Scenario: Credencial bloqueada

- **CUANDO** se presenta una credencial con `blocked_at` informado
- **ENTONCES** el sistema deniega con `reason_code = CREDENTIAL_BLOCKED`

#### Scenario: Credencial caducada

- **CUANDO** se presenta una credencial cuyo `valid_until` ya pasó
- **ENTONCES** el sistema deniega con `reason_code = CREDENTIAL_EXPIRED`

### Requirement: Denegación fuera de horario

El sistema SHALL denegar el acceso cuando la credencial esté autorizada para la
puerta pero fuera de la ventana horaria de su nivel de acceso, considerando el
calendario de feriados aplicable.

#### Scenario: Acceso fuera de la franja permitida

- **DADO** un nivel de acceso que permite una puerta solo L–V de 07:00 a 19:00
- **CUANDO** se presenta la credencial un martes a las 22:00
- **ENTONCES** el sistema deniega con `reason_code = OUT_OF_SCHEDULE`

#### Scenario: Feriado bloquea una franja laboral

- **DADO** un horario laboral y un calendario de feriados que marca la fecha como
  feriado
- **CUANDO** se presenta la credencial en esa fecha dentro de la franja horaria
- **ENTONCES** el sistema aplica la regla de feriado configurada y deniega si el
  feriado no habilita el acceso

### Requirement: Anti-passback por zona

El sistema SHALL aplicar anti-passback según el modo de la zona: `hard` deniega una
segunda entrada sin salida registrada; `soft` concede pero marca la violación;
`timed` se reinicia tras `apb_reset_sec`.

#### Scenario: Anti-passback hard bloquea reentrada

- **DADO** una zona con `anti_passback = hard` y una credencial que ya registró
  entrada sin salida
- **CUANDO** la misma credencial intenta entrar de nuevo
- **ENTONCES** el sistema deniega con `reason_code = APB_VIOLATION`

#### Scenario: Anti-passback soft concede pero marca

- **DADO** una zona con `anti_passback = soft`
- **CUANDO** ocurre la misma reentrada
- **ENTONCES** el sistema concede el acceso
- **Y** registra la violación para reporte

### Requirement: Detección de viaje imposible

El sistema SHALL emitir el hecho `credential.impossible_travel` con severidad
crítica cuando una misma credencial se presente en dos lectores cuya distancia sea
físicamente incompatible con el tiempo transcurrido.

#### Scenario: Misma credencial en dos puntos incompatibles

- **DADO** dos lectores separados de forma que el trayecto requiere varios minutos
- **CUANDO** la misma credencial se presenta en ambos con segundos de diferencia
- **ENTONCES** el sistema emite `credential.impossible_travel`
- **Y** la decisión de conceder o denegar se resuelve según la política configurada

### Requirement: Código de coacción con alarma silenciosa

El sistema SHALL conceder el acceso cuando se presente un PIN de coacción válido y,
simultáneamente, marcar la decisión para que se emita una alarma silenciosa, sin
señalización visible para quien coacciona.

#### Scenario: PIN de coacción

- **DADO** una credencial con PIN normal y PIN de coacción configurados
- **CUANDO** se presenta el PIN de coacción
- **ENTONCES** el sistema concede el acceso
- **Y** marca la decisión con alarma silenciosa de coacción
- **Y** no muestra ninguna diferencia perceptible en el lector

### Requirement: Paridad entre motor edge y motor servidor

El sistema SHALL evaluar la misma decisión de forma idéntica en el controlador y en
el servidor ante las mismas entradas, y SHALL verificarlo mediante un vector de
pruebas compartido.

#### Scenario: El vector compartido produce la misma decisión en ambos motores

- **DADO** un caso del vector de pruebas de decisión con su entrada y su decisión
  esperada
- **CUANDO** se ejecuta ese caso contra el motor edge (simulador) y contra el motor
  del servidor
- **ENTONCES** ambos motores producen exactamente la misma decisión y el mismo
  `reason_code`

#### Scenario: Una divergencia rompe la validación

- **DADO** un cambio que hace divergir un motor del otro para algún caso del vector
- **CUANDO** corre la suite compartida
- **ENTONCES** la validación falla identificando el caso divergente

