## Context

El requisito del cliente "bloquear si sale de vacaciones o sale de la empresa" se
traduce a un modelo donde el estado de acceso es un **derivado**, nunca un booleano
editable. Esto elimina la clase entera de bugs "alguien olvidó desactivar".

## Decisiones

### D1 — El estado laboral es efectivo en el tiempo, no una bandera

`employment_periods` con `valid_from`/`valid_until` y una restricción de exclusión
que impide solapamientos por persona. Terminar un empleo es cerrar el periodo, no
borrar nada. El histórico se conserva siempre.

### D2 — El estado de acceso es una función pura

```
accessStatus(person, at) =
  empleo_vigente(at)
  ∧ ¬ausencia_bloqueante_vigente(at)
  ∧ documentos_requeridos_vigentes(at)
  ∧ tiene_credencial_activa(at)
```

Devuelve `Result` con la razón de bloqueo (`ABSENCE_ACTIVE`, `DOCUMENT_EXPIRED`,
`NOT_EMPLOYED`, `NO_ACTIVE_CREDENTIAL`). El motor de decisión reutiliza esta misma
razón como `reason_code`.

### D3 — El tiempo hace el trabajo

El deprovisioning (fin de contrato, documento vencido) y la reactivación (fin de
vacaciones) ocurren por comparación de fechas al recompilar la matriz, no por un
job que "apaga" gente. Un job diario solo fuerza la recompilación de quienes cruzan
un umbral de fecha ese día.

## Non-goals

- Emisión de credenciales (eso es `credentials`).
- Origen de los datos de RRHH (eso es `hris-sync`).
