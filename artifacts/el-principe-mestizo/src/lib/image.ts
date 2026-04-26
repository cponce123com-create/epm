const MEDIUM_HOST_RE = /(^|\.)medium\.com$|(^|\.)miro\.medium\.com$|(^|\.)cdn-images-\d+\.medium\.com$/i;

export function isMediumImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return MEDIUM_HOST_RE.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function normalizeMaybeProtocolRelativeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

export function toCloudinaryDeliveryUrl(
  url: string | null | undefined,
  options?: { width?: number; quality?: "auto:good" | "auto:best" | "auto" },
): string {
  if (!url) return "";
  const normalized = normalizeMaybeProtocolRelativeUrl(url);

  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname.includes("res.cloudinary.com")) return normalized;

    const quality = options?.quality ?? "auto:good";
    const transforms = [`f_auto`, `q_${quality}`, "dpr_auto"];
    if (options?.width) transforms.push(`c_limit,w_${options.width}`);

    const uploadMarker = "/upload/";
    const markerIndex = normalized.indexOf(uploadMarker);
    if (markerIndex < 0) return normalized;

    const before = normalized.slice(0, markerIndex + uploadMarker.length);
    const after = normalized.slice(markerIndex + uploadMarker.length);
    const firstPathSegment = after.split("/")[0] ?? "";
    const looksLikeTransformSegment = firstPathSegment.includes(",") && /[a-z]+_[^,]+/.test(firstPathSegment);

    if (looksLikeTransformSegment) return normalized;
    return `${before}${transforms.join(",")}/${after}`;
  } catch {
    return normalized;
  }
}
