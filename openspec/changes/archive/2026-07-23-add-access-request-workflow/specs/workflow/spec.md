## ADDED Requirements

### Requirement: Máquina de estados de solicitud de acceso

El sistema SHALL modelar la solicitud de acceso como una máquina de estados con
transiciones válidas (solicitada, en revisión, aprobada, rechazada, vigente,
vencida) y SHALL registrar quién ejecuta cada transición y cuándo.

#### Scenario: Aprobación registra autor

- **DADO** una solicitud en revisión
- **CUANDO** un aprobador la aprueba
- **ENTONCES** el sistema transiciona a aprobada
- **Y** registra el aprobador, la fecha y el motivo

#### Scenario: Transición inválida rechazada

- **CUANDO** se intenta pasar una solicitud rechazada directamente a vigente
- **ENTONCES** el sistema rechaza la transición

### Requirement: Portal público de solicitud

El sistema SHALL ofrecer un portal público donde proveedores y visitantes inicien
una solicitud de acceso aportando los datos y documentos requeridos.

#### Scenario: Proveedor solicita acceso

- **CUANDO** un proveedor completa una solicitud en el portal
- **ENTONCES** el sistema la registra en estado solicitada para revisión

### Requirement: Documento requerido como condición de aprobación

El sistema SHALL impedir aprobar una solicitud cuando falte un documento requerido
vigente para el tipo de acceso pedido.

#### Scenario: Póliza vencida bloquea aprobación

- **DADO** una solicitud cuyo solicitante tiene la póliza requerida vencida
- **CUANDO** un aprobador intenta aprobarla
- **ENTONCES** el sistema impide la aprobación indicando el documento faltante

### Requirement: Acceso concedido con vigencia

El sistema SHALL conceder el acceso aprobado con una vigencia efectiva, de modo que
caduque solo al terminar el periodo autorizado.

#### Scenario: Acceso de visita caduca solo

- **DADO** una solicitud aprobada con vigencia de un día
- **CUANDO** termina ese día
- **ENTONCES** el acceso concedido deja de ser vigente sin acción manual
