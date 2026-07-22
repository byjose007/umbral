## 1. Máquina de estados

- [ ] 1.1 Estados: solicitada → en revisión → aprobada/rechazada → vigente → vencida
- [ ] 1.2 Transiciones válidas y guardas; trazabilidad por transición

## 2. Solicitud y portal

- [ ] 2.1 Portal público de solicitud de acceso de proveedores/visitantes
- [ ] 2.2 Captura de datos mínimos y documentos requeridos

## 3. Aprobación

- [ ] 3.1 Bandeja de aprobación con contexto (documentos, vigencia)
- [ ] 3.2 Bloqueo de aprobación si falta un documento requerido vigente
- [ ] 3.3 Concesión de acceso con vigencia efectiva al aprobar

## 4. Validación OpenSpec

- [ ] 4.1 `openspec validate add-access-request-workflow --strict` en verde
