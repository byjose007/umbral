## Why

"Grupos con conjunto de puertas" es la base, pero un permiso sin horario es un
permiso permanente 24/7, y un horario sin calendario de feriados falla el 1 de
enero. El modelo correcto es `Persona → Grupo → NivelDeAcceso(Puerta × Horario)`,
con vigencia efectiva en las asignaciones para que un acceso temporal o de vacaciones
se exprese con fechas y no con hacks.

## What Changes

- **Nueva capacidad `access-rights`**: horarios (ventanas por día de semana),
  calendarios de feriados, niveles de acceso (Puerta × Horario), grupos y asignación
  de personas a grupos.
- **Nivel de acceso como entidad de primera clase**, no como lista de puertas.
- **Vigencia efectiva** (`valid_from`/`valid_until`) en la asignación persona-grupo.
- **Calendario de feriados de Ecuador** más excepciones por sitio.

## Impact

- **Specs afectadas**: `access-rights` (nueva).
- **Código afectado**: `src/domain/access-rights/**`, `src/db/schema/access-rights.ts`.
- **Depende de**: `topology` (puertas), `identity` (personas).
- **Habilita**: `decision-engine` (el compilador de matriz consume esto).
