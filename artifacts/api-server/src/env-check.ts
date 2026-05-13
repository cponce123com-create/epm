import "dotenv/config";

// ── Capturar errores fatales que ocurran ANTES de que el logger esté listo ──
// Esto asegura que Render muestre el stack trace en los logs,
// en lugar de solo "Exited with status 1".

process.on("uncaughtException", (err) => {
  console.error("FATAL: Uncaught exception:");
  console.error(err?.stack ?? err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("FATAL: Unhandled rejection:");
  console.error(
    reason instanceof Error ? reason.stack : JSON.stringify(reason),
  );
  process.exit(1);
});

// ── Validación temprana de variables de entorno obligatorias ────────────────
// Centraliza todos los checks de arranque en un solo lugar,
// ANTES de que cualquier otro módulo se evalúe.

const REQUIRED_VARS = ["PORT", "DATABASE_URL", "JWT_SECRET"] as const;

const missing: string[] = [];

for (const name of REQUIRED_VARS) {
  if (!process.env[name]) {
    missing.push(name);
  }
}

if (missing.length > 0) {
  console.error(
    `FATAL: Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

// Validar longitud mínima de JWT_SECRET (32 caracteres = 256 bits)
const jwtSecret = process.env.JWT_SECRET!;
if (jwtSecret.length < 32) {
  console.error(
    `FATAL: JWT_SECRET must be at least 32 characters long (currently ${jwtSecret.length}).`,
  );
  console.error(
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
  );
  process.exit(1);
}

console.log("✅ Environment check passed.");
