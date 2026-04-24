import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Render espera GET /api/health según render.yaml healthCheckPath
router.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// También mantenemos /healthz por compatibilidad
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

export default router;
