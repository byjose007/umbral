## Why

Buena parte del acceso en instalaciones industriales no es de personal fijo, sino de
proveedores y visitantes que **solicitan** acceso y alguien **aprueba**. Ese flujo
—heredado del alcance original— necesita una máquina de estados clara: solicitud,
revisión, aprobación o rechazo, con vigencia y trazabilidad, conectando con
documentos requeridos (una póliza vencida bloquea la aprobación).

## What Changes

- **Nueva capacidad `workflow`**: solicitud de acceso, aprobación/rechazo, máquina
  de estados y vigencia del acceso concedido.
- **Portal de proveedores** (público) para iniciar solicitudes.
- **Validación de documentos requeridos** como condición de aprobación.
- **Trazabilidad**: quién solicitó, quién aprobó, cuándo y por qué.

## Impact

- **Specs afectadas**: `workflow` (nueva).
- **Código afectado**: `src/domain/workflow/**`, portal público, máquina de estados.
- **Depende de**: `identity` (personas/documentos), `access-rights` (nivel a conceder).
- **Habilita**: emisión de credenciales temporales tras aprobación.
