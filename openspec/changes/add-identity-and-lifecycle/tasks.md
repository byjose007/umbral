## 1. Dominio

- [ ] 1.1 Entidad `Person` (empleado/contratista/visitante) con `external_ref`
- [ ] 1.2 `EmploymentPeriod` con vigencia y sin solapamientos
- [ ] 1.3 `Absence` (vacaciones/permiso/enfermedad/suspensión) con `blocks_access`
- [ ] 1.4 `PersonDocument` con `expires_at` y `blocks_access_on_expiry`
- [ ] 1.5 Función pura `accessStatus(person, at): Result<Allowed, BlockReason>`

## 2. Persistencia

- [ ] 2.1 Esquema Drizzle + restricción de exclusión de solapamiento en empleos
- [ ] 2.2 Índices por `external_ref` y por vigencia
- [ ] 2.3 Tests de integración: histórico nunca se borra al bloquear

## 3. API y consola

- [ ] 3.1 Módulo NestJS `identity` con DTOs Zod
- [ ] 3.2 CRUD de personas, ausencias y documentos
- [ ] 3.3 Vista de estado de acceso derivado (por qué está permitido/bloqueado)

## 4. Automatización por fecha

- [ ] 4.1 Job diario que fuerza recompilación de quienes cruzan un umbral de fecha
- [ ] 4.2 Tests: reactivación automática al terminar una ausencia

## 5. Validación OpenSpec

- [ ] 5.1 `openspec validate add-identity-and-lifecycle --strict` en verde
