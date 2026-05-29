# EPM - Gestor de artículos y contenido

Aplicación web para gestionar artículos, categorías, comentarios, suscripciones y noticias externas vía RSS.

**Stack:** Express.js + Vite/React (wouter) + PostgreSQL (Neon) + pnpm workspaces

## 🚀 Cómo ejecutar localmente

1. Instalar dependencias: `pnpm install`
2. Copiar `.env.example` a `.env` y llenar las variables (ver sección Variables de Entorno)
3. Ejecutar el scraper RSS manual para probar: `pnpm --filter @workspace/api-server run scraper:run`
4. Iniciar servidor de desarrollo: `cd artifacts/api-server && pnpm run dev`

El servidor se ejecutará en `http://localhost:5000`.

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas (con cobertura)
pnpm test -- --coverage

# Verificar tipos
pnpm typecheck

# Verificar lint
pnpm lint
```

## 📋 Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | Conexión PostgreSQL (Neon) | ✅ Sí |
| `JWT_SECRET` | Secreto para tokens JWT (64+ caracteres) | ✅ Sí |
| `CRON_SECRET` | Secreto para endpoints de cron (/api/cron/*) | ✅ Sí |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary para imágenes | Para imágenes |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Para imágenes |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Para imágenes |
| `NODE_ENV` | `development` o `production` | ✅ Sí |
| `PORT` | Puerto del servidor (default: 3000) | No |

### Variables para cron (cron-job.org)

Los endpoints cron están protegidos con `CRON_SECRET` vía header `x-cron-secret`.
Configura en cron-job.org:

- **Endpoint 1:** `POST https://tu-dominio.com/api/cron/fetch-rss`
  - Header: `x-cron-secret: <valor>`
  - Frecuencia: cada 6 horas

- **Endpoint 2:** `POST https://tu-dominio.com/api/cron/generate-briefing`
  - Header: `x-cron-secret: <valor>`
  - Frecuencia: diario a las 06:00

## 📡 RSS Aggregator

El módulo `@workspace/external-news` parsea fuentes RSS de periódicos peruanos e internacionales:

- **10 fuentes** preconfiguradas (El Comercio, RPP, La República, Gestión, BBC Mundo, etc.)
- **Almacena solo metadatos**: título, enlace, fuente, fecha y resumen (máx 300 chars)
- **Nunca almacena el cuerpo completo del artículo**
- Deduplicación por (source, link)
- Endpoints protegidos con `CRON_SECRET`

### Endpoints de RSS

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/external-news` | Titulares paginados (20 por página, filtro por source) |
| POST | `/api/cron/fetch-rss` | Ejecutar scraper (protegido) |
| POST | `/api/cron/generate-briefing` | Generar resumen diario (protegido) |
| GET | `/api/daily-briefing/latest` | Último briefing disponible |
| POST | `/api/summarize/article/:id` | Resumen extractivo de artículo propio |
| GET | `/api/trends` | Palabras clave en titulares (últimas 24h) |
| GET | `/api/trends/sources` | Fuentes más activas |

## 📄 Páginas nuevas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/resumen-diario` | DailyBriefing | Resumen diario de noticias externas |
| `/tendencias` | Trends | Palabras clave y fuentes más activas |

## 🔐 Seguridad

- Cabeceras HTTP de seguridad vía helmet:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Permissions-Policy` restrictiva (geolocation, camera, mic deshabilitados)
- CSP estricta con nonces para scripts inline (sin `unsafe-inline` en producción)
- Autenticación JWT con `tokenVersion` en DB para invalidar sesiones al cambiar rol
- Cookies `httpOnly` + `secure` + `sameSite: strict` para prevenir XSS
- Endpoints cron protegidos con `CRON_SECRET` vía header `x-cron-secret`
- Rate limiting granular: login (5 intentos/15min), API general (100 req/15min)
- Sanitización HTML con `sanitize-html` y lista explícita de tags permitidos
- Validación de tipo MIME real en uploads (magic bytes, no solo extensión)
- Proxy de imágenes con allowlist de dominios (previene SSRF)
- Dependabot activo para actualizaciones semanales

### CORS

El servidor unificado (frontend + backend) opera bajo same-origin, por lo que CORS
no es necesario para el funcionamiento normal. La variable `CORS_ORIGINS` permite
configurar orígenes adicionales separados por coma (ej: para bots OG o futuras apps).

**Comportamiento:**
- Si `CORS_ORIGINS` está vacío → `origin: false`: se bloquean todas las requests
  con cabecera `Origin` (recomendado para producción con servidor unificado).
- Si `CORS_ORIGINS` tiene valores → se permite acceso solo a esos orígenes explícitos.
- Las requests sin cabecera `Origin` (ej: desde Postman) se permiten siempre.

Para probar la API desde Postman u otros clientes, configura `CORS_ORIGINS=*`
en desarrollo (no recomendado en producción).

## 🚀 Despliegue en Render

1. Conecta el repositorio en Render Dashboard
2. Selecciona el blueprint (`render.yaml`) para configuración automática
3. Las variables `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `CRON_SECRET` se generan automáticamente
4. Configura `CLOUDINARY_*` y `ADMIN_EMAIL` manualmente en el dashboard
5. El health check está en `/api/health`
6. Configura cron-job.org apuntando a `https://tu-app.onrender.com/api/cron/fetch-rss`

## 📦 Workspaces del monorepo

| Workspace | Descripción |
|-----------|-------------|
| `@workspace/api-server` | Backend Express.js |
| `@workspace/el-principe-mestizo` | Frontend Vite + React |
| `@workspace/db` | Esquemas DB con Drizzle ORM |
| `@workspace/external-news` | RSS aggregator + extractive summary |
| `@workspace/api-zod` | Esquemas de validación Zod |
| `@workspace/api-client-react` | Cliente API generado |
| `scripts` | Scripts de utilidad |

## 📁 Estructura principal

- `lib/` – lógica de negocio
- `attached_assets/` – recursos estáticos
- `artifacts/` – salidas de compilación

## 🔧 Scripts disponibles

- `pnpm typecheck` – verifica tipos TypeScript
- `pnpm lint` – revisa estilo de código
- `pnpm test` – (próximamente)

## 📄 Licencia

MIT
