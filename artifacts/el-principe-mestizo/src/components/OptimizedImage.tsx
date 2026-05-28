import { useMemo, useState, type ImgHTMLAttributes, useId } from "react";
import { isMediumImageUrl, toCloudinaryDeliveryUrl } from "@/lib/image";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  optimizeWidth?: number;
  priority?: boolean;
};

// Base URL del API — en producción es la URL de Render, en dev es vacío (proxy de Vite)
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

const SRC_BREAKPOINTS = [400, 800, 1200];

function toProxyUrl(url: string): string {
  return `${API_BASE}/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function isProxyUrl(url: string): boolean {
  return url.includes("/api/proxy-image");
}

function resolveSrc(source: string): string {
  if (isProxyUrl(source) && source.startsWith("/api/")) {
    return `${API_BASE}${source}`;
  }
  const routed = isMediumImageUrl(source) ? toProxyUrl(source) : source;
  return toCloudinaryDeliveryUrl(routed, { width: undefined });
}

function buildCloudinarySrcset(source: string): string | undefined {
  try {
    const normalized = source.startsWith("//") ? `https:${source}` : source;
    const url = new URL(normalized);
    if (!url.hostname.includes("res.cloudinary.com")) return undefined;

    const base = normalized.replace(/\/upload\//, "/upload/");
    const sizes = SRC_BREAKPOINTS.map(
      (w) => `${base.replace(/\/upload\//, `/upload/f_auto,q_auto,c_limit,w_${w}/`)} ${w}w`,
    );
    return sizes.join(", ");
  } catch {
    return undefined;
  }
}

export default function OptimizedImage({
  src,
  fallbackSrc,
  optimizeWidth,
  priority = false,
  loading,
  decoding,
  width,
  height,
  onError,
  ...rest
}: Props) {
  const [failed, setFailed] = useState(false);
  const id = useId();

  const { finalSrc, srcSet } = useMemo(() => {
    const source = typeof src === "string" ? src : "";
    const base = failed ? (fallbackSrc ?? source) : source;

    const resolved = resolveSrc(base);
    const ss = buildCloudinarySrcset(resolved);

    return { finalSrc: resolved, srcSet: ss };
  }, [failed, fallbackSrc, src]);

  return (
    <img
      {...rest}
      src={finalSrc}
      srcSet={srcSet}
      sizes={srcSet ? "(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px" : undefined}
      width={width}
      height={height}
      loading={priority ? "eager" : (loading ?? "lazy")}
      decoding={decoding ?? "async"}
      onError={(e) => {
        if (!failed && fallbackSrc) setFailed(true);
        onError?.(e);
      }}
    />
  );
}
