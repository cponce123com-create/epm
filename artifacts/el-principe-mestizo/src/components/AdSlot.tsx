import { useEffect, useRef } from "react";
import { useGetPublicSettings } from "@workspace/api-client-react";

interface AdSlotProps {
  format: "horizontal" | "vertical" | "rectangle" | "leaderboard";
  className?: string;
}

const AD_SLOT_IDS: Record<AdSlotProps["format"], string> = {
  horizontal: "9012345678",
  vertical: "9012345679",
  rectangle: "9012345680",
  leaderboard: "9012345681",
};

export default function AdSlot({ format, className = "" }: AdSlotProps) {
  const { data: settings } = useGetPublicSettings();
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  const adsenseClient = (settings as any)?.adsenseClient ?? "";
  const hasAdsense = adsenseClient && adsenseClient !== "disabled";

  useEffect(() => {
    if (!hasAdsense || pushed.current) return;
    pushed.current = true;

    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense puede fallar si está bloqueado — silencioso
    }
  }, [hasAdsense]);

  if (!hasAdsense) {
    return (
      <div
        ref={adRef}
        className={`ad-placeholder ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #D6CFBF",
          color: "#B5AFA0",
          fontFamily: "var(--app-font-sans)",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "rgba(214,207,191,0.15)",
          ...(format === "leaderboard"
            ? { minHeight: 90, width: "100%" }
            : format === "horizontal"
              ? { minHeight: 90, width: "100%" }
              : format === "rectangle"
                ? { minHeight: 250, width: "100%", maxWidth: 300 }
                : { minHeight: 400, width: 160 }),
        }}
      >
        Espacio publicitario
      </div>
    );
  }

  return (
    <div ref={adRef} className={`ad-slot ${className}`} data-format={format}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseClient}
        data-ad-slot={AD_SLOT_IDS[format]}
        data-ad-format={format === "leaderboard" || format === "horizontal" ? "horizontal" : "auto"}
        data-full-width-responsive="true"
      />
    </div>
  );
}
