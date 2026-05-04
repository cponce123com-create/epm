import { Router } from "express";

const router = Router();

/**
 * GET /api/tipo-cambio
 * Obtiene el tipo de cambio USD/PEN desde el Banco de la Nación del Perú.
 * Se hace desde el servidor para evitar problemas de CORS en el frontend.
 * Devuelve: { compra: "3.44", venta: "3.58", fuente: "BN" }
 */
router.get("/api/tipo-cambio", async (_req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      "https://bancaporinternet.bn.com.pe/TCWeb/?KeepThis=true&TB_iframe=true&height=500&width=860",
      {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; EPM-Bot/1.0; +https://elprincipemestizo.eu.cc)",
          Accept: "text/html,application/xhtml+xml",
        },
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`BN responded with status ${response.status}`);
    }

    const html = await response.text();

    // El HTML tiene: Dolar | (S/) 3.4400 | (S/) 3.5800
    // Buscamos los valores con regex sobre el texto del HTML
    const dollarMatch = html.match(
      /Dolar[\s\S]*?\(S\/\)\s*([\d.]+)[\s\S]*?\(S\/\)\s*([\d.]+)/i
    );

    if (!dollarMatch) {
      throw new Error("No se encontró el tipo de cambio en la respuesta del BN");
    }

    const compra = parseFloat(dollarMatch[1]).toFixed(2);
    const venta  = parseFloat(dollarMatch[2]).toFixed(2);

    // Cache de 30 minutos (el BN actualiza una vez al día)
    res.set("Cache-Control", "public, max-age=1800");
    res.json({ compra, venta, fuente: "BN" });
  } catch (err: any) {
    // Si falla el BN, intentamos la API libre de fawazahmed0
    try {
      const fallback = await fetch(
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
      );
      const data = await fallback.json();
      const pen = data?.usd?.pen;

      if (pen) {
        const venta = Number(pen).toFixed(2);
        res.set("Cache-Control", "public, max-age=1800");
        return res.json({ compra: venta, venta, fuente: "fawazahmed0" });
      }
    } catch (_) {
      // fallback también falló
    }

    res.status(502).json({
      error: "No se pudo obtener el tipo de cambio",
      detail: err?.message ?? "unknown",
    });
  }
});

export default router;
