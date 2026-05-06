import { Router } from "express";

const router = Router();

// Dominios permitidos en el proxy de imágenes
const ALLOWED_IMAGE_HOSTS = new Set([
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

function isAllowedImageHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (ALLOWED_IMAGE_HOSTS.has(hostname)) return true;
    if (MEDIUM_CDN_RE.test(hostname)) return true;
    if (hostname.endsWith(".medium.com")) return true;
    if (hostname.endsWith(".substack.com")) return true;
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
  return new Promise(r => setTimeout(r, ms));
}

router.get("/proxy-image", async (req, res): Promise<void> => {
  const raw = String(req.query["url"] ?? "");

  if (!raw || !isAllowedImageHost(raw)) {
    res.status(400).json({ error: "URL de imagen no permitida." });
    return;
  }

  const headerSets = [
    {
      "User-Agent": randomUA(),
      "Referer": "https://medium.com/",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    {
      "User-Agent": randomUA(),
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
    },
    {
      "User-Agent": randomUA(),
      "Referer": "https://www.google.com/",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  ];

  for (let i = 0; i < headerSets.length; i++) {
    if (i > 0) await sleep(300 * i);
    try {
      const upstream = await fetch(raw, {
        headers: headerSets[i],
        signal: AbortSignal.timeout(15_000),
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

      if (upstream.status !== 403 && upstream.status !== 429) {
        res.status(upstream.status).end();
        return;
      }
    } catch {
      continue;
    }
  }

  // Fallback: usar un proxy de imágenes público como intermediario
  // Render free tier IPs son bloqueadas por Cloudflare (Medium CDN)
  try {
    const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(raw)}&default=-`;
    const weservResponse = await fetch(weservUrl, {
      headers: { "User-Agent": randomUA() },
      signal: AbortSignal.timeout(15_000),
    });

    if (weservResponse.ok) {
      const contentType = weservResponse.headers.get("content-type") ?? "image/jpeg";
      const buffer = Buffer.from(await weservResponse.arrayBuffer());
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
