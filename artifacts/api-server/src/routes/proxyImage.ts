import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { logger } from "../lib/logger";

const router = Router();

// ── Rate limiting específico para proxy (más estricto que el general) ────────
const proxyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones al proxy de imágenes." },
});
router.use("/proxy-image", proxyLimiter);

// ── Límites ─────────────────────────────────────────────────────────────────
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10 MB
const FETCH_TIMEOUT_MS = 8_000; // 8 segundos
const WESERV_TIMEOUT_MS = 10_000; // 10 segundos para el fallback

// ── Tipos MIME de imagen permitidos ──────────────────────────────────────────
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
]);

// ── Dominios permitidos ──────────────────────────────────────────────────────
// Se permite cualquier dominio que parezca servir imágenes (media CDNs, etc.)
// o que termine en extensión de imagen. Esto evita tener que mantener una
// lista exhaustiva de dominios de medios peruanos e internacionales.
const ALLOWED_IMAGE_HOSTS = new Set([
  // Core platforms
  "medium.com",
  "miro.medium.com",
  "images.unsplash.com",
  "plus.unsplash.com",
  "substackcdn.com",
  "substack-post-media.s3.amazonaws.com",
  "i.imgur.com",
  "pbs.twimg.com",
  "imagekit.io",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "blogger.googleusercontent.com",
  "upload.wikimedia.org",
  "images.squarespace-cdn.com",
]);

const MEDIUM_CDN_RE = /^cdn-images-\d+\.medium\.com$/i;

// Patrones de CDN/hosting comunes que sirven imágenes de medios
const CDN_PATTERNS = [
  /\.cloudinary\.com$/i,
  /\.akamaihd\.net$/i,
  /\.cloudfront\.net$/i,
  /\.fastly\.net$/i,
  /\.kxcdn\.com$/i,
  /\.keycdn\.com$/i,
  /\.stackpathcdn\.com$/i,
  /\.bunnycdn\.ru$/i,
  /\.b-cdn\.net$/i,
  /\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i,
  /\.twimg\.com$/i,
  /\.ytimg\.com$/i,
  /\.googleusercontent\.com$/i,
  /\.gravatar\.com$/i,
  /\.wp\.com$/i,
  /\.wordpress\.com$/i,
  /\.bbc\.co\.uk\/.*\/images\//i,
  /\.bbc\.com\/.*\/images\//i,
  /\.cnn\.com\/.*\/media\//i,
  /\.nytimes\.com\/.*\/images\//i,
  /\.reuters\.com\/.*\/images\//i,
  /\.apnews\.com\/.*\/images\//i,
  /\.theguardian\.com\/.*\/media\//i,
  /\/resizer\/v2\//i, // El Comercio / Gestión resizer
  /\/Thumbnail\//i, // Andina thumbnail
];

// Extensiones de imagen comunes
const IMAGE_EXT_RE =
  /\.(jpg|jpeg|png|gif|webp|avif|bmp|tiff|svg|ico|heic|heif)$/i;

function isAllowedImageHost(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // Check exact hostname match
    if (ALLOWED_IMAGE_HOSTS.has(hostname)) return true;
    if (MEDIUM_CDN_RE.test(hostname)) return true;
    if (hostname.endsWith(".medium.com")) return true;
    if (hostname.endsWith(".substack.com")) return true;

    // Check CDN patterns
    for (const pattern of CDN_PATTERNS) {
      if (pattern.test(url)) return true;
    }

    // Check image extension in path
    if (IMAGE_EXT_RE.test(pathname)) return true;

    return false;
  } catch {
    return false;
  }
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Verifica que el Content-Type de la respuesta sea un tipo de imagen válido.
 */
function isValidImageContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const baseType = contentType.split(";")[0].trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.has(baseType);
}

router.get("/proxy-image", async (req, res): Promise<void> => {
  const raw = String(req.query["url"] ?? "");

  if (!raw || !isAllowedImageHost(raw)) {
    res.status(400).json({ error: "URL de imagen no permitida." });
    return;
  }

  const headerSets: Record<string, string>[] = [
    {
      "User-Agent": randomUA(),
      Referer: "https://medium.com/",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    {
      "User-Agent": randomUA(),
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
    },
    {
      "User-Agent": randomUA(),
      Referer: "https://www.google.com/",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  ];

  for (let i = 0; i < headerSets.length; i++) {
    if (i > 0) await sleep(300 * i);
    try {
      const upstream = await fetch(raw, {
        headers: headerSets[i],
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (upstream.ok) {
        const rawContentType = upstream.headers.get("content-type");

        // Verificar que la respuesta sea realmente una imagen
        if (!isValidImageContentType(rawContentType)) {
          logger.warn(
            { url: raw, contentType: rawContentType },
            "Proxy blocked non-image response",
          );
          res
            .status(400)
            .json({ error: "La URL no devolvió una imagen válida." });
          return;
        }

        const contentType: string = rawContentType!;

        // Verificar Content-Length antes de descargar
        const contentLength = upstream.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
          logger.warn(
            { url: raw, contentLength },
            "Proxy blocked oversized response",
          );
          res.status(400).json({
            error: "La imagen excede el tamaño máximo permitido (10 MB).",
          });
          return;
        }

        const buffer = Buffer.from(await upstream.arrayBuffer());

        // Verificar tamaño real del buffer
        if (buffer.length > MAX_RESPONSE_SIZE) {
          logger.warn(
            { url: raw, size: buffer.length },
            "Proxy blocked oversized buffer",
          );
          res.status(400).json({
            error: "La imagen excede el tamaño máximo permitido (10 MB).",
          });
          return;
        }

        res.set("Content-Type", contentType);
        res.set("Cache-Control", "public, max-age=31536000, immutable");
        res.set("X-Content-Type-Options", "nosniff");
        res.send(buffer);
        return;
      }

      if (upstream.status !== 403 && upstream.status !== 429) {
        res.status(upstream.status).end();
        return;
      }
    } catch {
      continue;
    }
  }

  // Fallback: usar images.weserv.nl como proxy intermediario
  try {
    const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(raw)}&default=-&maxage=7d`;
    const weservResponse = await fetch(weservUrl, {
      headers: { "User-Agent": randomUA() },
      signal: AbortSignal.timeout(WESERV_TIMEOUT_MS),
    });

    if (weservResponse.ok) {
      const rawContentType =
        weservResponse.headers.get("content-type") ?? "image/jpeg";

      if (!isValidImageContentType(rawContentType)) {
        res.status(502).end();
        return;
      }

      const contentType: string = rawContentType;

      const contentLength = weservResponse.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
        res.status(502).end();
        return;
      }

      const buffer = Buffer.from(await weservResponse.arrayBuffer());

      if (buffer.length > MAX_RESPONSE_SIZE) {
        res.status(502).end();
        return;
      }

      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=604800");
      res.set("X-Content-Type-Options", "nosniff");
      res.send(buffer);
      return;
    }
  } catch {
    // El fallback también falló
  }

  res.status(502).end();
});

export default router;
