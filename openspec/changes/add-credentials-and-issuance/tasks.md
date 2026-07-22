## 1. Dominio

- [ ] 1.1 Entidad `Credential` con tipos permitidos y `credential_hash`
- [ ] 1.2 Ciclo de vida: emitir, bloquear (con motivo), caducar, reemplazar
- [ ] 1.3 Soporte de N credenciales por persona
- [ ] 1.4 PIN de coacción por credencial

## 2. QR dinámico firmado

- [ ] 2.1 Emisión de JWT corto ES256 + nonce con rotación configurable
- [ ] 2.2 Verificación por clave pública (reutilizable offline en la PWA)
- [ ] 2.3 QR de un solo uso para visitantes

## 3. Persistencia y seguridad

- [ ] 3.1 Esquema Drizzle; `credential_hash` único; nunca el número en claro
- [ ] 3.2 Rotación de claves de sector/aplicación DESFire (no claves de fábrica)
- [ ] 3.3 Tests: el número de credencial no aparece en logs ni en respuestas

## 4. API y consola

- [ ] 4.1 Módulo NestJS `credentials`; emisión, bloqueo inmediato, reemplazo
- [ ] 4.2 Vista de credenciales por persona con su estado

## 5. Validación OpenSpec

- [ ] 5.1 `openspec validate add-credentials-and-issuance --strict` en verde
