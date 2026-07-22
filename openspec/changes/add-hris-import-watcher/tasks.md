## 1. Fuentes

- [ ] 1.1 Watcher de carpeta/SFTP para CSV programado
- [ ] 1.2 Adaptador opcional API/LDAP (puerto, no dependencia)

## 2. Conciliación

- [ ] 2.1 Conciliación idempotente por `external_ref`
- [ ] 2.2 Alta/actualización de personas y periodos de empleo
- [ ] 2.3 Baja: cierre del periodo de empleo con fecha

## 3. Robustez

- [ ] 3.1 Reporte de discrepancias para revisión humana
- [ ] 3.2 Tests: reejecución no duplica; baja dispara bloqueo derivado

## 4. Validación OpenSpec

- [ ] 4.1 `openspec validate add-hris-import-watcher --strict` en verde
