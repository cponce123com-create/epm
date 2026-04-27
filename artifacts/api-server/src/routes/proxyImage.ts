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

  if (!raw || !isMediumUrl(raw)) {
    res.status(400).json({ error: "Only Medium CDN URLs are supported." });
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

  res.status(502).end();
});

export default router;
