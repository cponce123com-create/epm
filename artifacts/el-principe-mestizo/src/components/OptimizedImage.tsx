import { useMemo, useState, type ImgHTMLAttributes } from "react";
import { toCloudinaryDeliveryUrl } from "@/lib/image";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  optimizeWidth?: number;
  priority?: boolean;
};

export default function OptimizedImage({
  src,
  fallbackSrc = "/opengraph.jpg",
  optimizeWidth,
  priority = false,
  loading,
  decoding,
  onError,
  ...rest
}: Props) {
  const [failed, setFailed] = useState(false);
  const finalSrc = useMemo(() => {
    const base = failed ? fallbackSrc : typeof src === "string" ? src : "";
    return toCloudinaryDeliveryUrl(base, { width: optimizeWidth });
  }, [failed, fallbackSrc, optimizeWidth, src]);

  return (
    <img
      {...rest}
      src={finalSrc}
      loading={priority ? "eager" : (loading ?? "lazy")}
      decoding={decoding ?? "async"}
      onError={(e) => {
        if (!failed) setFailed(true);
        onError?.(e);
      }}
    />
  );
}

