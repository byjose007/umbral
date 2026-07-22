## 1. Dominio

- [x] 1.1 Entidad `Credential` con tipos permitidos y `credential_hash`
- [x] 1.2 Ciclo de vida: emitir, bloquear (con motivo), caducar, reemplazar
- [x] 1.3 Soporte de N credenciales por persona
- [x] 1.4 PIN de coacción por credencial

## 2. QR dinámico firmado

- [x] 2.1 Emisión de JWT corto ES256 + nonce con rotación configurable
- [x] 2.2 Verificación por clave pública (reutilizable offline en la PWA)
- [x] 2.3 QR de un solo uso para visitantes

## 3. Persistencia y seguridad

- [x] 3.1 Esquema Drizzle; `credential_hash` único; nunca el número en claro
- [x] 3.2 Rotación de claves de sector/aplicación DESFire (no claves de fábrica)
- [x] 3.3 Tests: el número de credencial no aparece en logs ni en respuestas

## 4. API y consola

- [x] 4.1 Módulo NestJS `credentials`; emisión, bloqueo inmediato, reemplazo
- [x] 4.2 Vista de credenciales por persona con su estado

## 5. Validación OpenSpec

- [x] 5.1 `openspec validate add-credentials-and-issuance --strict` en verde

