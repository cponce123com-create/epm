import { useMemo, useState, type ImgHTMLAttributes } from "react";
import { isMediumImageUrl, toCloudinaryDeliveryUrl } from "@/lib/image";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  optimizeWidth?: number;
  priority?: boolean;
};

// Base URL del API — en producción es la URL de Render, en dev es vacío (proxy de Vite)
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

function toProxyUrl(url: string): string {
  return `${API_BASE}/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function isProxyUrl(url: string): boolean {
  return url.includes("/api/proxy-image");
}

export default function OptimizedImage({
  src,
  fallbackSrc,
  optimizeWidth,
  priority = false,
  loading,
  decoding,
  onError,
  ...rest
}: Props) {
  const [failed, setFailed] = useState(false);

  const finalSrc = useMemo(() => {
    const source = typeof src === "string" ? src : "";
    const base = failed ? (fallbackSrc ?? source) : source;

    // Si ya es una URL proxy relativa (/api/proxy-image?...), añadir el API_BASE
    if (isProxyUrl(base) && base.startsWith("/api/")) {
      return `${API_BASE}${base}`;
    }

    // Rutar URLs de Medium CDN a través del proxy
    const routed = isMediumImageUrl(base) ? toProxyUrl(base) : base;
    return toCloudinaryDeliveryUrl(routed, { width: optimizeWidth });
  }, [failed, fallbackSrc, optimizeWidth, src]);

  return (
    <img
      {...rest}
      src={finalSrc}
      loading={priority ? "eager" : (loading ?? "lazy")}
      decoding={decoding ?? "async"}
      onError={(e) => {
        if (!failed && fallbackSrc) setFailed(true);
        onError?.(e);
      }}
    />
  );
}
