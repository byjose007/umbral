## ADDED Requirements

### Requirement: Retención por tipo de dato con purga automática

El sistema SHALL aplicar una política de retención por tipo de dato y SHALL purgar
automáticamente los datos cuyo periodo de retención haya vencido.

#### Scenario: Foto de visitante se purga

- **DADO** una política que retiene fotos de visitante por un periodo corto
- **CUANDO** ese periodo vence para una foto
- **ENTONCES** el sistema la elimina automáticamente

### Requirement: Auditoría de acceso a datos personales

El sistema SHALL registrar cada consulta de identidad o de recorrido indicando quién
consultó, a quién, cuándo y con qué justificación, en un registro separado del
operativo.

#### Scenario: Consulta de identidad auditada

- **CUANDO** un operador revela la identidad detrás de un evento
- **ENTONCES** el sistema registra la consulta con operador, persona consultada y
  fecha

#### Scenario: Segregación efectiva

- **DADO** un operador de garita sin permiso de tracking
- **CUANDO** intenta consultar el histórico de recorridos de otra persona
- **ENTONCES** el sistema lo deniega

### Requirement: Derechos ARCO

El sistema SHALL permitir exportar, rectificar y eliminar los datos personales de una
persona, respetando la inmutabilidad del registro de auditoría.

#### Scenario: Eliminación sin romper la cadena

- **CUANDO** se solicita eliminar los datos de una persona
- **ENTONCES** el sistema anonimiza el vínculo donde la ley lo permite
- **Y** la cadena de hash del audit log permanece verificable

### Requirement: Base de licitud y aviso de privacidad

El sistema SHALL registrar la base de licitud del tratamiento y disponer del aviso de
privacidad para empleados y visitantes.

#### Scenario: Aviso disponible para un visitante

- **CUANDO** se registra a un visitante
- **ENTONCES** el sistema deja constancia del aviso de privacidad aplicable
