# Auditoría técnica integral del repositorio (frontend + backend + conexiones)

Fecha: 2026-04-27

## 1) Resumen ejecutivo

- El repo está organizado como monorepo `pnpm` con backend (`artifacts/api-server`), frontend principal (`artifacts/el-principe-mestizo`) y librerías compartidas (`lib/*`).
- La integración FE/BE está razonablemente bien planteada mediante OpenAPI + cliente generado, pero hay **desalineaciones** entre especificación y backend real.
- Se detectaron hallazgos de **seguridad**, **consistencia de contratos**, **tipado/compilación** y **operación**.
- El estado actual no está “verde” en typecheck global: hay errores TypeScript en backend.

## 2) Arquitectura actual y conexiones esperadas

### 2.1 Frontend

- El frontend inicializa la URL base de API con `VITE_API_URL` (si existe) y, si no, usa rutas relativas.
- En desarrollo, Vite proxy redirige `/api` a `http://localhost:8080`.
- En producción (Render static site), se reescriben rutas `/api/*` al backend `epm-api` y `/articulo/*` al backend para OG SSR.

### 2.2 Backend

- El backend expone todas las rutas bajo `/api` y además una ruta SSR `/articulo/:slug` fuera de `/api`.
- Hay módulos para auth, artículos, categorías, comentarios, settings, upload, importación de Medium y migración/proxy de imágenes.

### 2.3 Librerías compartidas

- `lib/api-spec/openapi.yaml`: contrato fuente de API.
- `lib/api-client-react`: hooks/cliente consumido por frontend.
- `lib/api-zod`: validaciones tipadas para request bodies.
- `lib/db`: esquema Drizzle compartido.

## 3) Hallazgos principales (priorizados)

## P0 — Crítico

1. **No hay control de roles en endpoints administrativos**
   - `requireAuth` solo valida token JWT y no autoriza por rol (`admin`, etc.).
   - Cualquier usuario autenticado podría acceder a `/api/admin/*`.
   - Riesgo: escalación horizontal de privilegios y exposición de operaciones críticas.

2. **Secreto JWT por defecto inseguro**
   - Si `SESSION_SECRET` no está definido, el backend usa `"change-me-in-production"`.
   - Riesgo crítico si una instancia corre con ese default.

## P1 — Alto

3. **CORS demasiado permisivo**
   - `origin: true` refleja cualquier origen y permite credenciales.
   - Riesgo de superficie ampliada; más difícil controlar dominios autorizados en producción.

4. **Whitelist de settings no aplicada**
   - Existe `SETTING_KEYS`, pero `PUT /admin/settings` no valida que `key` pertenezca a la lista.
   - Riesgo de corrupción de configuración o inserción de claves arbitrarias.

5. **Contrato OpenAPI desalineado con backend real**
   - OpenAPI documenta `/upload/image` pero backend también usa `/admin/upload`.
   - OpenAPI no cubre rutas de importación/migración (`/admin/import-medium/*`, `/admin/migrate-images`, `/admin/fix-article-images` si aplica), creando deuda de contrato y potenciales clientes incompletos.

## P2 — Medio

6. **Typecheck global falla**
   - Errores TypeScript en backend (parámetros `string | string[]`, opción inválida de Cheerio, etc.).
   - Impacto: deuda técnica y riesgo de errores en runtime al perder garantías del compilador.

7. **Sin rate limiting para login/comentarios/importación**
   - No se observan limitadores para fuerza bruta o abuso.
   - Recomendable aplicar rate limit por IP/usuario en rutas sensibles.

8. **Ruta funcional pública con prefijo `/admin`**
   - `/api/admin/most-read` es pública (sin `requireAuth`) por diseño.
   - No es bug de seguridad per se, pero sí confusión semántica y potencial hardening débil.

## P3 — Bajo

9. **Inconsistencia en estrategia de subida de medios**
   - Existe upload vía backend y upload directo a Cloudinary desde frontend.
   - No es malo, pero conviene formalizar un solo flujo oficial para reducir complejidad operativa.

10. **Borrado masivo disponible por endpoint administrativo**
   - `DELETE /api/admin/articles/purge` borra todos los artículos.
   - Debe mantenerse solo con hardening fuerte (RBAC + auditoría + confirmación fuerte).

## 4) Revisión específica de conexiones frontend ↔ backend

### Conexiones que SÍ están correctas

- Base URL configurable desde frontend (`setBaseUrl`) y proxy en Vite para local.
- En Render, reglas de rewrite cubren `/api/*` y SSR OG de `/articulo/*`.
- Frontend usa cliente generado para gran parte de lecturas/escrituras (`useGetArticles`, `useLogin`, etc.).

### Conexiones frágiles / a corregir

- Parte del admin usa `fetch` manual (ej. categorías, importación Medium) fuera del cliente OpenAPI tipado.
- Contrato OpenAPI incompleto respecto de endpoints reales de administración avanzada.
- Dependen de `VITE_API_URL` en algunos flujos para evitar límites del CDN del sitio estático; esto está bien, pero requiere documentación operativa clara.

## 5) Plan de remediación recomendado

### Fase 1 (inmediata)

1. Aplicar RBAC real:
   - Extender `requireAuth` o crear `requireRole("admin")`.
   - Proteger todas las rutas `/admin/*` con validación de rol.
2. Eliminar secreto JWT por defecto:
   - Fallar el arranque si `SESSION_SECRET` falta en producción.
3. Restringir CORS por allowlist:
   - Variable `ALLOWED_ORIGINS` y validación estricta.
4. Validar `key` en settings:
   - Permitir solo `SETTING_KEYS`.

### Fase 2 (próximos días)

5. Alinear OpenAPI con backend real:
   - Documentar rutas faltantes o retirar endpoints legacy.
6. Corregir errores de TypeScript y dejar `pnpm run typecheck` en verde.
7. Agregar rate limiting y/o captcha en login y acciones de alto costo.

### Fase 3 (mejora continua)

8. Consolidar flujo de uploads (directo o backend) y documentar decisión arquitectónica.
9. Añadir observabilidad de seguridad:
   - auditoría de eventos admin (quién hizo qué, cuándo).
10. Añadir pruebas E2E de rutas críticas (auth + CRUD admin + importación).

## 6) Checklist de cumplimiento rápido (estado actual)

- [ ] RBAC admin robusto
- [ ] Secret management estricto (sin defaults inseguros)
- [ ] CORS restringido por dominios confiables
- [ ] OpenAPI 100% alineado con rutas reales
- [ ] Typecheck monorepo en verde
- [ ] Rate limiting en login/comentarios/importaciones
- [ ] Auditoría de acciones administrativas

## 7) Veredicto final

La base técnica del proyecto es buena para iterar rápido (monorepo, contratos compartidos, frontend moderno, DB tipada), pero requiere una ronda de hardening para pasar de “funciona” a “operable y seguro en producción” con menor riesgo.
