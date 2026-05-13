import { Router } from "express";
import { safeError } from "../lib/safeError";

const router = Router();

/**
 * GET /api/tipo-cambio
 * Obtiene el tipo de cambio USD/PEN desde el archivo oficial de la SUNAT.
 * Formato: fecha|compra|venta (ej: 2025-05-06|3.745|3.755)
 * Fuente: https://www.sunat.gob.pe/a/txt/tipoCambio.txt
 */
router.get("/tipo-cambio", async (_req, res): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      "https://www.sunat.gob.pe/a/txt/tipoCambio.txt",
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EPM-Bot/1.0)",
          Accept: "text/plain,*/*",
        },
      },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`SUNAT responded with status ${response.status}`);
    }

    const text = await response.text();
    // Formato: fecha|compra|venta — tomamos la última línea no vacía
    const lines = text
      .trim()
      .split("\n")
      .filter((l) => l.includes("|"));
    if (lines.length === 0) {
      throw new Error("Formato SUNAT no reconocido");
    }

    const lastLine = lines[lines.length - 1].trim();
    const parts = lastLine.split("|");
    if (parts.length < 3) {
      throw new Error("Formato SUNAT inesperado: " + lastLine);
    }

    const compra = parseFloat(parts[1]).toFixed(3);
    const venta = parseFloat(parts[2]).toFixed(3);

    // Cache de 2 horas (SUNAT actualiza una vez al día hábil)
    res.set("Cache-Control", "public, max-age=7200");
    res.json({ compra, venta, fuente: "SUNAT" });
  } catch (err: unknown) {
    // Fallback: exchangerate-api.com
    try {
      const fallback = await fetch(
        "https://api.exchangerate-api.com/v4/latest/USD",
        { signal: AbortSignal.timeout(5000) },
      );
      const data = (await fallback.json()) as { rates?: { PEN?: number } };
      const pen = data?.rates?.PEN;
      if (pen) {
        const venta = Number(pen).toFixed(3);
        res.set("Cache-Control", "public, max-age=3600");
        res.json({ compra: venta, venta, fuente: "exchangerate-api" });
        return;
      }
    } catch {
      // Ambos fallaron
    }

    res.status(502).json({
      error: safeError(err),
    });
  }
});

export default router;
