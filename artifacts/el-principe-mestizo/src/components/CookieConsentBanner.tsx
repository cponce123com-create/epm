import { useCookieConsent } from "@/hooks/useCookieConsent";
import { Link } from "wouter";
import { Cookie } from "lucide-react";

export default function CookieConsentBanner() {
  const { hasConsent, acceptAll, acceptNecessary } = useCookieConsent();

  if (hasConsent) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-white border-t border-border shadow-2xl">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-sans-ui text-sm font-medium text-foreground">
              Este sitio utiliza cookies
            </p>
            <p className="font-sans-ui text-xs text-muted-foreground mt-0.5">
              Usamos cookies para mejorar tu experiencia, mostrar anuncios personalizados y analizar el tráfico.
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              Podés aceptar todas o solo las necesarias.{" "}
              <Link href="/privacidad" className="underline hover:text-primary transition-colors">
                Más información
              </Link>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={acceptNecessary}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-sans-ui font-medium border border-input rounded-md hover:bg-muted transition-colors"
          >
            Solo necesarias
          </button>
          <button
            onClick={acceptAll}
            className="flex-1 sm:flex-none px-5 py-2 text-sm font-sans-ui font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}
