# topology Specification

## Purpose
TBD - created by archiving change add-topology-foundation. Update Purpose after archive.
## Requirements
### Requirement: Modelo de instalación física

El sistema SHALL permitir modelar la instalación como una jerarquía de
organizaciones, sitios, zonas, puertas, controladores y lectores, de modo que cada
sitio pertenezca a exactamente una organización y cada puerta pertenezca a un sitio
y esté gobernada por exactamente un controlador y un perfil de cerradura.

#### Scenario: Alta de un sitio con su zona raíz

- **DADO** un administrador con permiso de configuración de topología
- **CUANDO** crea un sitio con código único y zona horaria
- **ENTONCES** el sistema persiste el sitio y permite colgar zonas de él
- **Y** el código del sitio es único dentro de la instalación

#### Scenario: Todo sitio pertenece a una organización

- **DADO** una organización existente
- **CUANDO** se crea un sitio asociado a esa organización
- **ENTONCES** el sistema rechaza el alta si la organización indicada no existe
- **Y** un sitio sin organización explícita queda asociado a la organización por
  defecto

#### Scenario: Jerarquía de zonas

- **DADO** un sitio existente
- **CUANDO** se crea una zona con `parent_id` apuntando a otra zona del mismo sitio
- **ENTONCES** el sistema acepta la relación jerárquica padre-hija
- **Y** rechaza una zona cuyo `parent_id` pertenezca a otro sitio

#### Scenario: Una puerta referencia controlador y perfil

- **CUANDO** se crea una puerta
- **ENTONCES** el sistema exige un `controller_id`, un `lock_profile_id` y una
  `zone_inside_id` válidos
- **Y** rechaza la puerta si falta cualquiera de las tres referencias

### Requirement: Perfil de cerradura configurable

El sistema SHALL modelar la actuación de cada puerta como un perfil de cerradura
configurable (modo de actuación, fail-state, temporizaciones y sensores presentes),
en lugar de un tipo de puerta fijo, de modo que "todos los parámetros" sean
ajustables sin cambiar código.

#### Scenario: Perfil de pulso con duración válida

- **CUANDO** se crea un perfil con `actuation_mode = pulse` y `pulse_duration_ms`
  dentro del rango 100–10000
- **ENTONCES** el sistema acepta el perfil

#### Scenario: Duración de pulso fuera de rango

- **CUANDO** se intenta crear un perfil con `actuation_mode = pulse` y
  `pulse_duration_ms = 50`
- **ENTONCES** el sistema rechaza la creación indicando el rango permitido

### Requirement: Puerta de evacuación debe ser fail-safe

El sistema SHALL rechazar toda configuración de perfil que declare
`is_egress_route = true` junto con `fail_state = fail_secure`, tanto a nivel de
dominio como mediante restricción en la base de datos.

#### Scenario: Intento de configurar evacuación como fail-secure

- **CUANDO** un administrador intenta guardar un perfil con `is_egress_route = true`
  y `fail_state = fail_secure`
- **ENTONCES** el sistema rechaza el cambio con un error de invariante de seguridad
  de vida
- **Y** ninguna fila se persiste

#### Scenario: Evacuación fail-safe válida

- **CUANDO** el perfil declara `is_egress_route = true` y `fail_state = fail_safe`
- **ENTONCES** el sistema acepta el perfil

### Requirement: Puerta de evacuación debe liberar por incendio

El sistema SHALL rechazar todo perfil con `is_egress_route = true` que declare
`releases_on_fire = false`, garantizando que toda ruta de evacuación libere ante la
señal de la central de incendios.

#### Scenario: Ruta de evacuación sin liberación por incendio

- **CUANDO** se intenta guardar un perfil con `is_egress_route = true` y
  `releases_on_fire = false`
- **ENTONCES** el sistema rechaza el cambio
- **Y** registra el intento en el audit log

### Requirement: Alerta de puerta abierta requiere sensor de posición

El sistema SHALL permitir configurar un `held_open_timeout_sec` únicamente cuando
la puerta declara tener sensor de posición (`has_dps = true`). Sin sensor, la
alerta de puerta abierta no puede configurarse.

#### Scenario: Timeout sin sensor de posición

- **CUANDO** se intenta crear un perfil con `has_dps = false` y un
  `held_open_timeout_sec` distinto de null
- **ENTONCES** el sistema rechaza la configuración
- **Y** explica que la alerta de puerta abierta necesita un contacto magnético (DPS)

#### Scenario: Puerta sin DPS no genera alerta de puerta abierta

- **DADO** un perfil con `has_dps = false`
- **CUANDO** se consulta su capacidad de alertas
- **ENTONCES** la alerta de puerta abierta figura como no disponible para esa puerta

### Requirement: OSDP Secure Channel obligatorio; Wiegand solo con riesgo aceptado

