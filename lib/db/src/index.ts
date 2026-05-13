import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "FATAL: DATABASE_URL must be set. Did you forget to provision a database?",
  );
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isProduction ? 10 : 3, // Neon free tier: 20 max; dejamos margen
  idleTimeoutMillis: 30_000, // Cerrar conexiones inactivas tras 30s
  connectionTimeoutMillis: 10_000, // Timeout al conectar: 10s
  maxUses: 500, // Reciclar conexiones tras 500 usos
  allowExitOnIdle: true, // Permitir que el proceso termine sin drenar
});

export const db = drizzle(pool, { schema });

export * from "./schema";
