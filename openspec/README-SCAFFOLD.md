# Scaffold OpenSpec — UMBRAL

Andamiaje completo de OpenSpec para UMBRAL, listo para colocar en la raíz del repo
tras `openspec init`. **Los 14 changes pasan `openspec validate --all --strict`.**

## Estructura

```
openspec/
├── project.md                      # Constitución del proyecto (léelo primero)
├── README-SCAFFOLD.md              # Este archivo
├── specs/                          # (vacío) se llena al archivar changes
└── changes/                        # 14 changes del MVP + Fase 2 temprana
```

## Los 14 changes

| # | Change | Capacidad | Depende de | Roadmap |
|---|---|---|---|---|
| 1 | `add-topology-foundation` | topology | — | Sem 1–2 |
| 2 | `add-dual-decision-engine` | decision-engine | topology | Sem 3–4 |
| 3 | `add-identity-and-lifecycle` | identity | topology | Sem 3–4 |
| 4 | `add-credentials-and-issuance` | credentials | identity | Sem 3–4 |
| 5 | `add-access-rights` | access-rights | topology, identity | Sem 3–4 |
| 6 | `add-device-gateway` | device-gateway | decision-engine, topology | Sem 5–6 |
| 7 | `add-events-and-audit` | events-audit | device-gateway | Sem 5–6 |
| 8 | `add-alerting` | alerting | events-audit, decision-engine | Sem 5–6 |
| 9 | `add-guard-pwa-offline` | guard-pwa | credentials, events-audit | Sem 7–8 |
| 10 | `add-access-request-workflow` | workflow | identity, access-rights | Sem 7–8 |
| 11 | `add-analytics-and-muster` | analytics | events-audit | Sem 9–10 |
| 12 | `add-notifications` | notifications | alerting | Sem 9–10 |
| 13 | `add-compliance-lopdp` | compliance | events-audit, identity | Sem 9–10 |
| 14 | `add-hris-import-watcher` | hris-sync | identity | Sem 9–10 / Fase 2 |

Orden de implementación = el de la tabla (respeta dependencias). Empieza por
`add-topology-foundation`.

## Mejoras incorporadas desde el análisis de C·CURE 9000

Referencia: instalación enterprise sobre controladores iSTAR (Johnson Controls).

| Observado en C·CURE | Incorporado en UMBRAL | Dónde |
|---|---|---|
| `Input is fault` / `fault cleared` (línea EOL) | `input.fault` / `input.fault_cleared` como eventos + alerta de manipulación | events-audit, alerting, topology |
| Logueo de `RTE`/`REX` | `rex.activated` como evento; distingue salida legítima de puerta forzada | events-audit |
| `Import Watcher` (carpeta vigilada) | Importador HRIS idempotente → deprovisioning automático | hris-sync |
| Tabla de capacidades licenciada por unidad | Dashboard de salud/capacidad como monitoreo, no como límite | analytics, device-gateway |
| Nombres jerárquicos `Sitio - Nivel - Puerta` | Nombres jerárquicos legibles de objetos | topology |
| Nombre + nº de tarjeta en claro en el log | **Al revés:** feed seudonimizado por defecto; PII detrás de consulta auditada | alerting, guard-pwa, compliance |
| Firehose de 577 eventos sin filtrar | Motor de reglas con deduplicación y escalado; analítica que destila señal | alerting, analytics |

## Requerimientos EARS de origen (Anexo A) → capacidad

- `UMB-001` (append-only + hash) → events-audit
- `UMB-002` (egress ≠ fail-secure) → topology
- `UMB-010` (decisión edge < 300 ms) → decision-engine
- `UMB-011/012` (forced / held open) → events-audit + alerting
- `UMB-020/021` (ausencia bloquea / offline decide) → identity + decision-engine
- `UMB-030/031` (alertas si DPS / APB hard) → topology + decision-engine
- `UMB-040` (liberación por incendio por HW) → topology + events-audit
- `UMB-041` (cadena rota → alerta) → events-audit
- `UMB-042` (viaje imposible) → decision-engine

## Fase 2 (crear después con `/opsx:propose`)

`add-anti-passback-and-occupancy` · `add-esp32-controller-adapter` ·
`add-cctv-integration` (evento → clip) · `add-lpr-vehicular`.
