import { useMemo, useState, type ImgHTMLAttributes } from "react";
import { toCloudinaryDeliveryUrl } from "@/lib/image";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  optimizeWidth?: number;
  priority?: boolean;
};

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
    return toCloudinaryDeliveryUrl(base, { width: optimizeWidth });
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
