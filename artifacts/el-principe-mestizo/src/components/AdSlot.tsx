import { useEffect, useRef } from "react";
import { useGetPublicSettings } from "@workspace/api-client-react";

interface AdSlotProps {
  format: "horizontal" | "vertical" | "rectangle" | "leaderboard";
  className?: string;
}

function Placeholder({ format }: { format: AdSlotProps["format"] }) {
  return (
    <div
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

// ── Carga el script de AdSense una sola vez ──────────────────────────────
let adsenseScriptLoaded = false;

function loadAdsenseScript(clientId: string) {
  if (adsenseScriptLoaded) return;
  adsenseScriptLoaded = true;

  const script = document.createElement("script");
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + clientId;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-ad-client", clientId);
  document.head.appendChild(script);
}

export default function AdSlot({ format, className = "" }: AdSlotProps) {
  const { data: settings } = useGetPublicSettings();
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  const s = settings as any;
  const adsMode = s?.adsMode ?? "disabled";
  const adsenseClient = s?.adsenseClient ?? "";

  const isHorizontal = format === "horizontal" || format === "leaderboard";
  const adCode = isHorizontal ? (s?.adCode1 ?? "") : (s?.adCode2 ?? "");

  const isAdsense = adsMode === "adsense" && !!adsenseClient;

  // IDs de slot configurables desde admin
  const slotMap: Record<string, string> = {
    leaderboard: s?.adSlot1Id || "9012345678",
    horizontal:  s?.adSlot2Id || "9012345679",
    rectangle:   s?.adSlot3Id || "9012345680",
    vertical:    s?.adSlot4Id || "9012345681",
  };

  // Cargar script de AdSense al montar si está en modo adsense
  useEffect(() => {
    if (!isAdsense) return;
    loadAdsenseScript(adsenseClient);
  }, [isAdsense, adsenseClient]);

  // Push de AdSense para cada slot
  useEffect(() => {
    if (!isAdsense || pushed.current) return;
    pushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense puede fallar si está bloqueado
    }
  }, [isAdsense]);

  // Hook de código HTML/JS — inyecta scripts correctamente
  useEffect(() => {
    if (adsMode !== "code" || !adCode || !adRef.current) return;
    // Limpiar contenido previo
    adRef.current.innerHTML = "";
    // Insertar el HTML
    adRef.current.innerHTML = adCode;
    // Re-crear scripts para que se ejecuten
    const scripts = adRef.current.querySelectorAll("script");
    scripts.forEach(oldScript => {
      const newScript = document.createElement("script");
      // Copiar atributos
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      // Copiar contenido inline
      newScript.textContent = oldScript.textContent;
      // Reemplazar
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [adsMode, adCode]);

  // ── Modo code (HTML/JS) ──────────────────────────────────────────────────
  if (adsMode === "code" && adCode) {
    return (
      <div ref={adRef} className={className} />
    );
  }

  // ── Modo direct ──────────────────────────────────────────────────────────
  if (adsMode === "direct") {
    const image = isHorizontal ? (s?.adSlot1Image ?? "") : (s?.adSlot2Image ?? "");
    const link  = isHorizontal ? (s?.adSlot1Link ?? "") : (s?.adSlot2Link ?? "");
    const alt   = isHorizontal ? (s?.adSlot1Alt ?? "Publicidad") : (s?.adSlot2Alt ?? "Publicidad");

    if (!image) return <Placeholder format={format} />;

    const imgEl = (
      <img
        src={image}
        alt={alt}
        style={{ width: "100%", display: "block", height: "auto" }}
        loading="lazy"
      />
    );

    if (link) {
      return (
        <a href={link} target="_blank" rel="noopener sponsored" className={className}>
          {imgEl}
        </a>
      );
    }
    return <div className={className}>{imgEl}</div>;
  }

  // ── Modo adsense ─────────────────────────────────────────────────────────
  if (isAdsense) {
    return (
      <div ref={adRef} className={`ad-slot ${className}`} data-format={format}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={adsenseClient}
          data-ad-slot={slotMap[format]}
          data-ad-format={format === "leaderboard" || format === "horizontal" ? "horizontal" : "auto"}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // ── Modo disabled (default) ──────────────────────────────────────────────
  return <Placeholder format={format} />;
}
