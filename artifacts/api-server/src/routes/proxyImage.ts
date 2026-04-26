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

// GET /api/proxy-image?url=<encoded-medium-cdn-url>
// Fetches the image from Medium CDN server-side (no Referer header sent),
// bypassing their hotlink protection. Returns the image with immutable
// Cache-Control so browsers only fetch it once.
router.get("/proxy-image", async (req, res): Promise<void> => {
  const raw = String(req.query["url"] ?? "");

  if (!raw || !isMediumUrl(raw)) {
    res.status(400).json({ error: "Only Medium CDN URLs are supported." });
    return;
  }

  try {
    const upstream = await fetch(raw, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        // Deliberately no Referer — this is what bypasses Medium CDN blocking
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(buffer);
  } catch {
    res.status(502).end();
  }
});

export default router;
