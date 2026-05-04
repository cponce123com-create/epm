import { Router } from "express";

const router = Router();

router.get("/api/tipo-cambio", async (_req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(
      "https://bancaporinternet.bn.com.pe/TCWeb/?KeepThis=true&TB_iframe=true&height=500&width=860",
      { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" } }
    );
    clearTimeout(timeout);
    const html = await response.text();
    const m = html.match(/Dolar[\s\S]*?\(S\/\)\s*([\d.]+)[\s\S]*?\(S\/\)\s*([\d.]+)/i);
    if (!m) throw new Error("No se encontro el tipo de cambio");
    res.set("Cache-Control", "public, max-age=1800");
    res.json({ compra: parseFloat(m[1]).toFixed(2), venta: parseFloat(m[2]).toFixed(2), fuente: "BN" });
  } catch (err: any) {
    try {
      const r = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json");
      const d = await r.json();
      const pen = d?.usd?.pen;
      if (pen) {
        res.set("Cache-Control", "public, max-age=1800");
        return res.json({ compra: Number(pen).toFixed(2), venta: Number(pen).toFixed(2), fuente: "fawazahmed0" });
      }
    } catch (_) {}
    res.status(502).json({ error: "No se pudo obtener el tipo de cambio", detail: err?.message ?? "unknown" });
  }
});

export default router;
