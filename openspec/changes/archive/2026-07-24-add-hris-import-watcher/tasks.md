## 1. Fuentes

- [x] 1.1 Watcher de carpeta/SFTP para CSV programado
- [x] 1.2 Adaptador opcional API/LDAP (puerto, no dependencia)

## 2. Conciliación

- [x] 2.1 Conciliación idempotente por `external_ref`
- [x] 2.2 Alta/actualización de personas y periodos de empleo
- [x] 2.3 Baja: cierre del periodo de empleo con fecha

## 3. Robustez

- [x] 3.1 Reporte de discrepancias para revisión humana
- [x] 3.2 Tests: reejecución no duplica; baja dispara bloqueo derivado

## 4. Validación OpenSpec

- [x] 4.1 `openspec validate add-hris-import-watcher --strict` en verde
