# El Príncipe Mestizo — Citizen Journalism Platform

## Project Overview

Full-stack citizen journalism blog for a columnist from San Ramón, Chanchamayo (Peru). Includes a public-facing editorial blog and an admin panel.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Frontend**: React + Vite (artifact: `el-principe-mestizo`)
- **Backend**: Express 5 + PostgreSQL (Drizzle ORM)
- **Auth**: JWT (bcryptjs, SESSION_SECRET env var)
- **API**: OpenAPI spec → Orval codegen → React Query hooks
- **Rich Text Editor**: TipTap (with StarterKit, Link, Image, TextAlign, Underline, Placeholder)
- **Image Upload**: Cloudinary (with fallback to local storage)
- **Fonts**: Playfair Display (display), Source Serif 4 (body), Inter (UI)

## Architecture

```
artifacts/
  api-server/       — Express 5 REST API (port 8080)
  el-principe-mestizo/ — React+Vite frontend (port $PORT, proxied to 80)
  mockup-sandbox/   — Design sandbox

lib/
  db/               — Drizzle schema + client
  api-spec/         — OpenAPI spec (openapi.yaml) + orval codegen config
  api-client-react/ — Generated React Query hooks (+ custom-fetch.ts)
  api-zod/          — Generated Zod validators
```

## Public Pages

- `/` — Home (hero featured + secondary featured + article grid + sidebar)
- `/articulo/:slug` — Article detail (reading progress bar, related, comments)
- `/categoria/:slug` — Category (denuncia, opinion, investigacion, ciudad, politica)
- `/buscar` — Search (debounced, 400ms)
- `/acerca-de` — About page

## Admin Panel (`/admin/*`)

- `/admin/login` — JWT login (admin@elprincinemestizo.com / admin123)
- `/admin/dashboard` — Stats overview + most read + pending comments
- `/admin/articles` — Article list (filter by status, publish toggle, delete)
- `/admin/articles/new` — Create article with TipTap editor
- `/admin/articles/:id/edit` — Edit article
- `/admin/comments` — Comment moderation (approve/delete)
- `/admin/settings` — Site settings (about text, social URLs, AdSense)

## API Endpoints

- `GET /api/healthz` — Health check
- `GET /api/articles` — Paginated public articles (ArticlesPage)
- `GET /api/articles/featured` — Featured articles (max 3)
- `GET /api/articles/:slug` — Article detail (increments views)
- `GET /api/articles/:slug/related` — Related articles
- `GET /api/categories` — All categories with article counts
- `GET /api/comments/:articleId` — Approved comments
- `POST /api/comments` — Create comment (pending moderation)
- `GET /api/settings/public` — Public site settings
- `GET /api/admin/most-read` — Most read articles (no auth)
- `POST /api/auth/login` — Login → JWT token
- `GET /api/admin/articles` — Admin articles list (Article[])
- `POST /api/admin/articles` — Create article
- `PUT /api/admin/articles/:id` — Update article
- `DELETE /api/admin/articles/:id` — Delete article
- `PUT /api/admin/articles/:id/publish` — Toggle publish
- `GET /api/admin/comments` — All comments with filter
- `PUT /api/admin/comments/:id/approve` — Approve comment
- `DELETE /api/admin/comments/:id` — Delete comment
- `GET /api/admin/settings` — All settings (AllSettings)
- `PUT /api/admin/settings` — Update setting ({ key, value })
- `POST /api/admin/upload` — Upload image (Cloudinary or local)
- `GET /api/admin/stats` — Admin stats (AdminStats)

## Key Notes

- `lib/api-client-react/package.json` exports `"."` and `"./custom-fetch"` (needed for auth token getter)
- `lib/api-zod/src/index.ts` must only export from `"./generated/api"` — codegen may overwrite it
- Admin settings API uses `{ key, value }` pairs — one call per setting to update
- `adminGetArticles` returns `Article[]` (not paginated) vs. public `getArticles` → `ArticlesPage`
- `adminGetComments` returns `Comment[]` (not paginated) — Comment uses `approved: boolean` (not `status`)
- Article schema field is `featured` (not `isFeatured`) and `views` (not `viewCount`)
- Vite proxies `/api/*` → `http://localhost:8080` in dev
- Admin credentials: `admin@elprincinemestizo.com` / `admin123` (from ADMIN_EMAIL/ADMIN_PASSWORD env or defaults)

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm run build` — build all
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks
- `pnpm --filter @workspace/db run push` — push DB schema
- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/api-server run seed` — seed DB (categories + admin user + 3 articles)
