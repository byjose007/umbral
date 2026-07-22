## 1. Dominio

- [ ] 1.1 `Schedule` con ventanas `{dow, from, to}` y referencia a calendario
- [ ] 1.2 `HolidayCalendar` (feriados Ecuador + excepciones por sitio)
- [ ] 1.3 `AccessLevel` = conjunto de (Puerta × Horario)
- [ ] 1.4 `Group` y `GroupAccessLevel`; `PersonGroup` con vigencia efectiva

## 2. Persistencia

- [ ] 2.1 Esquema Drizzle de horarios, calendarios, niveles, grupos, asignaciones
- [ ] 2.2 Índices por vigencia; validación de ventanas horarias

## 3. API y consola

- [ ] 3.1 Módulo NestJS `access-rights` con DTOs Zod
- [ ] 3.2 Editor de niveles de acceso (matriz Puerta × Horario)
- [ ] 3.3 Asignación de personas a grupos con fechas de vigencia

## 4. Validación OpenSpec

- [ ] 4.1 `openspec validate add-access-rights --strict` en verde
