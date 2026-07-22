## ADDED Requirements

### Requirement: Reporte de evacuación (muster) desde servidor

El sistema SHALL producir el listado de quién se encuentra dentro en un momento dado
a partir del estado de ocupación, con la misma definición que usa la PWA offline.

#### Scenario: Muster coherente entre servidor y PWA

- **DADO** un mismo estado de ocupación sincronizado
- **CUANDO** se genera el muster en el servidor y en la PWA
- **ENTONCES** ambos listan el mismo conjunto de personas dentro

### Requirement: Analítica de flujo y día de mayor flujo

El sistema SHALL calcular agregados de flujo por hora, día y puerta, y SHALL
responder cuál fue el día de mayor flujo de un periodo consultando agregados
precalculados.

#### Scenario: Día de mayor flujo del último año

- **CUANDO** se consulta el día de mayor flujo del último año
- **ENTONCES** el sistema responde a partir de agregados precalculados sin recorrer
  fila por fila el histórico completo

### Requirement: Tracking de recorrido con control de acceso propio

El sistema SHALL ofrecer el recorrido de una persona por la instalación bajo un
control de acceso específico y con su propio registro de auditoría de consultas.

#### Scenario: Consulta de recorrido queda auditada

- **DADO** un operador con permiso de tracking
- **CUANDO** consulta el recorrido de una persona
- **ENTONCES** el sistema muestra el recorrido
- **Y** registra quién consultó a quién y cuándo

#### Scenario: Sin permiso no hay recorrido

- **CUANDO** un operador sin permiso de tracking intenta ver un recorrido
- **ENTONCES** el sistema lo deniega

### Requirement: Dashboard de salud y capacidad

El sistema SHALL presentar un panel operativo con lectores, entradas y controladores
en línea frente a sus totales, cardholders activos y clientes conectados, como
monitoreo de salud y no como límite de licencia.

#### Scenario: Degradación visible

- **DADO** un panel de salud
- **CUANDO** un controlador queda fuera de línea
- **ENTONCES** el panel refleja el descenso de controladores en línea frente al total
