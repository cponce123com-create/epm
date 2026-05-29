/**
 * Trends — Panel de tendencias: palabras clave y fuentes más activas.
 */
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { TrendingUp, Loader2, AlertCircle, Newspaper, RefreshCw } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface TrendWord {
  word: string;
  count: number;
}

interface TrendSource {
  source: string;
  count: number;
}

export default function Trends() {
  const [trends, setTrends] = useState<TrendWord[]>([]);
  const [sources, setSources] = useState<TrendSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendsRes, sourcesRes] = await Promise.all([
        fetch(`${API_BASE}/api/trends`),
        fetch(`${API_BASE}/api/trends/sources`),
      ]);

      if (!trendsRes.ok) throw new Error(`Error en trends: ${trendsRes.status}`);
      if (!sourcesRes.ok) throw new Error(`Error en sources: ${sourcesRes.status}`);

      const trendsData = await trendsRes.json();
      const sourcesData = await sourcesRes.json();

      setTrends(trendsData.trends ?? []);
      setSources(sourcesData.sources ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const maxCount = Math.max(...trends.map((t) => t.count), 1);
  const maxSourceCount = Math.max(...sources.map((s) => s.count), 1);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <TrendingUp size={14} />
            <span>Tendencias</span>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Palabras clave y fuentes</h2>
            <button
              onClick={fetchData}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Basado en titulares de las últimas 24 horas
          </p>
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
              <p className="font-medium">Error al cargar tendencias</p>
              <p className="text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Words */}
            <section>
              <h3 className="text-sm font-semibold text-foreground/80 mb-4 flex items-center gap-2">
                <TrendingUp size={14} />
                Palabras clave
              </h3>

              {trends.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos aún.</p>
              ) : (
                <div className="space-y-2">
                  {trends.map((t, i) => (
                    <div key={t.word} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm font-medium capitalize">{t.word}</span>
                          <span className="text-xs text-muted-foreground">{t.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${(t.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Sources */}
            <section>
              <h3 className="text-sm font-semibold text-foreground/80 mb-4 flex items-center gap-2">
                <Newspaper size={14} />
                Fuentes más activas
              </h3>

              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos aún.</p>
              ) : (
                <div className="space-y-2">
                  {sources.map((s, i) => (
                    <div key={s.source} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm font-medium">{s.source}</span>
                          <span className="text-xs text-muted-foreground">{s.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${(s.count / maxSourceCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
