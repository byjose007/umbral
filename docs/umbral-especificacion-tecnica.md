# UMBRAL — Sistema de Control de Acceso Físico
## Especificación Técnica y Arquitectura de Referencia

| | |
|---|---|
| **Nombre en clave** | UMBRAL *(provisional — verificar disponibilidad de marca en Ecuador SENADI antes de fijar)* |
| **Versión** | 0.2 — Añadida arquitectura física de hardware, BOM y decisión de app móvil |
| **Estado** | Borrador para validación con cliente |
| **Autor** | Byron Jiménez |
| **Reemplaza a** | PortAI Access Control / Vigía *(archivados — ver §1.2)* |
| **Fecha** | Julio 2026 |

---

## Índice

1. [Contexto y decisión de arranque](#1-contexto-y-decisión-de-arranque)
2. [Naturaleza real del sistema — reencuadre crítico](#2-naturaleza-real-del-sistema--reencuadre-crítico)
3. [Requerimientos faltantes](#3-requerimientos-faltantes)
4. [Preguntas abiertas al cliente](#4-preguntas-abiertas-al-cliente-bloqueantes)
5. [Alcance MVP](#5-alcance-mvp)
6. [Modelo de dominio](#6-modelo-de-dominio)
7. [Arquitectura](#7-arquitectura)
8. [Hardware — abstracción de software y arquitectura física](#8-hardware--abstracción-de-software-y-arquitectura-física)
9. [Motor de decisión dual](#9-motor-de-decisión-dual-edge--servidor)
10. [Stack tecnológico](#10-stack-tecnológico)
11. [Modelo de datos](#11-modelo-de-datos)
12. [Eventos y auditoría](#12-eventos-y-auditoría-inmutable)
13. [Motor de reglas y alertas](#13-motor-de-reglas-y-alertas)
14. [Analítica y reportes — el diferenciador](#14-analítica-y-reportes--el-diferenciador)
15. [Seguridad de la plataforma](#15-seguridad-de-la-plataforma)
16. [Configurabilidad](#16-configurabilidad)
17. [Requisitos no funcionales](#17-requisitos-no-funcionales)
18. [Roadmap](#18-roadmap)
19. [Riesgos](#19-riesgos)
20. [Anexo A — Requerimientos en formato EARS](#anexo-a--requerimientos-en-formato-ears-muestra)

---

## 1. Contexto y decisión de arranque

### 1.1 Origen

El cliente entregó inicialmente una ficha de requerimientos que corresponde a la oferta comercial de **Telconet SAFE PASS / SAFE ENTRY** (identificable por los SKU `TN-SE-PLANTPASS` y `TN-SE-SAFE QR`). Es decir, el "requerimiento mínimo" es la lista de funcionalidades del competidor.

En reunión posterior, el alcance real se amplió sustancialmente:

- Control de acceso en **todas las puertas** de la instalación
- Lectores **QR + NFC + RFID**
- Soporte para **múltiples tipos de cerradura** (eléctrica, magnética, de pulso, con sensores)
- **Todos los parámetros configurables**
- **Alertas** por puerta abierta más de N minutos
- **Grupos/roles** con conjuntos de puertas asignados
- **Bloqueo automático** de accesos por vacaciones o baja del empleado
- **Reportes avanzados** como diferenciador: día de mayor flujo, tiempos, mapa de tracking de recorrido por persona

### 1.2 Por qué repo nuevo y no continuar PortAI

PortAI fue diseñado como producto de **visión artificial** (Frigate, YOLO, EasyOCR, DeepFace, inferencia en NUC, aprendizaje activo). El sistema actual es un **PACS de control de puertas + workflow + analítica**. Comparten dominio; no comparten arquitectura.

| Activo de PortAI | Destino |
|---|---|
| Frigate / Frigate Plus / active learning | ❌ Descartado |
| YOLO + EasyOCR (LPR) | 🔜 Fase 3 como módulo opcional |
| DeepFace / biometría facial | 🔜 Fase 4, con reservas regulatorias |
| Celery + RabbitMQ | ❌ Sobredimensionado |
| Backend FastAPI | ❌ Reescrito a NestJS (stack objetivo) |
| Conceptos: zonas, eventos, decisión aprobado/rechazado, auditoría | ✅ Reutilizado conceptualmente |
| Observabilidad Prometheus + Grafana + Loki | ✅ Reutilizado tal cual |
| Experiencia ESP32 / edge / MQTT | ✅ Reutilizado — es el activo más valioso |
| Conocimiento de dominio portuario y narrativa comercial | ✅ Reutilizado |

Adicionalmente, **PortAI se construyó en contexto de un cliente (TPM)**. Un repositorio limpio elimina el riesgo de propiedad intelectual antes de que exista.

### 1.3 Reutilización real: el core multi-tenant

El esqueleto aprovechable **no viene de PortAI, viene de Vetia**: tenancy, autenticación, roles, audit log, notificaciones WhatsApp, PWA offline-first, modular monolith con Ports & Adapters, scaffold OpenSpec. Se recomienda extraer un paquete `@core/*` compartido entre ambos productos.

> **Excepción:** Vetia usa Supabase. Aquí está explícitamente descartado (requisito del cliente + el despliegue es on-premise). El core compartido debe abstraerse a nivel de puertos, no de proveedor.

---

## 2. Naturaleza real del sistema — reencuadre crítico

**Este ya no es un CRUD con QR. Es un sistema de seguridad de vida.**

En el momento en que el software decide si una cerradura electromagnética libera o no una puerta, el sistema participa en la **vía de evacuación** de un edificio. Un bug de red, un caché desactualizado o un pánico de firmware pueden dejar personas encerradas en un incendio.

Esto tiene tres consecuencias de diseño no negociables:

1. **La decisión de acceso debe ser local.** Si el controlador de puerta depende del servidor para decidir, una caída de red paraliza la instalación. La red es un optimizador, no un requisito.
2. **La salida nunca puede depender del software.** Debe existir liberación mecánica/eléctrica independiente (§3.1).
3. **La responsabilidad legal es real.** Esto define la estrategia de hardware (§8.1) y el modelo de contrato.

Esto no es una razón para no hacerlo. Es la razón por la que se hace **con arquitectura, no con improvisación** — y también el argumento de venta más fuerte frente a un proveedor genérico.

---

## 3. Requerimientos faltantes

Esta es la sección central del documento. Todo lo listado aquí **no fue mencionado por el cliente** y es necesario.

Severidad:
- 🔴 **Bloqueante** — sin esto el sistema no es instalable legalmente o no es seguro
- 🟠 **Crítico** — sin esto el sistema falla en operación real
- 🟡 **Importante** — sin esto el sistema pierde competitividad
- 🔵 **Diferenciador** — no lo tiene la competencia

---

### 3.1 Seguridad de vida y normativa 🔴

| # | Requerimiento | Por qué |
|---|---|---|
| SV-01 | **Free egress (salida libre)** | Toda puerta en ruta de evacuación debe abrirse desde adentro **sin credencial y sin software**. Barra antipánico o REX cableado directo al relé. |
| SV-02 | **Interfaz con central de incendios** | Las cerraduras electromagnéticas **deben liberarse** ante alarma de incendio. Contacto seco NC en serie con la alimentación de la maglock — liberación por hardware, no por MQTT. |
| SV-03 | **Definición fail-safe / fail-secure por puerta** | Ante corte de energía: ¿la puerta se abre (fail-safe) o se cierra (fail-secure)? Es decisión por puerta, según si es evacuación o zona crítica. Debe ser configuración explícita y auditada, no un default. |
| SV-04 | **REX (Request to Exit)** | Botón o sensor PIR de salida. Sin REX, cada salida legítima dispara alarma de *puerta forzada*. |
| SV-05 | **Respaldo de energía** | UPS/batería por controlador. Autonomía a definir (mín. 4h recomendado). |
| SV-06 | **Modo lockdown / nivel de amenaza** | Bloqueo global o por zona desde un botón, respetando SV-01. |

> ⚠️ **SV-02 y SV-03 requieren coordinación con quien mantiene el sistema contra incendios de la instalación.** No es competencia del software. Debe quedar en el contrato quién responde por esto.

---

### 3.2 El requisito "puerta abierta más de 5 minutos" 🟠

El cliente pidió esta alerta. **Técnicamente no es posible sin un sensor que no fue mencionado.**

Para saber si una puerta está abierta hace falta un **contacto magnético de posición (door contact / DPS)** en la hoja. Sin él, el sistema solo sabe que *concedió* el acceso, no que la puerta se abrió ni cuándo cerró.

De ese sensor se derivan tres eventos estándar de la industria, y hay que especificarlos los tres:

| Evento | Condición | Configuración |
|---|---|---|
| **DHO** — Door Held Open | Puerta abierta > `held_open_timeout` tras acceso válido | Timeout por puerta (default 30s, el "5 min" del cliente es un valor de configuración, no una regla fija) |
| **DFO** — Door Forced Open | Contacto abre **sin** concesión de acceso ni REX previo | Alarma inmediata, prioridad alta |
| **Pre-alarma local** | Zumbador en el lector N segundos antes del DHO | Evita alarmas por logística legítima |

**Implicación de costo:** cada puerta necesita contacto magnético + cableado. Debe estar en el levantamiento y en el presupuesto. Es la partida que la competencia suele "olvidar" en la oferta y aparece después.

---

### 3.3 Seguridad de credenciales 🔴

El cliente pidió "QR, NFC o RFID". Estas tres palabras esconden decisiones críticas:

| Tecnología | Riesgo | Recomendación |
|---|---|---|
| **RFID 125 kHz** (EM4100, HID Prox) | Clonable en segundos con un dispositivo de \$20. **Sin cifrado.** | ❌ **Prohibir.** Si el cliente ya tiene este parque instalado, es un hallazgo que hay que reportar por escrito. |
| **MIFARE Classic 1K** | Criptografía Crypto1 rota desde 2008. Clonable. | ❌ **Prohibir** para zonas seguras. |
| **MIFARE DESFire EV2/EV3** | AES-128, autenticación mutua | ✅ **Estándar del proyecto** |
| **NFC vía smartphone** | Ver ⚠️ abajo | ✅ Android; ⚠️ iOS con restricciones |
| **QR estático impreso** | Se fotografía y se reenvía por WhatsApp. Inservible como credencial permanente. | ⚠️ Solo visitantes, de un solo uso o con TOTP |
| **QR dinámico firmado** | JWT corto (ES256) + nonce + rotación cada 30-60s en la app | ✅ Recomendado para personal sin tarjeta |

⚠️ **Restricción crítica de iOS:** Apple **no permite** que una app de terceros lea/emule NFC para control de acceso sin entitlements especiales. Las opciones reales son (a) el programa de llaves en Apple Wallet — proceso comercial largo con Apple, (b) BLE en lugar de NFC, o (c) QR dinámico en iOS y NFC en Android. **Esto debe decidirse antes de prometerle NFC universal al cliente.**

Requerimientos adicionales:

- **CR-01** 🔴 Rotación de claves de sector/aplicación de las tarjetas. Nunca claves de fábrica.
- **CR-02** 🟠 Ciclo de vida de credencial: emisión, extravío, bloqueo inmediato, temporal, caducidad, reemplazo. Una persona puede tener **N credenciales** de distinto tipo.
- **CR-03** 🟠 Código de coacción (duress): PIN alterno que concede acceso y dispara alarma silenciosa.
- **CR-04** 🟡 Multifactor por nivel de zona: tarjeta / tarjeta+PIN / tarjeta+PIN+biometría.

---

### 3.4 Cableado lector–controlador 🔴

Requerimiento omitido y de altísimo impacto:

- **Wiegand** es el protocolo legado de la industria. Es **unidireccional, sin cifrar y sniffable** con un dispositivo insertado detrás del lector. Un atacante captura el número de tarjeta o lo inyecta directamente.
- **OSDP v2.2 con Secure Channel (SCP)** es el estándar moderno: bidireccional sobre RS-485, cifrado AES-128, detección de tamper, y permite polling del estado del lector.

**RQ:** el proyecto adopta **OSDP con Secure Channel como obligatorio**. Wiegand solo se admite en modo migración documentado, con firma de aceptación de riesgo del cliente.

> 🔵 **Este es un diferenciador vendible.** La mayoría de instalaciones en la región siguen en Wiegand + 125 kHz. Poder decir *"nuestro sistema no acepta tecnología clonable"* es un argumento técnico que el competidor no puede sostener sin cambiar su parque.

---

### 3.5 Reglas de acceso avanzadas

El cliente pidió "grupos con conjunto de puertas". Eso es la base. Falta:

| # | Requerimiento | Sev | Descripción |
|---|---|---|---|
| RA-01 | **Horarios / franjas horarias** | 🟠 | El grupo Operativo accede a Bodega **solo** L-V 07:00–19:00. Sin esto, "grupo con puertas" es un permiso permanente 24/7. |
| RA-02 | **Calendario de feriados** | 🟠 | Feriados de Ecuador + días especiales por sitio. Un horario sin calendario falla el 1 de enero. |
| RA-03 | **Nivel de acceso como entidad** | 🟠 | Modelo correcto: `Persona → Grupo → NivelDeAcceso(Puerta × Horario)`. No `Grupo → Puertas`. Es la diferencia entre un producto y un traje a medida. |
| RA-04 | **Anti-passback** | 🟠 | Una credencial no puede entrar dos veces sin haber salido. Bloquea el préstamo de tarjeta. Modos: hard / soft (solo registra) / temporizado. |
| RA-05 | **Vigencia efectiva (effective dating)** | 🟠 | Permisos con `valid_from` / `valid_until`. Es la base técnica del requisito de vacaciones. |
| RA-06 | **Escolta / visitante acompañado** | 🟡 | El visitante solo pasa si un anfitrión válido pasa en ventana de N segundos. |
| RA-07 | **Regla de dos personas** | 🟡 | Zonas críticas requieren dos credenciales distintas. |
| RA-08 | **First-person-in** | 🟡 | Un área no se desbloquea por horario hasta que llega un supervisor. |
| RA-09 | **Esclusa / interlock (mantrap)** | 🟡 | Puerta B no abre si A está abierta. Relevante en puerto y en salas técnicas. |
| RA-10 | **Desbloqueo programado** | 🟡 | Puerta principal desbloqueada en horario de oficina. Debe respetar SV-06. |
| RA-11 | **Ocupación / aforo por zona** | 🔵 | Conteo en tiempo real de personas dentro de cada zona. Depende de anti-passback. |
| RA-12 | **Reporte de evacuación (muster)** | 🔵 | Listado de quién está dentro **ahora**, imprimible/exportable en un clic, disponible **offline** en la PWA del guardia. |

> 🔵 **RA-12 es probablemente el diferenciador comercial más potente del proyecto.** Es un requisito de seguridad industrial real, se deriva gratis de datos que ya tienes, y es lo primero que pregunta un jefe de seguridad industrial en una planta o puerto. Ningún sistema genérico de urbanizaciones lo ofrece.

---

### 3.6 El requisito de vacaciones y bajas — lo que realmente significa 🟠

El cliente lo planteó como "bloquear si sale de vacaciones o sale de la empresa". Traducido a requerimiento real:

- **VB-01** El estado de acceso de una persona **es un derivado**, no un campo editable a mano. Se calcula de: estado laboral + ausencias vigentes + documentos requeridos + credencial activa.
- **VB-02** Fuente de verdad del estado laboral: **¿RRHH lo va a alimentar, o Umbral es el sistema maestro?** Si es RRHH → hace falta integración (SFTP/CSV programado, API, o LDAP/AD). Si no hay integración, la baja de un empleado despedido depende de que alguien se acuerde de entrar al panel. Ese es el fallo de seguridad #1 en instalaciones reales.
- **VB-03** **Deprovisioning automático:** al vencer `valid_until` (fin de contrato, fin de vigencia de seguro/certificado), el acceso caduca solo. Sin acción humana.
- **VB-04** Contratistas: bloqueo automático por **documento vencido** (póliza, certificado de seguridad industrial, examen médico). Esto es oro en industrial y conecta directamente con el módulo de aprobaciones de proveedores de la ficha original.
- **VB-05** Reactivación al regreso de vacaciones: también automática por fecha, no manual.
- **VB-06** El bloqueo **nunca borra histórico**. Una persona bloqueada conserva todos sus eventos.

---

### 3.7 Cumplimiento de datos personales 🔴

**Ecuador tiene Ley Orgánica de Protección de Datos Personales (LOPDP), con régimen sancionador vigente desde 2023.** Un sistema que registra movimientos de personas dentro de una instalación procesa datos personales, y si se añade biometría (Fase 4), datos sensibles.

- **DP-01** Base de licitud y aviso de privacidad para empleados y visitantes.
- **DP-02** Política de retención por tipo de dato (eventos, fotos, videos) con **purga automática**. Guardar todo para siempre es un pasivo, no un activo.
- **DP-03** Minimización: la foto del visitante no tiene por qué vivir 5 años.
- **DP-04** Derechos ARCO: exportar/rectificar/eliminar datos de una persona.
- **DP-05** Biometría (Fase 4) requiere consentimiento explícito y evaluación de impacto. **Recomendación: no incluirla en el MVP.**
- **DP-06** Segregación: el operador de garita no debe poder consultar el histórico completo de recorridos del gerente general. El módulo de tracking (§14) necesita control de acceso propio y su propio log de auditoría — *quién consultó a quién*.

---

### 3.8 Operación y capacidad 🟠

| # | Requerimiento |
|---|---|
| OP-01 | **Sincronización horaria (NTP).** Sin reloj común, la auditoría y el tracking son basura. Los controladores deben tener RTC con batería y disciplinarse por NTP. |
| OP-02 | **Detección de tamper** en lector y en gabinete del controlador. |
| OP-03 | **Heartbeat y estado de dispositivo.** Un controlador caído debe generar alarma, no silencio. |
| OP-04 | **Actualización OTA firmada** de firmware, con rollback. |
| OP-05 | **Puesta en marcha (commissioning):** proceso de alta de un controlador con provisión de certificado. Sin esto, cualquiera enchufa un dispositivo al bus. |
| OP-06 | **Dimensionamiento:** ¿cuántas puertas, personas, eventos/día? Define si es Postgres solo o Postgres + TimescaleDB. |
| OP-07 | **Condiciones ambientales.** Si el sitio es portuario: salitre y humedad. Lectores IP65+ y gabinetes con protección adecuada. Un lector de interior dura meses frente al mar. |
| OP-08 | **Torniquetes, barreras vehiculares y ascensores:** ¿entran en alcance? Cambian el modelo de "puerta". |

---

## 4. Preguntas abiertas al cliente (bloqueantes)

**No se debe escribir código de producción hasta responder esto.** Recomendado enviarlo como cuestionario formal — además posiciona profesionalmente frente al competidor, que no las hace.

**Alcance físico**
1. ¿Cuántas puertas exactamente, y cuántas son ruta de evacuación?
2. ¿Cuántos sitios/edificios? ¿Es una instalación o varias?
3. ¿Torniquetes, barreras vehiculares o ascensores en alcance?
4. ¿Cuántas personas (empleados / contratistas / visitantes) y cuántos eventos/día estimados?

**Infraestructura existente**
5. ¿Ya hay lectores o tarjetas instalados? **¿Qué tecnología y frecuencia exactamente?** (define si hay migración)
6. ¿Qué cerraduras hay hoy en cada puerta? (levantamiento puerta por puerta)
7. ¿Hay contactos magnéticos de posición instalados? *(si no → §3.2 es partida presupuestaria nueva)*
8. ¿Hay central de detección de incendios? ¿Marca y modelo? ¿Tiene salida de contacto seco?
9. ¿Hay red cableada / PoE hasta cada puerta? ¿UPS?
10. ¿Directorio corporativo (Active Directory / LDAP / Google Workspace)?
11. ¿Sistema de RRHH? ¿Nombre y si expone API o exportaciones?

**Operación**
12. ¿Quién administra el sistema día a día — RRHH, Seguridad Física, o TI?
13. ¿Modelo de despliegue: on-premise en su datacenter, o nube privada?
14. ¿Requieren integración con CCTV existente? ¿Marca?
15. ¿Turnos rotativos? (impacta el modelo de horarios)
16. ¿Existe hoy un procedimiento de evacuación y roll-call? ¿En papel?

**Comercial / responsabilidad**
17. ¿Quién responde por la instalación eléctrica y la interfaz con incendios?
18. ¿Qué nivel de soporte esperan? (el competidor ofrece 24x7 — hay que tener respuesta)
19. ¿Modelo: licencia perpetua + mantenimiento, o suscripción?

---

## 5. Alcance MVP

### 5.1 Dentro

1. **Topología** — sitios, zonas, puertas, controladores, lectores. Configuración completa.
2. **Personas y credenciales** — empleados, contratistas, visitantes. N credenciales por persona (tarjeta DESFire, QR dinámico, NFC Android).
3. **Niveles de acceso** — `Puerta × Horario`, agrupados en grupos/roles. Calendario de feriados.
4. **Motor de decisión dual** — evaluación en el controlador (offline) y en servidor.
5. **Gateway de dispositivos** — MQTT sobre mTLS, adaptadores por fabricante.
6. **Eventos y auditoría** — append-only, encadenado por hash.
7. **Alertas** — DHO, DFO, tamper, dispositivo caído, coacción. Escalado configurable.
8. **Ciclo de vida** — vigencia efectiva, bloqueo/reactivación automáticos por ausencia o baja.
9. **PWA de guardia** — escaneo QR, consulta de persona, alarmas activas, **funcional sin red**.
10. **Consola de administración** — configuración total, sin tocar código.
11. **Reportes** — el paquete del §14.
12. **Muster / evacuación** — reporte offline en un clic.
13. **Notificaciones** — WhatsApp Cloud API + email + Web Push.
14. **Solicitud de acceso + workflow de aprobación** — heredado del alcance original (proveedores).

### 5.2 Fuera del MVP (explícito, en roadmap)

- Reconocimiento facial y cualquier biometría
- LPR / control vehicular por placa
- Integración con TOS portuario
- Control de ascensores
- App móvil nativa (la PWA cubre el MVP)
- Multi-tenant SaaS público *(el modelo es instancia dedicada por cliente en MVP; el diseño lo soporta)*

---

## 6. Modelo de dominio

Modular monolith con **Ports & Adapters**. Contextos acotados:

```
┌─────────────────────────────────────────────────────────────┐
│                      UMBRAL — Bounded Contexts               │
├──────────────────┬──────────────────┬───────────────────────┤
│ Identity         │ Credentials      │ Topology              │
│ · Persona        │ · Credencial     │ · Sitio               │
│ · Empleado       │ · Tipo (QR/NFC…) │ · Zona                │
│ · Contratista    │ · Ciclo de vida  │ · Puerta              │
│ · Visitante      │ · Bloqueo        │ · Controlador         │
│ · Estado laboral │ · Emisión        │ · Lector              │
│ · Ausencias      │                  │ · Perfil de cerradura │
├──────────────────┼──────────────────┼───────────────────────┤
│ AccessRights     │ Decision         │ DeviceGateway         │
│ · Horario        │ · Evaluador      │ · MQTT broker         │
│ · Calendario     │ · Anti-passback  │ · Adaptador OSDP      │
│ · NivelAcceso    │ · Reglas zona    │ · Adaptador ESP32     │
│ · Grupo          │ · Compilador de  │ · Adaptador vendor    │
│ · Asignación     │   matriz p/ edge │ · Provisioning        │
├──────────────────┼──────────────────┼───────────────────────┤
│ Events           │ Alerting         │ Analytics             │
│ · Evento acceso  │ · Motor reglas   │ · Agregados           │
│ · Audit log      │ · DHO/DFO/Tamper │ · Flujo y ocupación   │
│ · Hash chain     │ · Escalado       │ · Tracking            │
│ · Retención      │ · Deduplicación  │ · Anomalías           │
├──────────────────┼──────────────────┼───────────────────────┤
│ Workflow         │ Notifications    │ Compliance            │
│ · Solicitud      │ · WhatsApp       │ · Retención/purga     │
│ · Aprobación     │ · Email          │ · Derechos ARCO       │
│ · Máquina estado │ · Web Push       │ · Consentimiento      │
└──────────────────┴──────────────────┴───────────────────────┘
```

**Regla de dependencia:** `Decision` no conoce `DeviceGateway`. `DeviceGateway` implementa puertos definidos por `Decision`. Nada del dominio importa de infraestructura.

---

## 7. Arquitectura

### 7.1 Vista de despliegue

```
┌──────────────── CAPA FÍSICA (por puerta) ──────────────────┐
│                                                             │
│  [Lector QR/NFC/RFID] ──OSDP RS-485 (AES-128)──┐            │
│  [Botón REX] ──────────────────────────────────┤            │
│  [Contacto magnético DPS] ─────────────────────┤            │
│  [Tamper] ─────────────────────────────────────┤            │
│                                                 ▼           │
│                                        ┌──────────────────┐ │
│                                        │  CONTROLADOR     │ │
│                                        │  · Caché ACL     │ │
│  [Cerradura] ◄──── relé configurable ──│  · Decide OFFLINE│ │
│                                        │  · Buffer eventos│ │
│  [Central incendios] ──contacto seco───│  (bypass HW) ────┼─┼──► libera maglock
│                                        │  · RTC + NTP     │ │    sin pasar por SW
│  [UPS / batería]                       │  · OTA firmada   │ │
│                                        └────────┬─────────┘ │
└─────────────────────────────────────────────────┼───────────┘
                                                  │ MQTT / mTLS
                                                  ▼
┌──────────────── CAPA SERVIDOR (on-premise) ────────────────┐
│                                                             │
│  ┌───────────┐   ┌──────────────────────────────────────┐  │
│  │ EMQX      │◄─►│  NestJS 11 (Fastify)                 │  │
│  │ MQTT      │   │  ├─ device-gateway (MQTT ingest)     │  │
│  │ broker    │   │  ├─ decision (mirror + compilador)   │  │
│  └───────────┘   │  ├─ access-rights                    │  │
│                  │  ├─ identity / credentials           │  │
│  ┌───────────┐   │  ├─ events (append-only)             │  │
│  │ Valkey    │◄─►│  ├─ alerting (rules engine)          │  │
│  │ cache/pub │   │  ├─ analytics                        │  │
│  └───────────┘   │  ├─ workflow                         │  │
│                  │  └─ notifications (BullMQ)           │  │
│  ┌───────────┐   └──────────────┬───────────────────────┘  │
│  │ MinIO     │                  │                          │
│  │ (fotos)   │   ┌──────────────▼───────────────────────┐  │
│  └───────────┘   │  PostgreSQL 17 + TimescaleDB          │  │
│                  │  · OLTP: personas, puertas, reglas    │  │
│  ┌───────────┐   │  · Hypertable: access_events          │  │
│  │ Keycloak  │   │  · Continuous aggregates (reportes)   │  │
│  │ (opc. AD) │   └───────────────────────────────────────┘  │
│  └───────────┘                                              │
│                                                             │
│  Observabilidad: Prometheus + Grafana + Loki + OTel          │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS / WSS (Traefik + mTLS opc.)
                              ▼
┌──────────────── CAPA CLIENTE ──────────────────────────────┐
│  Angular 22 · zoneless · Signals · standalone               │
│  ├─ Consola de administración (desktop)                     │
│  ├─ PWA de guardia (móvil/tablet) — OFFLINE-FIRST           │
│  │    · escaneo QR local · verificación por clave pública   │
│  │    · CRL sincronizada · muster offline                   │
│  └─ Portal de proveedores (solicitud de acceso, público)    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Principios de arquitectura

1. **Local-first en la puerta.** El servidor puede estar caído una semana y las puertas siguen funcionando con la ACL cacheada. Los eventos se bufferizan y se envían al reconectar.
2. **La seguridad de vida no pasa por software.** La liberación por incendio es un bypass eléctrico. El software se entera, no decide.
3. **Todo evento es inmutable.** Nunca `UPDATE` ni `DELETE` sobre `access_events`. Solo `INSERT`.
4. **Hardware detrás de puertos.** Cambiar de controlador ESP32 propio a Suprema o HID Aero es escribir un adaptador, no reescribir el dominio.
5. **La configuración es dato, no código.** Ver §16.
6. **Modular monolith primero.** Nada de microservicios para 50 puertas. La modularidad es de código, no de red. Si un módulo debe extraerse después, los puertos ya están.

---

## 8. Hardware — abstracción de software y arquitectura física

### 8.1 Estrategia de controlador — decisión recomendada

Tres caminos:

| Opción | Ventaja | Riesgo | Veredicto |
|---|---|---|---|
| **A. Controlador comercial** (Suprema, HID Aero, ZKTeco, Mercury) | Certificado, probado, sin responsabilidad de hardware | Costo, márgenes, menos diferenciación | ✅ **Piloto** |
| **B. Controlador ESP32 propio** | Costo bajísimo, diferenciación, tu especialidad | **Tú respondes** por una placa artesanal en una puerta de evacuación. Certificación, EMC, envejecimiento, RMA. | ⚠️ No para la primera venta |
| **C. Híbrido con capa de adaptadores** | Vendes con hardware certificado; reduces costo después sin tocar el producto | Más trabajo de diseño inicial | ✅ **Recomendado** |

**Recomendación firme: Opción C.**

Se define un **puerto `DoorControllerPort`** en el dominio. El piloto se entrega con controlador comercial. En paralelo, la placa ESP32-S3 propia se desarrolla y se certifica **primero en puertas no críticas** (bodega, sala técnica, torniquete interior), y nunca en ruta de evacuación hasta tener certificación y horas de campo.

> El instinto de ir directo al ESP32 es entendible y económicamente correcto a largo plazo. Pero poner una placa propia sin certificar en una puerta de evacuación de tu **primer cliente** es cómo se pierde un negocio entero por ahorrar \$200 por puerta.

### 8.2 Matriz de cerraduras

Esta tabla es la que hay que llenar **puerta por puerta** en el levantamiento:

| Tipo de cerradura | Modo por defecto | Actuación | Requiere REX | Libera por incendio | Notas |
|---|---|---|---|---|---|
| **Electromagnética (maglock)** | Fail-safe | Mantenida (corta energía para abrir) | ✅ Obligatorio | ✅ **Obligatorio** | 300/600 lb. Consume permanentemente. Nunca sin SV-02. |
| **Cerradero eléctrico NC** (fail-secure) | Fail-secure | Pulso 0.5–3 s | ✅ | ❌ | El más común. Manija interior siempre abre. |
| **Cerradero eléctrico NO** (fail-safe) | Fail-safe | Mantenida | ✅ | ✅ | |
| **Cerradura de embutir motorizada** | Fail-secure | Pulso | ✅ | ❌ | |
| **Pestillo electromagnético (drop bolt)** | Fail-safe | Mantenida | ✅ | ✅ | |
| **Torniquete** | — | Pulso + dirección | ❌ | Modo caída de brazo | Necesita señal de sentido |
| **Barrera vehicular** | — | Pulso abrir/cerrar | ❌ | ❌ | Lazo magnético o fotocelda |
| **Puerta corrediza automática** | Fail-safe | Pulso a controlador de puerta | ❌ | ✅ | Suele tener su propio controlador |

### 8.3 El perfil de actuación configurable

Aquí se cumple el requisito "todos los parámetros configurables". La puerta no tiene un tipo hardcodeado: tiene un **perfil**.

```typescript
// domain/topology/lock-profile.vo.ts

export const LockActuationMode = {
  /** Pulso: energiza N ms y vuelve. Cerraderos, torniquetes, barreras. */
  PULSE: 'pulse',
  /** Mantenida: mantiene el estado durante la ventana de acceso. Maglocks. */
  MAINTAINED: 'maintained',
  /** Conmutada: alterna estado. Desbloqueo programado. */
  TOGGLE: 'toggle',
} as const;
export type LockActuationMode =
  (typeof LockActuationMode)[keyof typeof LockActuationMode];

export const FailState = {
  /** Sin energía → ABIERTA. Obligatorio en ruta de evacuación. */
  FAIL_SAFE: 'fail_safe',
  /** Sin energía → CERRADA. Solo zonas críticas sin evacuación. */
  FAIL_SECURE: 'fail_secure',
} as const;
export type FailState = (typeof FailState)[keyof typeof FailState];

export interface LockProfile {
  readonly id: LockProfileId;
  readonly name: string;

  readonly actuationMode: LockActuationMode;
  /** Solo aplica a PULSE. */
  readonly pulseDurationMs: number;          // 100–10000
  /** Solo aplica a MAINTAINED. */
  readonly unlockWindowMs: number;           // ventana tras concesión

  readonly failState: FailState;
  /** true si el relé es NC (energizado = cerrado). */
  readonly relayInverted: boolean;

  // --- Sensores ---
  readonly hasDoorPositionSensor: boolean;
  readonly hasRexInput: boolean;
  readonly hasTamperInput: boolean;

  // --- Temporizaciones (§3.2) ---
  /** Segundos abierta antes de DHO. null = sensor ausente, alerta imposible. */
  readonly heldOpenTimeoutSec: number | null;   // default 30
  /** Pre-aviso sonoro en el lector antes del DHO. */
  readonly heldOpenPrewarnSec: number | null;   // default 10
  /** Ventana tras REX en la que el DPS abriendo NO es puerta forzada. */
  readonly rexGraceSec: number;                 // default 8
  /** Rebote del contacto magnético. */
  readonly dpsDebounceMs: number;               // default 500

  // --- Seguridad de vida (§3.1) ---
  readonly isEgressRoute: boolean;
  readonly releasesOnFireAlarm: boolean;
}
```

**Invariantes de dominio que el sistema debe rechazar en tiempo de configuración:**

```typescript
// domain/topology/lock-profile.invariants.ts

export function assertLockProfileIsValid(p: LockProfile): void {
  // Una puerta de evacuación NUNCA puede quedarse cerrada sin energía.
  if (p.isEgressRoute && p.failState === FailState.FAIL_SECURE) {
    throw new DomainError(
      'LIFE_SAFETY_VIOLATION',
      'Una puerta en ruta de evacuación no puede ser fail-secure.',
    );
  }

  // Una maglock en ruta de evacuación debe liberar por incendio.
  if (p.isEgressRoute && !p.releasesOnFireAlarm) {
    throw new DomainError(
      'LIFE_SAFETY_VIOLATION',
      'Una puerta en ruta de evacuación debe liberar ante alarma de incendio.',
    );
  }

  // Sin sensor de posición no existe la alerta de puerta abierta.
  if (!p.hasDoorPositionSensor && p.heldOpenTimeoutSec !== null) {
    throw new DomainError(
      'INVALID_CONFIG',
      'No se puede configurar alerta de puerta abierta sin contacto magnético (DPS).',
    );
  }

  // Sin REX, cada salida legítima dispara puerta forzada.
  if (!p.hasRexInput && p.hasDoorPositionSensor) {
    throw new DomainWarning(
      'FORCED_OPEN_FALSE_POSITIVES',
      'Sin REX, las salidas legítimas se registrarán como puerta forzada.',
    );
  }

  if (p.actuationMode === LockActuationMode.PULSE &&
      (p.pulseDurationMs < 100 || p.pulseDurationMs > 10_000)) {
    throw new DomainError('INVALID_CONFIG', 'pulseDurationMs fuera de rango.');
  }
}
```

> Que el sistema **se niegue** a guardar una configuración que dejaría gente encerrada en un incendio es, por sí solo, un argumento de venta. Ningún producto genérico valida eso: te deja poner lo que quieras y el problema aparece el día del simulacro.

### 8.4 Puerto de controlador

```typescript
// domain/ports/door-controller.port.ts

export interface DoorControllerPort {
  readonly vendor: string;

  /** Empuja la ACL compilada al dispositivo para operación offline. */
  pushAccessMatrix(
    controllerId: ControllerId,
    matrix: CompiledAccessMatrix,
  ): Promise<Result<void, DeviceError>>;

  /** Comando de apertura remota (operador). */
  grantAccess(
    doorId: DoorId,
    profile: LockProfile,
    reason: GrantReason,
  ): Promise<Result<void, DeviceError>>;

  /** Bloqueo de emergencia por zona. Respeta free egress. */
  setLockdown(scope: LockdownScope, active: boolean): Promise<Result<void, DeviceError>>;

  /** Stream de eventos crudos del dispositivo. */
  events$: Observable<RawDeviceEvent>;

  /** Salud, tamper, batería, versión de firmware. */
  health(controllerId: ControllerId): Promise<ControllerHealth>;

  /** Reloj. Sin esto la auditoría no vale nada. */
  syncClock(controllerId: ControllerId): Promise<Result<void, DeviceError>>;
}
```

Adaptadores previstos: `Esp32OsdpAdapter` (propio), `SupremaAdapter`, `ZktecoAdapter`, `HidAeroAdapter`, `SimulatorAdapter` (tests y demos comerciales sin hardware).

> 🔵 El `SimulatorAdapter` merece mención comercial aparte: te permite hacer la **demo al puerto sin llevar hardware**, con puertas virtuales que abren, se quedan abiertas y disparan alertas en pantalla. Es exactamente lo que destraba la reunión.

### 8.5 Arquitectura física por puerta

Cada puerta controlada es un **nodo físico** con un conjunto fijo de componentes. Este es el diagrama de referencia que se replica en cada acceso y que guía el levantamiento y el presupuesto.

```
                        ┌───────────────── PUERTA (nodo físico) ─────────────────┐
                        │                                                         │
   Lado EXTERIOR        │   Lado INTERIOR                                         │
   (no seguro)          │   (zona segura)                                        │
                        │                                                         │
  ┌───────────────┐     │   ┌───────────────┐        ┌─────────────────────┐     │
  │ LECTOR entrada│     │   │ LECTOR salida  │        │  BOTÓN REX          │     │
  │ QR+NFC+DESFire│     │   │ (opcional, APB)│        │  (o PIR de salida)  │     │
  └───────┬───────┘     │   └───────┬────────┘        └──────────┬──────────┘     │
          │ OSDP RS-485 │           │ OSDP                        │ contacto seco  │
          │ (AES-128)   │           │                             │                │
          └─────────────┼───────────┴──────────────┬──────────────┘                │
                        │                           ▼                               │
                        │              ┌─────────────────────────┐                  │
   ┌────────────────┐   │              │   CONTROLADOR DE PUERTA │                  │
   │ CONTACTO        │──┼── entrada ──►│   (1–4 puertas)         │                  │
   │ MAGNÉTICO (DPS) │   │              │                         │                  │
   └────────────────┘   │              │  · Decide OFFLINE        │                  │
                        │              │  · Buffer de eventos    │                  │
   ┌────────────────┐   │              │  · RTC + NTP            │                  │
   │ SENSOR TAMPER   │──┼── entrada ──►│  · Relés de salida      │───┐              │
   │ (gabinete)      │   │              └────────────┬────────────┘   │              │
   └────────────────┘   │                           │ relé NA/NC      │              │
                        │                           ▼                 │              │
   ┌────────────────┐   │              ┌─────────────────────────┐    │              │
   │ CENTRAL INCENDIO│──┼─ contacto ──►│  CORTE DE SEGURIDAD DE  │◄───┘              │
   │ (contacto seco) │   │   en serie   │  VIDA (bypass por HW)   │                  │
   └────────────────┘   │              └────────────┬────────────┘                  │
                        │                           ▼                               │
                        │                  ┌──────────────────┐                     │
                        │                  │   CERRADURA      │                     │
                        │                  │ (según perfil §8.3)│                    │
                        │                  └──────────────────┘                     │
                        └─────────────────────────────────────────────────────────┘

  Alimentación:  PoE (dato+energía) → controlador → fuente de cerradura (12/24 V)
                 UPS/batería centralizada en rack ── autonomía ≥ 4 h
  Red:           VLAN dedicada de control de acceso, sin salida a internet
```

**Puntos que el diagrama vuelve innegociables:**

- El **contacto magnético (DPS)** es entrada obligatoria si se quiere la alerta de puerta abierta (§3.2). Sin él, ese cable no existe y la feature tampoco.
- La señal de **incendio corta la alimentación de la cerradura por hardware**, en serie, **antes** de llegar al relé del controlador. El software se entera por una entrada digital y registra el evento, pero **no participa en la liberación**. Esta es la diferencia entre un sistema instalable y uno que deja gente encerrada.
- El **REX** entra directo al controlador y abre una ventana de gracia (`rex_grace_sec`) durante la cual la apertura del DPS no es "puerta forzada".

### 8.6 Componentes de hardware — análisis y selección

#### 8.6.1 Controlador de puerta

| Criterio | Opción A · Comercial (piloto) | Opción B · ESP32-S3 propio (Fase 2) |
|---|---|---|
| Ejemplos | Suprema CoreStation, HID Aero X1100, ZKTeco C3/inBio | Placa propia UMBRAL-DC1 |
| Puertas por unidad | 2–4 | 1–2 (diseño), escalable |
| Protocolo lector | OSDP nativo | OSDP vía `libosdp` |
| Decisión offline | ✅ nativa | ✅ matriz compilada en flash |
| Certificación | ✅ (UL/CE del fabricante) | ⚠️ tú la gestionas |
| Costo/puerta aprox. | alto | bajo |
| **Veredicto** | **Primer cliente y toda puerta de evacuación** | **Puertas no críticas tras certificar** |

**Diseño de la placa propia UMBRAL-DC1** (referencia de ingeniería, Fase 2):

- **MCU:** ESP32-S3-WROOM-1 (dual core 240 MHz, 8 MB PSRAM, aceleración cripto por HW)
- **Red:** módulo Ethernet **W5500** con **PoE (802.3af)** vía módulo aislado → un solo cable por puerta
- **Lector:** transceptor **RS-485 (MAX485/THVD1450)** para OSDP Secure Channel
- **Salidas de cerradura:** 2× relé de estado sólido o relé mecánico con **optoacoplador**, protección con **diodo flyback** y **MOV** (crítico: las maglocks generan picos inductivos que matan MCUs sin protección)
- **Entradas supervisadas:** DPS, REX, tamper, incendio — con **resistencias de fin de línea (EOL)** para detectar corte o puente de cable (un atacante que corta el sensor debe delatarse)
- **Reloj:** **RTC DS3231** (±2 ppm) con batería CR2032 → hora fiable sin red
- **Alimentación de cerradura:** salida **12/24 V** conmutada con fusible rearmable, independiente de la lógica
- **Respaldo:** entrada para batería LiFePO4 o alimentación desde UPS del rack
- **Seguridad física:** interruptor **tamper** en la tapa del gabinete
- **Boot seguro:** Secure Boot v2 + Flash Encryption + certificado por dispositivo en **eFuse**
- **Gabinete:** metálico con cerradura; **IP65** si es intemperie/portuario

> El diodo flyback y el MOV parecen detalle de aficionado hasta que una maglock de 600 lb te quema tres placas en campo. En control de acceso, la protección de la salida inductiva **es** el diseño.

#### 8.6.2 Lectores

| Tecnología | Modelo tipo | Uso recomendado |
|---|---|---|
| **OSDP multi-tec (DESFire + NFC + BLE)** | HID Signo, Suprema Xpass, rfIDEAS | Estándar del proyecto en puertas fijas |
| **Lector con teclado (PIN / coacción)** | idem con keypad | Zonas de nivel 3+ (multifactor, duress) |
| **Cámara/escáner QR** | el propio teléfono/tablet del guardia | Garitas, visitantes, accesos sin lector fijo |
| **RFID 125 kHz / MIFARE Classic** | — | ❌ Prohibido (§3.3). Solo migración documentada. |

**Criterios de compra no negociables:**
- **OSDP v2.2 con Secure Channel** — descartar cualquier lector solo-Wiegand.
- **DESFire EV2/EV3** — descartar lectores que solo lean UID (el UID se clona; la autenticación mutua no).
- **IP65+** y rango −10 a 55 °C si hay exposición exterior o salitre.
- Señalización LED + buzzer controlable por OSDP (pre-alarma de DHO, §3.2).

#### 8.6.3 Sensores y periféricos por puerta

| Componente | Función | Nota de instalación |
|---|---|---|
| **Contacto magnético (DPS)** | Detectar hoja abierta/cerrada | Obligatorio para DHO/DFO. Preferir **supervisado (EOL)** en zonas críticas. |
| **Botón REX** | Salida legítima sin credencial | Contacto seco al controlador. |
| **PIR de salida** (alternativa a REX) | Salida sin pulsar botón | Cuidado: puede abrir por movimiento no deseado. |
| **Barra antipánico / manija** | Free egress mecánico (SV-01) | **Independiente del software.** Salida siempre posible. |
| **Zumbador/sirena local** | Alarma audible de DHO/DFO | En el lector o pieza aparte. |
| **Interfaz de incendio** | Liberar maglocks (SV-02) | Contacto seco NC en serie con la fuente de la cerradura. |

#### 8.6.4 Actuadores de cerradura

Ver §8.2 para la matriz completa. Resumen de compra:

- **Maglock (electroimán):** solo en puertas de evacuación **con** interfaz de incendio garantizada. Fail-safe siempre.
- **Cerradero eléctrico fail-secure (NC):** el caballo de batalla para puertas interiores no de evacuación.
- **Fuente de cerradura separada:** nunca alimentar la cerradura desde la lógica del controlador. Fuente dedicada 12/24 V con su fusible.

### 8.7 Topología de red y energía

```
        INTERNET ──✕── (los controladores NO salen a internet)
            │
        ┌───┴────┐
        │ Router │
        │  / FW  │
        └───┬────┘
            │  VLAN gestión / VLAN corporativa
     ┌──────┴───────────────────────────────────┐
     │            SERVIDOR UMBRAL                │  (on-premise: NestJS, Postgres,
     │         (rack, con UPS propio)            │   EMQX, Valkey, MinIO, Grafana)
     └──────┬────────────────────────────────────┘
            │  VLAN dedicada de CONTROL DE ACCESO (aislada)
     ┌──────┴──────┐
     │ Switch PoE  │──── UPS del rack ──── autonomía ≥ 4 h
     │ (802.3af/at)│
     └──┬───┬───┬──┘
        │   │   │  un cable PoE por puerta (dato + energía)
        ▼   ▼   ▼
     [DC1][DC2][DC3] ... controladores de puerta
        │
        └── cada controlador alimenta su cerradura y supervisa sus sensores
```

**Decisiones de red y energía:**

- **Un solo cable PoE por puerta.** Ethernet + energía en el mismo tendido. Reduce costo de instalación y centraliza el respaldo de energía en el rack, en vez de una batería por puerta.
- **VLAN dedicada y aislada** para el control de acceso, **sin ruta a internet**. Un controlador comprometido no puede exfiltrar ni ser alcanzado desde fuera.
- **mTLS** entre controlador y broker EMQX: cada dispositivo con su certificado; uno robado se revoca sin tocar los demás.
- **WiFi solo como respaldo** de última milla en puertas donde cablear sea inviable — nunca como enlace primario de una puerta crítica.
- **UPS centralizado** dimensionado para ≥ 4 h; en portuario, considerar más por cortes frecuentes.
- **Fail-safe ante corte total:** cuando cae la energía y se agota el UPS, cada puerta cae al estado definido por su `fail_state` (§8.3) — que en evacuación es **abierta**, por diseño y por hardware.

### 8.8 Kit de demo (sin instalación en sitio)

Para la reunión comercial, un maletín reproduce el sistema completo sin tocar el edificio del cliente:

| Componente | Cantidad |
|---|---|
| Controlador (comercial o UMBRAL-DC1) | 1 |
| Lector OSDP multi-tecnología | 1 |
| Cerradero eléctrico de muestra + fuente | 1 |
| Contacto magnético + botón REX | 1 c/u |
| Switch PoE pequeño + mini-UPS | 1 |
| Tablet con la PWA/app de guardia | 1 |
| Juego de tarjetas DESFire + QR impresos | varios |

> Alternativa cero-hardware: el **`SimulatorAdapter`** (§8.4) corre la demo íntegra en pantalla. El maletín se reserva para el cliente que exige "tocar" el equipo.

---

## 9. Motor de decisión dual (edge + servidor)

**El problema:** la misma regla debe evaluarse en un ESP32 sin red y en el servidor. Duplicar lógica en TypeScript y en C es garantía de divergencia y de bugs de seguridad.

**La solución: compilar, no reimplementar.**

El servidor compila las reglas a una **matriz de acceso binaria compacta** y la firma. El controlador solo evalúa esa matriz — no conoce el concepto de "vacaciones" ni de "grupo", solo credencial × puerta × ventana temporal.

```
Reglas ricas (servidor)                    Matriz compilada (edge)
─────────────────────                      ───────────────────────
Persona → Grupo Operativo                  credential_hash (8B)
Grupo → NivelAcceso "Bodegas"        ═══►  door_bitmap    (16B)  ← hasta 128 puertas
NivelAcceso → Puertas {3,4,7} ×            schedule_id    (1B)
              Horario L-V 07-19            valid_from     (4B)
Ausencia vigente 01/08–15/08               valid_until    (4B)
Contrato vence 31/12                       flags          (1B)  ← APB, duress, escort
Póliza vigente                             ───────────────────
                                           34 bytes/credencial
                                           10.000 credenciales ≈ 340 KB → cabe en flash
```

```typescript
// application/decision/access-decision.service.ts

@Injectable()
export class AccessDecisionService {
  /**
   * Evaluación autoritativa en servidor. Espejo exacto de la lógica
   * que el firmware aplica sobre la matriz compilada.
   * Toda negación devuelve un motivo — nunca un booleano desnudo.
   */
  async evaluate(req: AccessRequest): Promise<AccessDecision> {
    const credential = await this.credentials.findActive(req.credentialRef);
    if (!credential) return AccessDecision.deny('CREDENTIAL_UNKNOWN');
    if (credential.isBlocked) return AccessDecision.deny('CREDENTIAL_BLOCKED');
    if (credential.isExpired(req.at)) return AccessDecision.deny('CREDENTIAL_EXPIRED');

    const person = await this.people.byId(credential.personId);
    const status = await this.lifecycle.effectiveStatus(person.id, req.at);
    if (!status.isActive) {
      // ausencia, baja, documento vencido, suspensión
      return AccessDecision.deny(status.reasonCode, { until: status.until });
    }

    const rights = await this.rights.effectiveFor(person.id, req.at);
    if (!rights.grantsDoor(req.doorId)) return AccessDecision.deny('NO_PERMISSION');
    if (!rights.scheduleAllows(req.doorId, req.at)) {
      return AccessDecision.deny('OUTSIDE_SCHEDULE', {
        nextWindow: rights.nextWindow(req.doorId, req.at),
      });
    }

    const zone = await this.topology.zoneBehind(req.doorId);
    const apb = await this.antiPassback.check(person.id, zone, req.direction);
    if (apb.violated && apb.mode === 'hard') {
      return AccessDecision.deny('ANTI_PASSBACK');
    }

    if (zone.requiresTwoPerson && !(await this.twoPerson.satisfied(zone, req.at))) {
      return AccessDecision.deny('TWO_PERSON_REQUIRED');
    }

    if (await this.lockdown.isActive(zone)) {
      return AccessDecision.deny('LOCKDOWN_ACTIVE');
    }

    return AccessDecision.grant({
      personId: person.id,
      softApbViolation: apb.violated && apb.mode === 'soft',
    });
  }
}
```

**Regla de oro:** las pruebas del motor de decisión son un **vector de casos compartido** (fixtures JSON) que se ejecuta contra la implementación TypeScript **y** contra el firmware en CI. Si divergen, falla el build. Esto es lo que evita que un ESP32 abra una puerta que el servidor habría negado.

**Degradación offline configurable por puerta:**

| Modo | Comportamiento sin red |
|---|---|
| `cached` | Decide con la matriz cacheada. **Default recomendado.** |
| `deny_all` | Niega todo. Zonas de máxima criticidad. |
| `allow_known` | Permite cualquier credencial conocida, ignorando horarios. Para no bloquear operación. |
| `unlocked` | Libera la puerta. Solo con aprobación explícita del cliente. |

---

## 10. Stack tecnológico

Sin Supabase, on-premise, alineado a Angular 22 + NestJS.

### 10.1 Consola de administración (web)

| Componente | Elección | Justificación |
|---|---|---|
| Framework | **Angular 22** | Requisito. Standalone + Signals + **zoneless**. |
| Estado | **Signals** + `@ngrx/signals` SignalStore | Signals para local, SignalStore para el estado de la consola en vivo. NgRx clásico es exceso aquí. |
| Realtime | **WebSocket nativo** + `signalStore` | Alarmas y estado de puertas en vivo. |
| Async | **RxJS** | Solo para streams reales (WS, eventos). No para estado. |
| UI | **Angular Material 22** + tokens propios | Velocidad. La consola es densa en datos, no es marketing. |
| Mapas/plano | **SVG + D3** o **Leaflet** con plano CAD como capa | Para el mapa de tracking (§14). SVG interactivo sobre el plano de planta. |
| Gráficos | **ECharts** | Heatmaps y series temporales sin pelear. |
| Tests | **Vitest** + **Playwright** | |

### 10.2 App del guardia — decisión Ionic vs Flutter vs PWA

**Decisión: Ionic + Angular + Capacitor.** Un solo codebase que corre como PWA en el navegador y como app nativa cuando se necesita hardware. Justificación para un desarrollador único:

| Opción | Lenguaje | NFC/RFID | BLE | QR | Offline | Veredicto para dev solo |
|---|---|---|---|---|---|---|
| **Ionic + Angular + Capacitor** | **TypeScript (Angular, ya lo dominas)** | ✅ plugin nativo | ✅ plugin | ✅ | ✅ SW + SQLite | ✅ **Elegido.** Cero lenguaje nuevo, un solo codebase web+nativo. |
| Flutter | Dart (nuevo) | ✅ | ✅ | ✅ | ✅ | ❌ Segundo lenguaje y ecosistema. Ganancia de rendimiento irrelevante aquí. |
| PWA pura | TypeScript | ⚠️ Web NFC **solo Chrome Android, no iOS** | ⚠️ Web BLE limitado | ✅ | ✅ | ⚠️ Sirve para QR, se queda corta para NFC. |

**Regla mental:** *QR lo resuelve la cámara (web y nativo). NFC/RFID y BLE exigen Capacitor.* Por eso el proyecto es Ionic+Capacitor desde el día uno, aunque en el MVP la mayoría de garitas arranquen solo con QR.

| Componente | Elección | Justificación |
|---|---|---|
| Shell | **Ionic 8 + Angular 22** | Reutiliza Angular; UI móvil lista. |
| Runtime nativo | **Capacitor** | Acceso a NFC, BLE, cámara solo cuando se instala como app. |
| NFC | `@capawesome-team/capacitor-nfc` (o plugin equivalente) | Leer DESFire en Android. En iOS, ver ⚠️ §3.3. |
| QR | `@capacitor-mlkit/barcode-scanning` | Escaneo robusto en web y nativo. |
| Offline | **Service Worker** + **SQLite** (`@capacitor-community/sqlite`) | ACL y CRL locales; muster sin red. |
| Cripto offline | **WebCrypto (ES256)** | Verificar QR firmado y muster sin servidor. |
| Push | **Web Push** (PWA) / **FCM** (nativo) | Alarmas al guardia. |

> La consola (§10.1) y la app del guardia comparten el mismo dominio de UI en Angular. No son dos productos: son dos *targets* del mismo monorepo frontend, y la app del guardia es la que gana capacidades nativas al empaquetarse con Capacitor.

### 10.3 Backend

| Componente | Elección | Justificación |
|---|---|---|
| Framework | **NestJS 11** con **Fastify** | Requisito. Fastify por throughput de ingesta de eventos. |
| Lenguaje | **TypeScript strict** | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. |
| ORM | **Drizzle ORM** | SQL tipado sin capa mágica. Crítico porque el 60% de las consultas de reportes son SQL con ventanas y agregados sobre TimescaleDB, donde un ORM pesado estorba. *(Alternativa: TypeORM si se prioriza familiaridad sobre control.)* |
| Validación | **Zod** + `nestjs-zod` | Un solo esquema para DTO, OpenAPI y tipo TS. |
| Resultado | **`neverthrow`** | `Result<T,E>` explícito en el dominio. Las excepciones no son control de flujo en decisiones de seguridad. |
| Colas | **BullMQ** | Notificaciones, generación de reportes, purga por retención. |
| Auth | **Passport + JWT** (access corto + refresh rotativo) | Base propia. |
| SSO | **Keycloak** *(adaptador opcional)* | Solo si el cliente tiene Active Directory. Es un puerto, no una dependencia. |
| Hash | **argon2id** | Nunca bcrypt para nuevo desarrollo. |
| API | **REST + OpenAPI** | Un PACS se integra con RRHH y CCTV. GraphQL aquí no aporta. |
| Tests | **Vitest** + **Testcontainers** | Postgres real en integración. |

### 10.4 Datos e infraestructura

| Componente | Elección | Justificación |
|---|---|---|
| Base OLTP | **PostgreSQL 17** | |
| Series temporales | **TimescaleDB** (extensión) | `access_events` es una hypertable. Millones de filas, particionado automático, **continuous aggregates** que precalculan los reportes de flujo. Es lo que hace que "día de mayor flujo del último año" responda en milisegundos. |
| Caché / pub-sub | **Valkey** (fork de Redis) | Sesiones, estado de puertas, anti-passback, backend de BullMQ. Valkey por licencia BSD. |
| Broker IoT | **EMQX** | MQTT 5 sobre **mTLS**, ACL por dispositivo. Escala a miles de controladores. Mosquitto solo si el cliente exige mínima huella. |
| Objetos | **MinIO** | Fotos de credencial y adjuntos. S3-compatible, on-premise. |
| Proxy | **Traefik** | TLS, mTLS para dispositivos, routing. |
| Observabilidad | **Prometheus + Grafana + Loki + OpenTelemetry** | Reutilizado de PortAI. Grafana además sirve dashboards operativos al cliente sin construirlos. |
| Despliegue | **Docker Compose** (piloto) → **K3s** (escala) | On-premise. Nada de Railway/Vercel: el cliente quiere sus datos en casa. |
| Backup | **pgBackRest** + retención | Un PACS sin backup verificado es un incidente esperando fecha. |
| Secretos | **Docker secrets** → **HashiCorp Vault** (fase 2) | |

### 10.5 Firmware del controlador propio (Fase 2)

| Componente | Elección |
|---|---|
| MCU | **ESP32-S3** (dual core, PSRAM, cripto por HW) |
| SDK | **ESP-IDF 5.x** (C) — no Arduino en producción |
| Lector | **OSDP v2.2 Secure Channel** sobre RS-485 (`libosdp`) |
| Transporte | **MQTT 5 sobre TLS mutuo** |
| Almacenamiento | **NVS** (config) + **SPIFFS/LittleFS** (matriz ACL + buffer de eventos) |
| Reloj | **RTC DS3231** con batería + disciplina NTP |
| Seguridad | **Secure Boot v2** + **Flash Encryption** + certificado por dispositivo en eFuse |
| OTA | A/B particionado, firma verificada, rollback automático |
| Conectividad | **Ethernet PoE** primario, WiFi como respaldo |

> PoE no es un detalle: en una puerta quieres un solo cable que lleve datos y energía, y un UPS centralizado en el rack en vez de una batería por puerta.

---

## 11. Modelo de datos

Esquema núcleo (PostgreSQL + TimescaleDB). Se omiten índices secundarios por brevedad.

```sql
-- ============ TOPOLOGÍA ============

CREATE TABLE sites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  timezone      text NOT NULL DEFAULT 'America/Guayaquil',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE zones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES sites(id),
  parent_id     uuid REFERENCES zones(id),          -- jerarquía de zonas
  code          text NOT NULL,
  name          text NOT NULL,
  security_level smallint NOT NULL DEFAULT 1,       -- 1..5
  -- Reglas de zona
  anti_passback     text NOT NULL DEFAULT 'off'
                    CHECK (anti_passback IN ('off','soft','hard','timed')),
  apb_reset_sec     int,
  requires_two_person boolean NOT NULL DEFAULT false,
  occupancy_limit   int,                             -- aforo; null = sin límite
  interlock_group   uuid,                            -- esclusa
  UNIQUE (site_id, code)
);

CREATE TABLE lock_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  actuation_mode     text NOT NULL CHECK (actuation_mode IN ('pulse','maintained','toggle')),
  pulse_duration_ms  int  NOT NULL DEFAULT 1500 CHECK (pulse_duration_ms BETWEEN 100 AND 10000),
  unlock_window_ms   int  NOT NULL DEFAULT 5000,
  fail_state         text NOT NULL CHECK (fail_state IN ('fail_safe','fail_secure')),
  relay_inverted     boolean NOT NULL DEFAULT false,
  has_dps            boolean NOT NULL DEFAULT false,
  has_rex            boolean NOT NULL DEFAULT false,
  has_tamper         boolean NOT NULL DEFAULT false,
  held_open_timeout_sec int,        -- NULL obligatorio si has_dps = false
  held_open_prewarn_sec int,
  rex_grace_sec      int NOT NULL DEFAULT 8,
  dps_debounce_ms    int NOT NULL DEFAULT 500,
  is_egress_route      boolean NOT NULL DEFAULT false,
  releases_on_fire     boolean NOT NULL DEFAULT false,

  -- Invariantes de seguridad de vida en la propia base de datos.
  CONSTRAINT chk_egress_failsafe
    CHECK (NOT is_egress_route OR fail_state = 'fail_safe'),
  CONSTRAINT chk_egress_fire_release
    CHECK (NOT is_egress_route OR releases_on_fire),
  CONSTRAINT chk_dho_needs_sensor
    CHECK (has_dps OR held_open_timeout_sec IS NULL)
);

CREATE TABLE controllers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        uuid NOT NULL REFERENCES sites(id),
  vendor         text NOT NULL,             -- 'esp32-umbral' | 'suprema' | 'zkteco'...
  serial         text NOT NULL UNIQUE,
  firmware       text,
  cert_fingerprint text NOT NULL,           -- provisioning (OP-05)
  offline_mode   text NOT NULL DEFAULT 'cached'
                 CHECK (offline_mode IN ('cached','deny_all','allow_known','unlocked')),
  last_seen_at   timestamptz,
  matrix_version bigint NOT NULL DEFAULT 0  -- versión de ACL cargada
);

CREATE TABLE doors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          uuid NOT NULL REFERENCES sites(id),
  controller_id    uuid NOT NULL REFERENCES controllers(id),
  lock_profile_id  uuid NOT NULL REFERENCES lock_profiles(id),
  zone_inside_id   uuid NOT NULL REFERENCES zones(id),   -- a dónde lleva
  zone_outside_id  uuid REFERENCES zones(id),            -- de dónde viene (null = exterior)
  code             text NOT NULL,
  name             text NOT NULL,
  relay_channel    smallint NOT NULL,
  -- Coordenadas sobre el plano de planta para el mapa de tracking (§14)
  floor_plan_id    uuid,
  map_x            numeric,
  map_y            numeric,
  UNIQUE (site_id, code)
);

CREATE TABLE readers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  door_id      uuid NOT NULL REFERENCES doors(id),
  direction    text NOT NULL CHECK (direction IN ('in','out')),
  protocol     text NOT NULL CHECK (protocol IN ('osdp','wiegand','ip')),
  osdp_address smallint,
  technologies text[] NOT NULL,            -- {'qr','nfc','mifare_desfire'}
  -- Wiegand exige aceptación explícita de riesgo (§3.4)
  risk_accepted_by uuid,
  risk_accepted_at timestamptz,
  CONSTRAINT chk_wiegand_risk
    CHECK (protocol <> 'wiegand' OR risk_accepted_by IS NOT NULL)
);

-- ============ IDENTIDAD ============

CREATE TABLE people (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES sites(id),
  external_ref  text,                       -- id en RRHH (VB-02)
  document_id   text NOT NULL,              -- cédula / pasaporte
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('employee','contractor','visitor')),
  photo_key     text,                       -- MinIO
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, document_id)
);

-- El estado laboral es EFECTIVO EN EL TIEMPO, no un booleano (VB-01)
CREATE TABLE employment_periods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   uuid NOT NULL REFERENCES people(id),
  status      text NOT NULL CHECK (status IN ('active','suspended','terminated')),
  valid_from  date NOT NULL,
  valid_until date,                         -- null = indefinido
  source      text NOT NULL DEFAULT 'manual', -- 'hris' | 'manual'
  EXCLUDE USING gist (
    person_id WITH =,
    daterange(valid_from, COALESCE(valid_until, 'infinity'::date)) WITH &&
  )                                          -- sin solapamientos: imposible por diseño
);

-- Vacaciones, permisos, incapacidad (requisito del cliente)
CREATE TABLE absences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   uuid NOT NULL REFERENCES people(id),
  kind        text NOT NULL CHECK (kind IN ('vacation','leave','sick','suspension')),
  valid_from  date NOT NULL,
  valid_until date NOT NULL,
  blocks_access boolean NOT NULL DEFAULT true,
  source      text NOT NULL DEFAULT 'manual',
  note        text
);

-- Documentos con vencimiento: pólizas, certificados (VB-04)
CREATE TABLE person_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    uuid NOT NULL REFERENCES people(id),
  doc_type     text NOT NULL,               -- 'insurance' | 'safety_cert' | 'medical'
  expires_at   date NOT NULL,
  blocks_access_on_expiry boolean NOT NULL DEFAULT true,
  file_key     text
);

-- ============ CREDENCIALES ============

CREATE TABLE credentials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       uuid NOT NULL REFERENCES people(id),
  kind            text NOT NULL
                  CHECK (kind IN ('mifare_desfire','nfc_phone','qr_dynamic','qr_single_use','pin')),
  -- NUNCA el número de tarjeta en claro
  credential_hash bytea NOT NULL UNIQUE,
  label           text,
  valid_from      timestamptz NOT NULL DEFAULT now(),
  valid_until     timestamptz,
  blocked_at      timestamptz,
  blocked_reason  text,
  issued_by       uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============ DERECHOS DE ACCESO ============

CREATE TABLE schedules (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id  uuid NOT NULL REFERENCES sites(id),
  name     text NOT NULL,
  -- [{dow:[1,2,3,4,5], from:'07:00', to:'19:00'}]
  windows  jsonb NOT NULL,
  holiday_calendar_id uuid
);

CREATE TABLE holiday_calendars (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name   text NOT NULL,
  dates  date[] NOT NULL
);

-- El modelo correcto: NivelAcceso = conjunto de (Puerta × Horario)  (RA-03)
CREATE TABLE access_levels (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id),
  name    text NOT NULL
);

CREATE TABLE access_level_doors (
  access_level_id uuid NOT NULL REFERENCES access_levels(id) ON DELETE CASCADE,
  door_id         uuid NOT NULL REFERENCES doors(id),
  schedule_id     uuid NOT NULL REFERENCES schedules(id),
  PRIMARY KEY (access_level_id, door_id)
);

CREATE TABLE groups (             -- "Administrativo", "Operativo"
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id),
  name    text NOT NULL
);

CREATE TABLE group_access_levels (
  group_id        uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  access_level_id uuid NOT NULL REFERENCES access_levels(id),
  PRIMARY KEY (group_id, access_level_id)
);

-- Asignación con vigencia (RA-05): así se hace un acceso temporal sin hacks
CREATE TABLE person_groups (
  person_id   uuid NOT NULL REFERENCES people(id),
  group_id    uuid NOT NULL REFERENCES groups(id),
  valid_from  timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  PRIMARY KEY (person_id, group_id, valid_from)
);

-- ============ EVENTOS (TimescaleDB) ============

CREATE TABLE access_events (
  time            timestamptz NOT NULL,
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL,
  door_id         uuid,
  reader_id       uuid,
  controller_id   uuid,
  person_id       uuid,
  credential_id   uuid,
  event_type      text NOT NULL,   -- ver §12
  decision        text,            -- 'grant' | 'deny' | null
  reason_code     text,            -- 'NO_PERMISSION' | 'OUTSIDE_SCHEDULE' | ...
  direction       text,            -- 'in' | 'out'
  zone_from_id    uuid,
  zone_to_id      uuid,
  decided_at_edge boolean NOT NULL DEFAULT false,
  was_offline     boolean NOT NULL DEFAULT false,
  device_time     timestamptz,     -- reloj del controlador (auditoría de deriva)
  payload         jsonb,
  -- Cadena de integridad (§12)
  prev_hash       bytea,
  hash            bytea NOT NULL,
  PRIMARY KEY (time, id)
);

SELECT create_hypertable('access_events', 'time', chunk_time_interval => INTERVAL '7 days');

-- Append-only: sin UPDATE ni DELETE, garantizado por permisos
REVOKE UPDATE, DELETE ON access_events FROM PUBLIC;

CREATE INDEX ON access_events (person_id, time DESC);
CREATE INDEX ON access_events (door_id, time DESC);
CREATE INDEX ON access_events (event_type, time DESC) WHERE decision = 'deny';

-- Estado de ocupación derivado (RA-11 / RA-12)
CREATE TABLE zone_presence (
  person_id   uuid PRIMARY KEY REFERENCES people(id),
  zone_id     uuid NOT NULL REFERENCES zones(id),
  entered_at  timestamptz NOT NULL,
  door_id     uuid NOT NULL REFERENCES doors(id)
);
```

**Nota sobre `employment_periods`:** el `EXCLUDE USING gist` hace **físicamente imposible** que una persona tenga dos estados laborales solapados. Es el tipo de invariante que en la mayoría de sistemas se intenta validar en la capa de servicio y se termina violando por una condición de carrera.

---

## 12. Eventos y auditoría inmutable

### 12.1 Catálogo de eventos

| Evento | Origen | Prioridad |
|---|---|---|
| `access.granted` | Decisión | info |
| `access.denied` | Decisión (+ `reason_code`) | info / warn |
| `access.granted_offline` | Edge sin red | info |
| `door.opened` | DPS | info |
| `door.closed` | DPS | info |
| `door.held_open_prewarn` | Temporizador | warn |
| `door.held_open` | Temporizador (§3.2) | **alarm** |
| `door.forced_open` | DPS sin concesión ni REX | **alarm** |
| `door.rex_pressed` | REX | info |
| `door.remote_grant` | Operador | audit |
| `credential.duress` | PIN de coacción | **alarm crítica** |
| `device.tamper` | Sensor de tamper | **alarm** |
| `device.offline` | Sin heartbeat | **alarm** |
| `device.clock_drift` | Deriva > umbral | warn |
| `device.matrix_updated` | Push de ACL | audit |
| `lockdown.activated` | Operador / regla | **alarm** |
| `fire.release_detected` | Entrada de incendio | **alarm crítica** |
| `apb.violation` | Anti-passback | warn |
| `zone.occupancy_exceeded` | Aforo | warn |
| `config.changed` | Admin | audit |
| `report.person_queried` | Consulta de tracking (DP-06) | audit |

> `report.person_queried` es deliberado: **auditar quién consulta el historial de movimientos de quién**. Un módulo de tracking sin este log es una herramienta de vigilancia laboral sin control. Con él, es un producto defendible ante RRHH, ante el comité de ética y ante la LOPDP.

### 12.2 Cadena de integridad

```typescript
// domain/events/event-chain.ts

/**
 * Cada evento encadena con el anterior de su controlador.
 * Permite demostrar ante una auditoría que nadie borró ni alteró un registro:
 * romper un eslabón invalida todos los posteriores.
 */
export function computeEventHash(e: AccessEventInput, prevHash: Buffer | null): Buffer {
  const canonical = JSON.stringify({
    t: e.time.toISOString(),
    c: e.controllerId,
    d: e.doorId ?? null,
    p: e.personId ?? null,
    ty: e.eventType,
    de: e.decision ?? null,
    r: e.reasonCode ?? null,
  });
  return createHash('sha256')
    .update(prevHash ?? Buffer.alloc(32))
    .update(canonical)
    .digest();
}
```

Un job diario verifica la cadena por controlador y emite un evento `audit.chain_verified` con el resultado. **Ese informe es entregable al cliente** y es un diferenciador frente a cualquier sistema que solo tiene una tabla de logs editable.

---

## 13. Motor de reglas y alertas

La alerta pedida ("puerta abierta > 5 min") es **un caso** de un motor genérico. Hardcodearla es el error clásico.

```typescript
// domain/alerting/alert-rule.ts

export interface AlertRule {
  readonly id: AlertRuleId;
  readonly name: string;
  readonly enabled: boolean;

  /** Evento(s) que disparan la evaluación. */
  readonly triggerOn: EventType[];

  /** Condición declarativa evaluada contra el evento y su contexto. */
  readonly condition: RuleExpression;

  /** Alcance: global, por sitio, zona, puerta o grupo. */
  readonly scope: RuleScope;

  /** Solo aplica dentro de este horario (ej. "fuera de horario laboral"). */
  readonly scheduleId?: ScheduleId;

  readonly severity: 'info' | 'warning' | 'alarm' | 'critical';

  /** Evita tormentas: N alertas iguales en M minutos = una sola. */
  readonly dedupeWindowSec: number;

  /** Escalado por canal y tiempo. */
  readonly escalation: EscalationStep[];
}

export interface EscalationStep {
  readonly afterSec: number;
  readonly channels: ('whatsapp' | 'email' | 'webpush' | 'webhook' | 'relay')[];
  readonly recipients: RecipientRef[];
  /** Requiere reconocimiento humano; si no, escala al siguiente paso. */
  readonly requiresAck: boolean;
}
```

Reglas preconfiguradas de fábrica (el cliente las edita, no las programa):

| Regla | Condición | Severidad |
|---|---|---|
| Puerta abierta demasiado tiempo | `door.held_open` | alarm |
| Puerta forzada | `door.forced_open` | alarm |
| Coacción | `credential.duress` | critical |
| Acceso fuera de horario | `access.denied AND reason = OUTSIDE_SCHEDULE` | warning |
| Intentos repetidos denegados | `≥5 access.denied` misma credencial en 5 min | warning |
| Controlador caído | `device.offline > 60s` | alarm |
| Tamper de lector | `device.tamper` | alarm |
| Aforo excedido | `zone.occupancy_exceeded` | warning |
| 🔵 **Credencial imposible** | Misma credencial en dos lectores separados por distancia física incompatible con el tiempo transcurrido | **critical** |
| 🔵 **Puerta crónicamente trabada** | Top de puertas por frecuencia de `door.held_open` en 30 días | info (reporte) |

> 🔵 **"Credencial imposible"** es detección de clonación o de préstamo de tarjeta, calculada con datos que ya tienes y un grafo de distancias entre puertas. Es barata de implementar y ningún sistema de gama media de la región la ofrece. Es exactamente el tipo de feature que en una demo hace que el jefe de seguridad se incline hacia adelante.

---

## 14. Analítica y reportes — el diferenciador

El cliente identificó reportes como el diferenciador. **Tiene razón, y va más lejos de lo que pidió.** Todo sistema graba eventos; casi ninguno los convierte en decisiones.

### 14.1 Paquete de reportes

**Nivel 1 — Lo que pidió el cliente**
- Flujo de personas por día/hora/zona; **día y hora pico**
- Tiempo de permanencia por persona y por zona
- Histórico de accesos con filtros (persona, puerta, zona, resultado, rango)
- Exportación CSV/XLSX/PDF, programable por email/WhatsApp

**Nivel 2 — Mapa de tracking (lo que pidió, bien hecho)**
- **Plano de planta interactivo** (SVG sobre el CAD del cliente) con las puertas geoposicionadas
- **Reconstrucción de recorrido**: seleccionas una persona y un rango, y ves su trayectoria animada puerta por puerta, con tiempos entre nodos
- **Heatmap de zonas** por franja horaria: dónde se concentra la gente
- **Diagrama Sankey de flujos**: qué rutas usa realmente la gente entre zonas *(esto revela cosas que nadie sabía: la puerta que "nadie usa" y por la que pasan 200 personas/día)*
- Vista de **ocupación en vivo** por zona

**Nivel 3 — 🔵 Inteligencia operativa (el foso real)**

Aquí está la diferencia entre vender un registro y vender una decisión:

| Reporte | Insight de negocio |
|---|---|
| **Ranking de puertas problemáticas** | La puerta que se queda abierta 40 veces al mes no es un problema de gente: es un problema de cierrapuertas mal calibrado o de flujo mal diseñado. Le dices al cliente qué arreglar. |
| **Inferencia de tailgating** | Comparar concesiones de acceso contra tiempo de apertura del DPS: una apertura de 12s con una sola concesión sugiere que pasaron varias personas. **No lo afirma — lo señala como probable.** |
| **Detección de credencial compartida** | Patrones de "viaje imposible" (§13) agregados por persona a lo largo del tiempo. |
| **Accesos huérfanos** | Personas con permisos activos que **no han usado una puerta en 90 días**. Es el reporte que encuentra al empleado que se fue hace meses y sigue con acceso. Se vende solo en cualquier auditoría. |
| **Deriva de permisos (privilege creep)** | Personas cuyo conjunto de accesos crece y nunca se reduce, comparadas contra su grupo. |
| **Reporte de evacuación (muster)** | Quién está adentro **ahora**, por zona, imprimible y **disponible offline**. |
| **Cumplimiento de contratistas** | Contratistas con documentos por vencer en 30 días y accesos que caducarán. |

### 14.2 El principio que gobierna la analítica

> **Lógica de abstención.** Cuando los datos no alcanzan, el sistema lo dice — no inventa.

Si una puerta no tiene sensor DPS, el módulo de tailgating **declara explícitamente que no puede evaluar esa puerta** en lugar de producir un número inventado. Si el reloj de un controlador derivó, los eventos de ese periodo se marcan como de confianza reducida en el reporte, no se muestran como si nada.

Esto no es purismo. Un sistema de seguridad que da falsas alarmas se apaga; uno que declara sus límites se usa durante años. Y es lo que distingue un producto de ingeniería de un dashboard bonito.

### 14.3 Implementación

```sql
-- Los reportes de flujo se precalculan con continuous aggregates.
-- Esto es lo que hace que "día de mayor flujo del último año" responda instantáneo.
CREATE MATERIALIZED VIEW access_flow_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time)         AS bucket,
  site_id,
  zone_to_id,
  direction,
  count(*)                            AS event_count,
  count(DISTINCT person_id)           AS unique_people
FROM access_events
WHERE decision = 'grant'
GROUP BY bucket, site_id, zone_to_id, direction;

SELECT add_continuous_aggregate_policy('access_flow_hourly',
  start_offset => INTERVAL '3 days',
  end_offset   => INTERVAL '1 hour',
  schedule_interval => INTERVAL '30 minutes');

-- Retención (DP-02): los datos crudos se purgan, los agregados sobreviven.
SELECT add_retention_policy('access_events', INTERVAL '2 years');
```

```sql
-- Accesos huérfanos: el reporte que encuentra al fantasma en la nómina.
SELECT p.id, p.first_name, p.last_name, p.document_id,
       max(e.time) AS last_access
FROM people p
JOIN person_groups pg ON pg.person_id = p.id
  AND (pg.valid_until IS NULL OR pg.valid_until > now())
LEFT JOIN access_events e ON e.person_id = p.id AND e.decision = 'grant'
WHERE p.kind IN ('employee','contractor')
GROUP BY p.id
HAVING max(e.time) IS NULL OR max(e.time) < now() - INTERVAL '90 days'
ORDER BY last_access NULLS FIRST;
```

---

## 15. Seguridad de la plataforma

| Capa | Control |
|---|---|
| Dispositivo ↔ Servidor | mTLS con certificado por dispositivo; ACL MQTT por tópico; rotación de certificados |
| Lector ↔ Controlador | OSDP Secure Channel (AES-128); Wiegand solo con riesgo aceptado por escrito |
| Firmware | Secure Boot v2, Flash Encryption, OTA firmada, rollback |
| Servidor | RBAC + ABAC; principio de mínimo privilegio; separación de deberes (quien crea una credencial no la aprueba) |
| Sesiones | JWT corto (5 min) + refresh rotativo con detección de reuso |
| Contraseñas | argon2id; MFA obligatorio para rol administrador |
| Datos | Cifrado en reposo (LUKS/TDE); credenciales solo como hash; fotos en MinIO con SSE |
| Auditoría | Toda acción administrativa registrada e inmutable; incluye las consultas de tracking (DP-06) |
| Red | Segmentación: VLAN dedicada de control de acceso, sin salida a internet para controladores |
| Supply chain | SBOM generado en CI; escaneo de dependencias; imágenes firmadas |

---

## 16. Configurabilidad

Requisito del cliente: "todos los parámetros configurables". Se traduce en un principio de arquitectura:

> **Nada que un cliente pueda querer distinto vive en código.**

| Nivel | Configurable | Ejemplos |
|---|---|---|
| **Sitio** | Zona horaria, calendario de feriados, idioma, política de retención | |
| **Zona** | Anti-passback (off/soft/hard/timed), aforo, dos personas, interlock, nivel de seguridad | |
| **Puerta** | Perfil de cerradura completo (§8.3), modo offline, canal de relé, posición en el plano | |
| **Lector** | Protocolo, tecnologías admitidas, dirección, factores requeridos | |
| **Horario** | Ventanas por día de semana, feriados, excepciones | |
| **Nivel de acceso** | Puertas × horarios | |
| **Grupo** | Niveles de acceso, herencia | |
| **Alerta** | Condición, alcance, severidad, deduplicación, escalado, canales | |
| **Notificación** | Plantillas WhatsApp/email por idioma, destinatarios por rol | |
| **Reporte** | Filtros guardados, programación, formato, destinatarios | |

**Cómo se implementa sin caos:**
- Cada configuración es una **entidad versionada y auditada**, no una fila que se sobrescribe.
- Cambios en configuración de seguridad de vida (§8.3) requieren **doble aprobación** y quedan en el audit log con quién y por qué.
- Toda configuración se valida contra invariantes de dominio **y** contra `CHECK` en base de datos. Doble red.
- La configuración es **exportable e importable** (JSON versionado) → despliegue reproducible en el siguiente cliente y base del `SimulatorAdapter`.

---

## 17. Requisitos no funcionales

| Atributo | Objetivo | Cómo se verifica |
|---|---|---|
| **Latencia de decisión** | < 300 ms desde presentación de credencial a actuación del relé (edge, offline) | Bench en firmware |
| **Latencia de decisión (online)** | < 500 ms p95 | k6 |
| **Disponibilidad de puerta** | 99.99% — **independiente del servidor** | Prueba de caos: apagar servidor 24h, las puertas siguen |
| **Disponibilidad de servidor** | 99.5% (on-premise, sin HA en MVP) | |
| **Ingesta** | 500 eventos/s sostenidos | k6 + Timescale |
| **Buffer offline** | ≥ 50.000 eventos por controlador | Test de firmware |
| **Recuperación de red** | Store-and-forward completo, sin pérdida ni duplicados (idempotencia por `event_id`) | Test de integración |
| **Deriva de reloj** | < 2 s entre controlador y servidor | Alerta `device.clock_drift` |
| **Tiempo de reporte de evacuación** | < 3 s, **funcional sin red** | Test en PWA |
| **PWA offline** | Escaneo y verificación de QR sin conectividad | Playwright offline |
| **RTO / RPO** | RTO 4h / RPO 15 min | Simulacro de restauración trimestral |
| **Ambientales** | IP65+ en lectores exteriores; −10 a 55 °C; resistencia a salitre si es puerto | Especificación de compra |

---

## 18. Roadmap

### Fase 0 — Descubrimiento (2 semanas) 🔴 *No saltar*
- Cuestionario del §4 respondido por escrito
- **Levantamiento puerta por puerta**: tipo de cerradura, sensores existentes, red, energía, si es evacuación
- Decisión de tecnología de credencial (§3.3) y respuesta al problema de iOS
- Decisión de controlador (§8.1)
- Definición de responsabilidad sobre la interfaz de incendios
- **Entregable:** alcance cerrado + presupuesto con las partidas que la competencia omite (sensores, cableado, UPS)

### Fase 1 — MVP (8–10 semanas)
| Semana | Entregable |
|---|---|
| 1–2 | Scaffold, dominio, esquema DB, `SimulatorAdapter`, CI |
| 3–4 | Identity + Credentials + AccessRights + motor de decisión (servidor) + vector de pruebas compartido |
| 5–6 | Device Gateway (MQTT/mTLS), adaptador de controlador comercial, eventos + cadena de hash, alertas DHO/DFO |
| 7–8 | Consola Angular 22 + PWA de guardia offline + workflow de solicitudes |
| 9–10 | Analítica nivel 1 y 2, muster, notificaciones, hardening, despliegue piloto |

**Hito comercial en semana 4:** demo funcional con `SimulatorAdapter` — puertas virtuales que abren, se quedan trabadas y disparan alertas en pantalla. **Sin llevar un solo cable a la reunión.**

### Fase 2 — Diferenciación (6 semanas)
- Analítica nivel 3 (tailgating inferido, credencial imposible, accesos huérfanos, privilege creep)
- Anti-passback + ocupación + interlock + first-person-in
- Integración RRHH/AD
- **Controlador ESP32-S3 propio** certificado, desplegado en puertas no críticas

### Fase 3 — Extensión
- LPR / control vehicular *(aquí resucita PortAI como módulo)*
- Integración con CCTV (evento → clip)
- Ascensores, torniquetes avanzados
- Multi-sitio federado

### Fase 4 — Evaluar, no asumir
- Biometría — **solo si el cliente lo exige y con evaluación de impacto LOPDP previa**

---

## 19. Riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **Responsabilidad por seguridad de vida** | Crítico | Controlador certificado en el piloto; interfaz de incendios por hardware; delimitación contractual explícita de responsabilidades; seguro de responsabilidad civil profesional |
| R2 | **El competidor ofrece 24x7 y presencia local** | Alto | El soporte de campo lo pone el socio local. Definir SLA realista y no prometer lo que no se sostiene. |
| R3 | **Parque instalado de 125 kHz / Wiegand** | Alto | Reportarlo por escrito como hallazgo de seguridad. Convertirlo en argumento de venta, no en obstáculo. |
| R4 | **iOS y NFC** | Medio | Decidir en Fase 0: QR dinámico en iOS o BLE. No prometer NFC universal. |
| R5 | **Alcance sigue creciendo** | Alto | Este documento es la línea base. Todo lo nuevo entra por control de cambios. |
| R6 | **Un solo desarrollador con búsqueda de empleo activa en paralelo** | Alto | Alcance de MVP defendido con disciplina. El core compartido con Vetia amortiza esfuerzo. Fase 0 es barata y descarta el proyecto pronto si no es viable. |
| R7 | **Sensores DPS inexistentes** | Medio | Detectado en Fase 0. Si el cliente no los quiere pagar, la alerta de puerta abierta **no existe** y se documenta. |
| R8 | **Propiedad intelectual de PortAI** | Medio | Repo limpio, sin reutilizar código de TPM. |
| R9 | **El cliente compra por precio** | Alto | El foso no es el precio: es muster, tracking, cero hardware propietario y propiedad del dato. Si compra solo por precio, no es el cliente. |

---

## Anexo A — Requerimientos en formato EARS (muestra)

Para alimentar el scaffold OpenSpec.

**Ubicuos**
- `UMB-001` El sistema **deberá** registrar todo evento de acceso de forma append-only con encadenamiento criptográfico.
- `UMB-002` El sistema **deberá** rechazar toda configuración de puerta que declare `is_egress_route = true` junto con `fail_state = fail_secure`.

**Dirigidos por evento**
- `UMB-010` **Cuando** una credencial se presente a un lector, el controlador **deberá** emitir una decisión en menos de 300 ms usando su matriz de acceso local.
- `UMB-011` **Cuando** un contacto de posición reporte apertura sin concesión previa ni REX dentro de `rex_grace_sec`, el sistema **deberá** emitir `door.forced_open` con severidad alarm.
- `UMB-012` **Cuando** una puerta permanezca abierta más de `held_open_timeout_sec`, el sistema **deberá** emitir `door.held_open` y ejecutar la escalada configurada.

**Dirigidos por estado**
- `UMB-020` **Mientras** una persona tenga una ausencia vigente con `blocks_access = true`, el sistema **deberá** denegar todo acceso de sus credenciales con `reason_code = ABSENCE_ACTIVE`.
- `UMB-021` **Mientras** un controlador esté sin conexión al servidor, **deberá** continuar decidiendo según su `offline_mode` configurado y bufferizar los eventos.

**Opcionales**
- `UMB-030` **Donde** una puerta esté equipada con contacto de posición, el sistema **deberá** permitir configurar alertas de puerta abierta.
- `UMB-031` **Donde** una zona tenga `anti_passback = hard`, el sistema **deberá** denegar una segunda entrada sin salida registrada.

**No deseados**
- `UMB-040` **Si** la central de incendios activa la señal de liberación, **entonces** las cerraduras de rutas de evacuación **deberán** liberarse por vía eléctrica sin depender del software, y el sistema **deberá** registrar `fire.release_detected`.
- `UMB-041` **Si** la verificación de la cadena de hash falla, **entonces** el sistema **deberá** emitir una alerta crítica identificando el primer eslabón roto.
- `UMB-042` **Si** una misma credencial se presenta en dos lectores cuya distancia sea físicamente incompatible con el tiempo transcurrido, **entonces** el sistema **deberá** emitir `credential.impossible_travel` con severidad crítica.

---

## Próximo paso recomendado

1. Enviar el cuestionario del **§4** al cliente. *Esto además te posiciona por encima del competidor, que no pregunta nada.*
2. Ejecutar el **levantamiento puerta por puerta** — es lo que convierte esta especificación en un presupuesto real.
3. Con eso, generar el **scaffold OpenSpec completo** (`project.md` + specs de capacidad + change proposals) y arrancar el MVP.

> Nada de lo anterior requiere escribir código todavía. Y es exactamente lo que hace que este proyecto se gane por ingeniería y no por precio.
