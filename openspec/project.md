# UMBRAL — Contexto del Proyecto

> Este archivo es la **constitución** del proyecto. Toda propuesta de cambio y toda
> spec debe respetar lo que aquí se declara. Los agentes de IA leen este archivo
> antes de generar cualquier `proposal`, `design`, `tasks` o `spec`.

## 1. Qué es UMBRAL

UMBRAL es un **sistema de control de acceso físico (PACS)**: control de puertas +
workflow de aprobación + analítica y auditoría. Se despliega **on-premise** en la
instalación del cliente (industrial/portuario, mercado ecuatoriano).

**No es un CRUD con QR. Es un sistema de seguridad de vida (life-safety).** En el
momento en que el software decide si una cerradura libera una puerta, participa en
la vía de evacuación de un edificio. Esto condiciona toda la arquitectura.

## 2. Los tres invariantes no negociables (life-safety)

Estos tres principios están por encima de cualquier feature. Ninguna spec puede
contradecirlos, y varios se codifican como `CHECK` en la base de datos y como
invariantes de dominio:

1. **La decisión de acceso es local.** El controlador de puerta decide con su
   matriz de acceso cacheada. La red es un optimizador, no un requisito. El
   servidor puede estar caído una semana y las puertas siguen operando.
2. **La liberación por seguridad de vida no pasa por software.** La señal de la
   central de incendios corta la alimentación de la cerradura **por hardware, en
   serie**, antes del relé del controlador. El software se entera y registra el
   evento; no participa en la liberación. El free egress (salida libre) es
   mecánico/eléctrico e independiente del software.
3. **Todo evento es inmutable.** Nunca `UPDATE` ni `DELETE` sobre `access_events`.
   Solo `INSERT`, con encadenamiento criptográfico por hash.

## 3. Stack tecnológico (fijo para el MVP)

