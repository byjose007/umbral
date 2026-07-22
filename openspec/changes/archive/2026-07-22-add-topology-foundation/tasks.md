## 1. Dominio de topología

- [x] 1.1 Crear IDs branded (`SiteId`, `ZoneId`, `DoorId`, `ControllerId`,
      `ReaderId`, `LockProfileId`) y tipos base
- [x] 1.2 Implementar el Value Object `LockProfile` con sus invariantes (egress ⇒
      fail-safe, egress ⇒ releases_on_fire, DHO ⇒ has_dps, rango de pulso)
- [x] 1.3 Modelar entidades `Site`, `Zone` (jerarquía + reglas de zona), `Door`,
      `Controller`, `Reader` devolviendo `Result<T, DomainError>`
- [x] 1.4 Tests unitarios de dominio que cubran cada scenario de la spec (Vitest)

## 2. Persistencia (Drizzle + Postgres)

- [x] 2.1 Esquema Drizzle para `sites`, `zones`, `lock_profiles`, `controllers`,
      `doors`, `readers`
- [x] 2.2 Restricciones `CHECK`: `chk_egress_failsafe`, `chk_egress_fire_release`,
      `chk_dho_needs_sensor`, `chk_wiegand_risk`
- [x] 2.3 Migraciones + índices únicos (`sites.code`, `(site_id, code)` en zonas,
      puertas)
- [x] 2.4 Tests de integración con Testcontainers que verifiquen que la base
      rechaza filas inseguras (no solo el dominio)

## 3. Configuración versionada y auditada

- [x] 3.1 Tabla/estrategia de versionado de configuración (autor, fecha, motivo)
- [x] 3.2 Flujo de doble aprobación para campos de seguridad de vida
- [x] 3.3 Escritura al audit log en cada cambio de configuración
- [x] 3.4 Export/import de topología como JSON versionado con validación de
      invariantes en la importación

## 4. Puerto y adaptador de controlador

- [x] 4.1 Definir `DoorControllerPort` en el dominio
      (`pushAccessMatrix`, `grantAccess`, `setLockdown`, `events$`, `health`,
      `syncClock`)
- [x] 4.2 Implementar `SimulatorAdapter` (puertas en memoria, `events$` como
      Observable, apertura y puerta trabada)
- [x] 4.3 Tests: apertura de puerta virtual y puerta trabada que dispara evento

## 5. API y consola (mínimo viable de configuración)

- [x] 5.1 Módulo NestJS `topology` con DTOs Zod (`nestjs-zod`) y OpenAPI
- [x] 5.2 Endpoints CRUD de sitios/zonas/puertas/controladores/lectores/perfiles
- [x] 5.3 Pantalla Angular de configuración de topología (consola)
- [x] 5.4 Marcado visible de lectores Wiegand en migración con riesgo aceptado

## 6. Semilla y demo

- [x] 6.1 Semilla de un sitio de demo con puertas virtuales sobre `SimulatorAdapter`
- [x] 6.2 Escenario de demo: abrir puerta, dejarla trabada, ver alerta en pantalla
- [x] 6.3 CI verde (build + unit + integración)

## 7. Validación OpenSpec

- [x] 7.1 `openspec validate add-topology-foundation --strict` en verde
- [x] 7.2 Revisión de que ningún scenario quedó sin cubrir por tests
