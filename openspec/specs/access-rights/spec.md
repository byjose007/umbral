# access-rights Specification

## Purpose
TBD - created by archiving change add-access-rights. Update Purpose after archive.
## Requirements
### Requirement: Horarios con ventanas por día de semana

El sistema SHALL modelar horarios como conjuntos de ventanas con día de semana, hora
de inicio y hora de fin, de modo que un permiso pueda restringirse a franjas
específicas.

#### Scenario: Franja laboral entre semana

- **CUANDO** se crea un horario con ventana L–V de 07:00 a 19:00
- **ENTONCES** el sistema considera dentro de horario un martes a las 10:00
- **Y** fuera de horario un sábado a cualquier hora

### Requirement: Calendario de feriados aplicable a horarios

El sistema SHALL permitir asociar un calendario de feriados a un horario, de modo
que un día marcado como feriado altere la aplicación de las ventanas según la regla
configurada.

#### Scenario: Feriado nacional

- **DADO** un horario con calendario que incluye el 1 de enero como feriado
- **CUANDO** se evalúa el acceso el 1 de enero dentro de la franja horaria normal
- **ENTONCES** el sistema aplica la regla de feriado y no lo trata como día laboral
  ordinario

### Requirement: Nivel de acceso como entidad de primera clase

El sistema SHALL modelar el nivel de acceso como un conjunto de pares (Puerta ×
Horario), reutilizable entre grupos, en lugar de una lista directa de puertas por
grupo.

#### Scenario: Nivel reutilizado por dos grupos

- **DADO** un nivel de acceso "Bodega en horario laboral"
- **CUANDO** se asigna a los grupos "Operativo" y "Logística"
- **ENTONCES** ambos grupos heredan las mismas puertas y horarios de ese nivel

### Requirement: Asignación persona-grupo con vigencia efectiva

El sistema SHALL permitir asignar personas a grupos con `valid_from` y `valid_until`,
de modo que un acceso temporal se exprese con fechas y caduque solo.

#### Scenario: Acceso temporal por proyecto

- **CUANDO** se asigna una persona a un grupo con vigencia de dos semanas
- **ENTONCES** el acceso derivado incluye ese grupo solo dentro de la ventana
- **Y** deja de incluirlo automáticamente al vencer, sin edición manual

