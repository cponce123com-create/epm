import "./env-check"; // DEBE ser el primer import
import app from "./app";
import { logger } from "./lib/logger";
import { seed } from "./lib/seed";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

const port = Number(process.env["PORT"]!);

// ── Graceful shutdown ───────────────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 10_000; // 10 segundos máximo

async function gracefulShutdown(
  signal: string,
  server: ReturnType<typeof app.listen>,
) {
  logger.info({ signal }, "Shutdown signal received — draining connections…");

  // 1. Dejar de aceptar nuevas conexiones
  server.close((err) => {
    if (err) logger.error({ err }, "Error closing HTTP server");
  });

  // 2. Dar un tiempo breve para que las conexiones activas terminen
  try {
    await new Promise<void>((resolve) => {
      server.closeIdleConnections?.();
      setTimeout(resolve, 2_000);
    });

    // 3. Cerrar el pool de PostgreSQL
    logger.info("Closing PostgreSQL pool…");
    await pool.end();
    logger.info("PostgreSQL pool closed");

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during graceful shutdown");
    process.exit(1);
  }
}

// Crea las tablas si no existen usando push directo del schema
async function initDb() {
  logger.info("Running database schema push...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'author',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      bio TEXT NOT NULL DEFAULT '',
      twitter_handle VARCHAR(100) NOT NULL DEFAULT '',
      article_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#333333',
      description TEXT,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      cover_image_url TEXT,
      cover_image_alt TEXT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      author_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'draft',
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      views INTEGER NOT NULL DEFAULT 0,
      reading_time INTEGER NOT NULL DEFAULT 1,
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      editorial_note TEXT NOT NULL DEFAULT '',
      last_edited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      language VARCHAR(10) NOT NULL DEFAULT 'es',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      secondary_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      article_id INTEGER REFERENCES articles(id),
      author_name TEXT NOT NULL,
      author_email TEXT,
      content TEXT NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS site_settings (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      google_id TEXT UNIQUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS article_revisions (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      summary TEXT NOT NULL,
      saved_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      related_article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_permissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission VARCHAR(100) NOT NULL,
      granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, permission)
      );
      CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
  `);
  // Ensure secondary_category_id exists on already-deployed databases
  await db.execute(sql`
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS secondary_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
  `);

  // ── Migraciones progresivas de artículos ──────────────────────────────
  logger.info("Running articles table migrations...");
  await db.execute(sql`
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS editorial_note TEXT NOT NULL DEFAULT '';
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS last_edited_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS word_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'es';
  `);

  // ── Migraciones progresivas de usuarios ────────────────────────────────
  logger.info("Running user table migrations...");
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_handle VARCHAR(100) NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS article_count INTEGER NOT NULL DEFAULT 0;
  `);

  // ── Índices de rendimiento ────────────────────────────────────────────────
  logger.info("Creating database indexes...");
  await db.execute(sql`
    -- Articles: filtrado por status + orden por fecha (query más frecuente)
    CREATE INDEX IF NOT EXISTS idx_articles_status_published
      ON articles (status, published_at DESC)
      WHERE status = 'published';

    -- Articles: búsqueda por categoría
    CREATE INDEX IF NOT EXISTS idx_articles_category_id
      ON articles (category_id);

    -- Articles: búsqueda por autor (admin dashboard)
    CREATE INDEX IF NOT EXISTS idx_articles_author_id
      ON articles (author_id);

    -- Articles: featured articles query
    CREATE INDEX IF NOT EXISTS idx_articles_featured
      ON articles (featured, published_at DESC)
      WHERE featured = true AND status = 'published';

    -- Comments: obtener comentarios de un artículo
    CREATE INDEX IF NOT EXISTS idx_comments_article_id
      ON comments (article_id);

    -- Comments: filtrar por estado de aprobación (admin)
    CREATE INDEX IF NOT EXISTS idx_comments_approved
      ON comments (approved, created_at DESC);

    -- Categories: búsqueda por slug (frecuente en URLs públicas)
    CREATE INDEX IF NOT EXISTS idx_categories_slug
      ON categories (slug);

    -- Subscribers: búsqueda por email
    CREATE INDEX IF NOT EXISTS idx_subscribers_email
      ON subscribers (email);
  `);
  logger.info("Database indexes ready.");

  logger.info("Database schema ready.");
}

initDb()
  .then(() => seed())
  .then(() => {
    const server = app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });

    // Registrar handlers de shutdown
    let shuttingDown = false;
    const shutdown = (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      gracefulShutdown(signal, server);

      // Timeout forzado: si no terminó en SHUTDOWN_TIMEOUT_MS, salir con error
      setTimeout(() => {
        logger.error("Graceful shutdown timed out — forcing exit");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => {
    logger.error({ err }, "Failed to initialize database");
    process.exit(1);
  });
