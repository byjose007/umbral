## ADDED Requirements

### Requirement: Importación programada desde una fuente de RRHH

El sistema SHALL vigilar una fuente de RRHH (archivo por carpeta o SFTP programado,
o API/LDAP) e importar altas y actualizaciones de personas y de sus periodos de
empleo.

#### Scenario: Alta importada desde CSV

- **DADO** un archivo de RRHH con un empleado nuevo
- **CUANDO** el watcher lo procesa
- **ENTONCES** el sistema crea la persona y su periodo de empleo activo

### Requirement: Conciliación idempotente por referencia externa

El sistema SHALL conciliar cada registro por `external_ref`, de modo que reejecutar
la importación no duplique ni corrompa datos.

#### Scenario: Reejecución sin duplicados

- **DADO** una importación ya aplicada
- **CUANDO** se vuelve a procesar el mismo archivo
- **ENTONCES** el sistema no crea registros duplicados

### Requirement: Baja automática que dispara el bloqueo derivado

El sistema SHALL, ante una baja informada por RRHH, cerrar el periodo de empleo
correspondiente, de modo que el estado de acceso derivado bloquee a la persona sin
intervención humana.

#### Scenario: Empleado dado de baja pierde acceso solo

- **DADO** un empleado activo con acceso
- **CUANDO** RRHH informa su baja y el importador la procesa
- **ENTONCES** el sistema cierra su periodo de empleo
- **Y** su acceso queda bloqueado por el estado derivado, sin que nadie toque el panel

### Requirement: Reporte de discrepancias

El sistema SHALL reportar los registros que no puedan conciliarse para revisión
humana, sin inventar ni sobrescribir datos.

#### Scenario: Registro inconsistente se reporta

- **CUANDO** un registro de RRHH no casa con ninguna persona y presenta datos
  inconsistentes
- **ENTONCES** el sistema lo marca como discrepancia para revisión
- **Y** no altera datos existentes por adivinación
