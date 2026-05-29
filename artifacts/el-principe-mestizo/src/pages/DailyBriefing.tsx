/**
 * DailyBriefing — Página que muestra el resumen diario de noticias externas.
 */
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, Loader2, AlertCircle, Calendar, ExternalLink, RefreshCw } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface Briefing {
  id: number;
  briefingDate: string;
  content: string;
  createdAt: string;
}

export default function DailyBriefing() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/daily-briefing/latest`);
      if (!res.ok) {
        if (res.status === 404) {
          setBriefing(null);
          setLoading(false);
          return;
        }
        throw new Error(`Error ${res.status}`);
      }
      const data = await res.json();
      setBriefing(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  // Parse briefing content: split by double newline
  const renderContent = (content: string) => {
    const lines = content.split("

");
    return lines.map((block, i) => {
      if (block.startsWith("📰 Resumen de Noticias")) {
        return (
          <h1
            key={i}
            className="font-display text-2xl sm:text-3xl font-bold mb-6"
          >
            {block}
          </h1>
        );
      }

      // Check if it's a numbered headline (e.g., "1. Title — Source")
      const headlineMatch = block.match(/^(\d+)\.\s(.+?)\s[—–-]\s(.+)$/m);
      if (headlineMatch) {
        const linesSplit = block.split("
");
        const titlePart = linesSplit[0];
        const linkPart = linesSplit[1]?.trim();
        return (
          <div key={i} className="mb-4 p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
            <p className="text-sm font-medium text-foreground/90">{titlePart}</p>
            {linkPart && (
              <a
                href={linkPart}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <ExternalLink size={10} />
                Leer artículo
              </a>
            )}
          </div>
        );
      }

      return (
        <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap">
          {block}
        </p>
      );
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-PE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <FileText size={14} />
            <span>Noticias Externas</span>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Resumen Diario</h2>
            <button
              onClick={fetchBriefing}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-lg">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Error al cargar briefing</p>
              <p className="text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && !briefing && (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-sans-ui">
              No hay briefings disponibles aún.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              El resumen diario se genera automáticamente cada 6 horas.
            </p>
          </div>
        )}

        {briefing && !loading && (
          <article>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 pb-4 border-b border-border">
              <Calendar size={12} />
              <span>{formatDate(briefing.briefingDate)}</span>
            </div>
            <div className="space-y-2">
              {renderContent(briefing.content)}
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
}
