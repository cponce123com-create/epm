import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode },
      },
    },
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Acepta peticiones desde cualquier origen (el rewrite de Render estático
// llega como petición cross-origin desde el CDN de Render).
// Authorization header está explícitamente permitido para que los tokens JWT funcionen.
app.use(
  cors({
    origin: true,                          // refleja el Origin de cada petición
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,                         // preflight se cachea 24 h
  }),
);

// Responde al preflight OPTIONS de forma explícita (fallback de seguridad)
app.options("*", cors());

// ── Body parsers ──────────────────────────────────────────────────────────────
// Aumentamos el límite a 50 MB para que el JSON de artículos largos no falle.
// El ZIP de Medium lo maneja multer (memoryStorage) en su propia ruta —
// no pasa por estos parsers — así que no hay conflicto.
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── 404 genérico para rutas de API no encontradas ─────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ── Manejador global de errores ───────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