### Backend
- **NestJS 11** sobre **Fastify** (throughput de ingesta de eventos).
- **TypeScript strict**: `strict: true`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`.
- **Drizzle ORM** — SQL tipado, sin capa mágica (el 60 % de los reportes son SQL
  con ventanas y agregados sobre TimescaleDB).
- **Zod** + `nestjs-zod` — un esquema para DTO, OpenAPI y tipo TS.
- **`neverthrow`** — `Result<T, E>` explícito en el dominio. Las excepciones **no**
  son control de flujo en decisiones de seguridad.
- **BullMQ** (notificaciones, reportes, purga por retención), **Passport + JWT**
  (access corto + refresh rotativo), **argon2id**, **REST + OpenAPI**.

### Frontend
- **Angular 22** (zoneless, Signals, standalone) — consola de administración.
- **Ionic 8 + Angular + Capacitor** — PWA de guardia **offline-first** (mismo
  monorepo, otro target). QR por cámara (web y nativo); NFC/BLE exige Capacitor.
- Offline: Service Worker + SQLite (`@capacitor-community/sqlite`); cripto offline
  con **WebCrypto (ES256)** para verificar QR firmado y muster sin servidor.

### Datos e infraestructura
- **PostgreSQL 17** + **TimescaleDB** (`access_events` es una hypertable con
  continuous aggregates).
- **Valkey** (caché, estado de puertas, anti-passback, backend de BullMQ).
- **EMQX** — MQTT 5 sobre **mTLS**, ACL por dispositivo.
- **MinIO** (fotos, adjuntos, S3-compatible on-premise).
- **Traefik** (TLS/mTLS), **Prometheus + Grafana + Loki + OpenTelemetry**.
- Despliegue: **Docker Compose** (piloto) → **K3s** (escala). Nada de nube pública:
  el cliente quiere sus datos en casa.

### Firmware (Fase 2, no MVP)
- **ESP32-S3**, **ESP-IDF 5.x** (C), **OSDP v2.2 Secure Channel** (`libosdp`),
  MQTT 5 sobre TLS mutuo, Secure Boot v2 + Flash Encryption + certificado por
  dispositivo en eFuse, OTA A/B con rollback.

## 4. Arquitectura

**Modular monolith con Ports & Adapters (arquitectura hexagonal).** Nada de
microservicios para 50 puertas — la modularidad es de código, no de red.

- El dominio **no importa infraestructura**. Los adaptadores implementan puertos
  definidos por el dominio. Ejemplo canónico: `DoorControllerPort` con adaptadores
  `SimulatorAdapter`, `SupremaAdapter`, `ZktecoAdapter`, `Esp32OsdpAdapter`.
- Regla de dependencia entre contextos: `Decision` **no** conoce `DeviceGateway`;
  `DeviceGateway` implementa puertos de `Decision`.
- **Local-first en la puerta.** El servidor compila la matriz de acceso y la
  empuja al controlador; el controlador decide offline y bufferiza eventos.
- **La configuración es dato, no código** (ver §6).

### Contextos acotados (bounded contexts) → capacidades OpenSpec
`topology` · `identity` · `credentials` · `access-rights` · `decision-engine` ·
`device-gateway` · `events-audit` · `alerting` · `analytics` · `workflow` ·
`notifications` · `compliance` · `guard-pwa`

Cada capacidad es una carpeta bajo `openspec/specs/<capability>/`.

## 5. Alcance del MVP

**Dentro:** topología completa · personas y N credenciales por persona ·
niveles de acceso (Puerta × Horario) + calendario de feriados · motor de decisión
dual (edge + servidor) · gateway MQTT/mTLS · eventos append-only encadenados ·
alertas (DHO/DFO/tamper/dispositivo caído/coacción) · vigencia efectiva y
bloqueo/reactivación automáticos · PWA de guardia offline · consola de
administración · reportes + muster offline · notificaciones (WhatsApp/email/Web
Push) · workflow de solicitud/aprobación de acceso.

**Fuera (roadmap):** biometría/reconocimiento facial · LPR/control vehicular ·
integración TOS portuario · control de ascensores · app móvil nativa (la PWA
cubre el MVP) · SaaS multi-tenant público (el MVP es instancia dedicada por
cliente; el diseño lo soporta).

## 6. Convenciones de configuración

- Toda entidad de configuración es **versionada y auditada**, no una fila que se
  sobrescribe.
- Cambios en configuración de seguridad de vida (perfil de cerradura, ruta de
  evacuación, fail-state) requieren **doble aprobación** y quedan en el audit log
  con quién y por qué.
- Toda configuración se valida contra invariantes de dominio **y** contra `CHECK`
  en base de datos (doble red).
- La configuración es **exportable/importable** (JSON versionado) → despliegue
  reproducible y base del `SimulatorAdapter`.

## 7. Convenciones de código

- **Result sobre excepciones** en el dominio (`neverthrow`).
- **Value Objects** para conceptos con invariantes (`LockProfile`, `CredentialId`,
  ventanas de horario…). Los IDs son tipos branded, no `string` desnudos.
- **Nombres de dominio en inglés** en el código; **specs y docs de negocio en
  español** (idioma del cliente y del equipo). En las specs, la frase normativa de
  cada `Requirement` usa la palabra clave RFC-2119 **`SHALL`** (se mantiene en
  inglés por convención, es la que valida el CLI de OpenSpec); los `Scenario` y toda
  la prosa van en español (`DADO`/`CUANDO`/`ENTONCES`).
- Tests: **Vitest** (unit/dominio) + **Testcontainers** (Postgres real en
  integración) + **Playwright** (E2E, incluido modo offline de la PWA).
- Un **vector de pruebas de decisión compartido** (fixtures JSON) valida que el
  motor edge (firmware) y el motor servidor (NestJS) producen la **misma**
  decisión ante la misma entrada. Es la garantía de que el mirror no diverge.

## 8. Cumplimiento (LOPDP Ecuador)

El sistema procesa datos personales (movimientos de personas). Toda spec que toque
datos de personas debe considerar: base de licitud y aviso de privacidad,
retención con **purga automática**, minimización, derechos ARCO y segregación de
consultas (quién consultó el recorrido de quién queda auditado). Biometría queda
fuera del MVP y requiere evaluación de impacto previa.

## 9. Estado

- **Fase 0 (descubrimiento)** pendiente: cuestionario al cliente + levantamiento
  puerta por puerta. **No se escribe código de producción hasta cerrar Fase 0.**
- El primer entregable de código (Fase 1, semanas 1–2) es el cubierto por el
  change `add-topology-foundation`.
- Desarrollador único. El paquete `@core/*` compartido con Vetia amortiza esfuerzo
  (tenancy, auth, roles, audit log, notificaciones), abstraído a nivel de puertos
  (Vetia usa Supabase; UMBRAL no — aquí es Postgres on-premise).
