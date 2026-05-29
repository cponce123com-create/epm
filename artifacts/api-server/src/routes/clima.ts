import { Router } from "express";

const router = Router();

/**
 * GET /api/clima
 * Obtiene temperatura actual y código de clima para Chanchamayo desde Open-Meteo.
 * API gratuita, sin clave, coordenadas: lat=-11.12, lon=-75.34.
 * Devuelve: { temp: "24", emoji: "☀️", fuente: "open-meteo" }
 */
router.get("/clima", async (_req, res): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-11.12&longitude=-75.34&current=temperature_2m,weathercode&timezone=America%2FLima",
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Open-Meteo responded with status ${response.status}`);
    }

    const data = (await response.json()) as {
      current?: { temperature_2m?: number; weathercode?: number };
    };

    const temp = Math.round(data?.current?.temperature_2m ?? 0);
    const code = data?.current?.weathercode ?? -1;

    // Mapeo de weathercode de Open-Meteo a emoji
    const emoji = weatherEmoji(code);

    // Cache de 30 minutos
    res.set("Cache-Control", "public, max-age=1800");
    res.json({ temp: String(temp), emoji, fuente: "open-meteo" });
  } catch (err: unknown) {
    // Fallback silencioso: no romper la UI del frontend si Open-Meteo no responde
    res.json({ temp: "--", emoji: "🌤️", fuente: "fallback" });
  }
});

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️"; // despejado
  if (code >= 1 && code <= 3) return "⛅"; // parcialmente nublado
  if (code === 45 || code === 48) return "🌫️"; // neblina
  if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65)) return "🌧️"; // lluvia
  if (code >= 71 && code <= 77) return "🌨️"; // nieve
  if (code >= 80 && code <= 82) return "🌦️"; // chubascos
  if (code === 95 || code === 96 || code === 99) return "⛈️"; // tormenta
  return "🌤️";
}

export default router;
