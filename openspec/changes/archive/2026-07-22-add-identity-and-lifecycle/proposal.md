## Why

El acceso de una persona no es un interruptor que alguien enciende y apaga a mano:
es un **estado derivado** de su vínculo laboral vigente, sus ausencias, sus
documentos requeridos y sus credenciales activas. El fallo de seguridad número uno
en instalaciones reales es que un empleado dado de baja conserva acceso porque nadie
se acordó de tocar el panel. UMBRAL debe hacer que ese estado se **calcule**, no se
recuerde.

Este change modela personas (empleados, contratistas, visitantes), su historia
laboral efectiva en el tiempo, sus ausencias (vacaciones, permisos, suspensión) y
sus documentos con vencimiento (pólizas, certificados de seguridad industrial,
exámenes médicos), y expone el **estado de acceso derivado** que consume el motor de
decisión al compilar la matriz.

## What Changes

- **Nueva capacidad `identity`**: personas y sus tres tipos (empleado, contratista,
  visitante), con referencia externa (`external_ref`) para sincronización HRIS.
- **Periodos de empleo efectivos en el tiempo** sin solapamientos (una persona no
  puede tener dos vínculos activos que se pisen).
- **Ausencias** que bloquean o no el acceso, con vigencia por fecha.
- **Documentos con vencimiento** que bloquean el acceso al caducar.
- **Estado de acceso derivado**: función pura que combina las fuentes anteriores y
  produce `permitido` / `bloqueado (razón)`.
- **Deprovisioning y reactivación automáticos por fecha**, sin acción humana.

## Impact

- **Specs afectadas**: `identity` (nueva).
- **Código afectado**: `src/domain/identity/**`, `src/db/schema/identity.ts`.
- **Depende de**: `topology` (sitio).
- **Habilita**: `credentials`, `access-rights`, `decision-engine` (consume el estado
  derivado), `hris-sync` (lo alimenta).
