/**
 * Envuelve una URL de imagen externa en nuestro proxy para:
 * - Evitar bloqueos CSP (connect-src / img-src)
 * - Bypassear hotlinking (503) — el proxy hace fetch server-to-server
 */
export function proxyImageUrl(
  rawUrl: string | null | undefined,
): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }
  return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
}
