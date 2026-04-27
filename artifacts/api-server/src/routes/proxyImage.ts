import { Router } from "express";

const router = Router();

const MEDIUM_HOST_RE =
  /(^|\.)medium\.com$|(^|\.)miro\.medium\.com$|(^|\.)cdn-images-\d+\.medium\.com$/i;

function isMediumUrl(url: string): boolean {
  try {
    return MEDIUM_HOST_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Lista de User-Agents para rotar y evitar bloqueos por rate limiting
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// GET /api/proxy-image?url=<encoded-medium-cdn-url>
router.get("/proxy-image", async (req, res): Promise<void> => {
  const raw = String(req.query["url"] ?? "");

  if (!raw || !isMediumUrl(raw)) {
    res.status(400).json({ error: "Only Medium CDN URLs are supported." });
    return;
  }

  // Intentar con distintas combinaciones de headers para evitar el 403
  const attempts = [
    // Intento 1: con Referer de medium.com
    {
      "User-Agent": randomUserAgent(),
      "Referer": "https://medium.com/",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
    },
    // Intento 2: sin Referer pero con más headers de navegador
    {
      "User-Agent": randomUserAgent(),
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
    },
    // Intento 3: Referer de Google (a veces funciona)
    {
      "User-Agent": randomUserAgent(),
      "Referer": "https://www.google.com/",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  ];

  for (const headers of attempts) {
    try {
      const upstream = await fetch(raw, {
        headers,
        signal: AbortSignal.timeout(20_000),
      });

      if (upstream.ok) {
        const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.set("Content-Type", contentType);
        res.set("Cache-Control", "public, max-age=31536000, immutable");
        res.set("X-Content-Type-Options", "nosniff");
        res.send(buffer);
        return;
      }

      // Si es 403 o 429, intentar con el siguiente set de headers
      if (upstream.status === 403 || upstream.status === 429) {
        continue;
      }

      // Otro error — responder directamente
      res.status(upstream.status).end();
      return;

    } catch {
      continue;
    }
  }

  // Todos los intentos fallaron
  res.status(502).end();
});

export default router;