El sistema SHALL adoptar OSDP con Secure Channel como protocolo estándar de lector
y SHALL rechazar dar de alta un lector `wiegand` salvo que exista una aceptación de
riesgo registrada (`risk_accepted_by` y `risk_accepted_at`).

#### Scenario: Lector Wiegand sin aceptación de riesgo

- **CUANDO** se intenta crear un lector con `protocol = wiegand` sin
  `risk_accepted_by`
- **ENTONCES** el sistema rechaza el alta

#### Scenario: Lector Wiegand en modo migración documentado

- **CUANDO** se crea un lector `wiegand` con `risk_accepted_by` y `risk_accepted_at`
  informados
- **ENTONCES** el sistema acepta el alta
- **Y** el lector queda marcado como migración con riesgo aceptado, visible en la
  consola

#### Scenario: Lector OSDP estándar

- **CUANDO** se crea un lector con `protocol = osdp` y las tecnologías admitidas
- **ENTONCES** el sistema lo acepta sin exigir aceptación de riesgo

### Requirement: Configuración versionada, auditada y con doble aprobación en seguridad de vida

El sistema SHALL tratar cada entidad de configuración como versionada y auditada,
y SHALL exigir un segundo aprobador —distinto del autor del cambio— para
modificaciones sobre campos de seguridad de vida (`fail_state`, `is_egress_route`,
`releases_on_fire`).

#### Scenario: Cambio de fail-state exige segundo aprobador

- **DADO** un perfil existente en producción
- **CUANDO** un administrador propone cambiar `fail_state`
- **ENTONCES** el cambio queda pendiente hasta que un segundo aprobador distinto lo
  confirme
- **Y** la versión resultante registra autor, aprobador, fecha y motivo

#### Scenario: Cambio no crítico se versiona sin doble aprobación

- **CUANDO** un administrador cambia el `name` de un perfil
- **ENTONCES** el sistema crea una nueva versión con autor, fecha y motivo
- **Y** no exige segundo aprobador

### Requirement: Operación sin hardware mediante SimulatorAdapter

El sistema SHALL ofrecer una implementación de `DoorControllerPort` en modo
simulador que permita ejercitar apertura, puerta trabada y alertas sobre puertas
virtuales, sin hardware físico, para demos y pruebas E2E.

#### Scenario: Apertura de una puerta virtual

- **DADO** un sitio con puertas configuradas contra el `SimulatorAdapter`
- **CUANDO** un operador ordena abrir una puerta
- **ENTONCES** el simulador emite el evento de apertura correspondiente
- **Y** la consola refleja el cambio de estado de la puerta

#### Scenario: Puerta virtual trabada dispara alerta

- **DADO** una puerta virtual con `held_open_timeout_sec` configurado
- **CUANDO** la puerta permanece abierta más allá del timeout en la simulación
- **ENTONCES** el simulador emite un evento de puerta abierta
- **Y** la alerta correspondiente aparece en pantalla

### Requirement: Exportación e importación de configuración

El sistema SHALL permitir exportar la configuración de topología completa como
JSON versionado e importarla en otra instancia, para despliegue reproducible y como
base de escenarios del simulador.

#### Scenario: Exportar e importar preserva invariantes

- **CUANDO** se exporta la topología de un sitio y se importa en una instancia
  limpia
- **ENTONCES** la instancia destino queda con la misma topología
- **Y** cualquier registro importado que violara un invariante de seguridad de vida
  es rechazado durante la importación

### Requirement: Nombres jerárquicos legibles de objetos

El sistema SHALL asignar a cada puerta, lector y entrada un nombre compuesto y
legible que refleje su ubicación en la jerarquía (sitio → nivel/zona → objeto), de
modo que un operador identifique el objeto sin consultar planos.

#### Scenario: Nombre compuesto de una puerta

- **DADO** una puerta en el sitio `TCH`, nivel 9, sala `SCN Room 9153`
- **CUANDO** se consulta su nombre para el feed de actividad
- **ENTONCES** el sistema presenta un nombre jerárquico legible como
  `TCH · Nivel 9 · SCN Room 9153`
- **Y** el nombre es único dentro del sitio

### Requirement: Declaración de entradas supervisadas

El sistema SHALL permitir declarar cada entrada física (DPS, REX, tamper, incendio)
como supervisada con resistencias de fin de línea (EOL), de modo que el corte o
puenteo del cable pueda detectarse como falla en lugar de pasar inadvertido.

#### Scenario: Entrada supervisada en zona crítica

- **DADO** una puerta en una zona de nivel de seguridad alto
- **CUANDO** se configura su contacto de posición como supervisado (EOL)
- **ENTONCES** el sistema registra que esa entrada distingue los estados normal,
  activo, cortado y en corto

#### Scenario: Entrada no supervisada solo distingue abierto/cerrado

- **CUANDO** una entrada se declara no supervisada
- **ENTONCES** el sistema solo admite los estados activo/inactivo para ella
- **Y** no ofrece detección de corte de línea para esa entrada

