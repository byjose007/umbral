## Purpose

Aísla los datos sensibles de credenciales entre distintas organizaciones clientes de
Umbral, de modo que el personal de una organización nunca pueda validar, sincronizar
ni forjar credenciales pertenecientes a otra.

## ADDED Requirements

### Requirement: Organización como raíz del inquilino

El sistema SHALL agrupar cada sitio bajo exactamente una organización, de modo que
la organización sea el límite de aislamiento de credenciales y de asignación de
personal.

#### Scenario: Sitio pertenece a una organización

- **DADO** una organización existente
- **CUANDO** se crea un sitio sin indicar organización explícitamente
- **ENTONCES** el sistema lo asigna a una organización por defecto
- **Y** un sitio creado indicando una organización queda asociado a esa organización

### Requirement: Secreto de credenciales aislado por organización

El sistema SHALL usar un secreto de firma/verificación de credenciales QR distinto
para cada organización, generado por el propio sistema, y SHALL nunca exponerlo en
listados u otras respuestas públicas.

#### Scenario: Credencial de una organización no verifica en otra

- **DADO** dos organizaciones con secretos distintos
- **Y** una credencial QR firmada con el secreto de la organización A
- **CUANDO** un guardia autenticado como personal de la organización B intenta
  verificarla
- **ENTONCES** el sistema rechaza la verificación por firma inválida

#### Scenario: El secreto no se expone en el listado de organizaciones

- **CUANDO** se consulta el listado de organizaciones
- **ENTONCES** la respuesta incluye identificador, código y nombre
- **Y** no incluye el secreto de esa organización

### Requirement: Operador pertenece a una organización

El sistema SHALL asociar cada operador (incluyendo guardias) a exactamente una
organización, de modo que las operaciones que dependen del secreto de credenciales
(sincronización, verificación) usen siempre el de su propia organización.

#### Scenario: Operador nuevo sin organización indicada

- **CUANDO** un administrador crea un operador sin indicar organización
- **ENTONCES** el sistema lo asigna a la organización por defecto

#### Scenario: Sincronización usa el secreto de la organización del operador

- **DADO** un operador asociado a una organización específica
- **CUANDO** ese operador solicita los datos de sincronización de su garita
- **ENTONCES** el sistema responde con el secreto de esa organización, no el de
  ninguna otra
