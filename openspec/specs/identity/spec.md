# identity Specification

## Purpose
TBD - created by archiving change add-identity-and-lifecycle. Update Purpose after archive.
## Requirements
### Requirement: Registro de personas por tipo

El sistema SHALL registrar personas clasificadas como empleado, contratista o
visitante, cada una asociada a un sitio y con un documento de identidad único dentro
del sitio, admitiendo una referencia externa para sincronización con RRHH.

#### Scenario: Alta de empleado

- **CUANDO** se registra una persona de tipo empleado con su documento de identidad
- **ENTONCES** el sistema la persiste asociada al sitio
- **Y** rechaza un segundo registro con el mismo documento en el mismo sitio

### Requirement: Vínculo laboral efectivo en el tiempo sin solapamientos

El sistema SHALL modelar el estado laboral como periodos con `valid_from` y
`valid_until`, y SHALL impedir que una misma persona tenga dos periodos vigentes que
se solapen.

#### Scenario: Cierre de vínculo conserva histórico

- **DADO** un empleado con un periodo de empleo activo
- **CUANDO** se termina su vínculo cerrando el periodo
- **ENTONCES** el sistema conserva todo su histórico de eventos y periodos
- **Y** su estado de acceso derivado pasa a bloqueado por no estar empleado

#### Scenario: Rechazo de periodos solapados

- **CUANDO** se intenta crear un periodo de empleo que se solapa con otro vigente de
  la misma persona
- **ENTONCES** el sistema rechaza la creación

### Requirement: Ausencias que bloquean el acceso

El sistema SHALL permitir registrar ausencias con vigencia por fecha y con una marca
`blocks_access`, de modo que durante una ausencia bloqueante el estado de acceso
derivado de la persona sea bloqueado.

#### Scenario: Vacaciones bloquean acceso

- **DADO** un empleado con una ausencia bloqueante vigente
- **CUANDO** se evalúa su estado de acceso
- **ENTONCES** el estado derivado es bloqueado con razón de ausencia vigente

#### Scenario: Reactivación automática al terminar la ausencia

- **DADO** una ausencia que vence hoy
- **CUANDO** pasa su fecha de fin
- **ENTONCES** el estado de acceso derivado vuelve a permitido sin intervención
  manual

### Requirement: Documentos con vencimiento que bloquean

El sistema SHALL permitir asociar a una persona documentos con fecha de vencimiento
y una marca `blocks_access_on_expiry`, de modo que un documento vencido bloquee el
acceso de la persona.

#### Scenario: Certificado vencido bloquea a un contratista

- **DADO** un contratista con un certificado de seguridad marcado como bloqueante
- **CUANDO** la fecha de vencimiento del certificado pasa
- **ENTONCES** el estado de acceso derivado del contratista es bloqueado por
  documento vencido

### Requirement: Estado de acceso derivado

El sistema SHALL calcular el estado de acceso de una persona como una función pura
de su empleo vigente, sus ausencias bloqueantes, sus documentos requeridos y la
existencia de al menos una credencial activa, y SHALL exponer la razón del bloqueo
cuando aplique.

#### Scenario: El estado no es editable a mano

- **CUANDO** un administrador intenta marcar directamente a una persona como
  "permitida" pese a tener una ausencia bloqueante vigente
- **ENTONCES** el sistema no ofrece esa edición directa
- **Y** el estado sigue derivándose de las fuentes de verdad

