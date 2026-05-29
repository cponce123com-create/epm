/**
 * SummarizeButton — Botón "📄 En Otras Palabras" para artículos.
 * Llama a POST /api/summarize/article/:id y muestra el resumen en un modal.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, AlertCircle } from "lucide-react";

interface SummarizeButtonProps {
  articleId: number;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export default function SummarizeButton({ articleId }: SummarizeButtonProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleSummarize = async () => {
    if (summary) return; // Already fetched
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/summarize/article/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) handleSummarize(); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-sm"
        >
          <FileText size={14} />
          En Otras Palabras
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            En Otras Palabras
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[100px]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
              <span className="ml-2 text-sm text-muted-foreground">Generando resumen...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {summary && !loading && (
            <div className="text-sm leading-relaxed text-foreground/90 space-y-2">
              <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Resumen extractivo
              </p>
              <p>{summary}</p>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Resumen generado automáticamente a partir del inicio del artículo.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
