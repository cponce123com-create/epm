import { useState, useRef } from "react";
import {
  Upload, FileArchive, CheckCircle, XCircle,
  AlertCircle, Loader2, RefreshCw, Info, Wifi
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useGetCategories } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface ArticleParsed {
  title: string;
  slug: string;
  summary: string;
  content: string;
  publishedAt: string | null;
  status: "published" | "draft";
  readingTime: number;
}

interface BatchResult {
  title: string;
  status: "imported" | "skipped";
  reason?: string;
}

const BATCH_SIZE = 8; // artículos por petición — seguro bajo timeout de Cloudflare
const DEFAULT_API_BASE = "https://epm-7gaq.onrender.com";
const CONFIGURED_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";
const API_BASES = Array.from(new Set([CONFIGURED_API_BASE, DEFAULT_API_BASE].filter(Boolean)));
const api = (path: string, base: string) => `${base}${path}`;

type FetchJsonResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function fetchJsonWithFallback<T>(path: string, init: RequestInit): Promise<FetchJsonResult<T>> {
  let lastError = "No se pudo conectar al API.";

  for (const base of API_BASES) {
    try {
      const res = await fetch(api(path, base), init);
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok) {
        const apiError = typeof data?.error === "string" ? data.error : `Error HTTP ${res.status}.`;
        return { ok: false, error: apiError };
      }

      // Si el servidor responde 200 pero sin JSON (ej. HTML/rewrite), intentamos el siguiente base.
      if (!raw || typeof data !== "object" || data === null) {
        lastError = `Respuesta no válida desde ${base}. Verifica VITE_API_BASE_URL.`;
        continue;
      }

      return { ok: true, data: data as T };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Error de red al llamar al API.";
    }
  }

  return { ok: false, error: lastError };
}

type Phase = "idle" | "waking" | "preparing" | "importing" | "done";

export default function MediumImport() {
  const { data: categories, isLoading: loadingCats } = useGetCategories();
  const { token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile]                   = useState<File | null>(null);
  const [categoryId, setCategoryId]       = useState<string>("");
  const [defaultStatus, setDefaultStatus] = useState<"published" | "draft">("draft");
  const [migrateImages, setMigrateImages] = useState(true);
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [phase, setPhase]                 = useState<Phase>("idle");
  const [progress, setProgress]           = useState({ current: 0, total: 0 });
  const [allResults, setAllResults]       = useState<BatchResult[]>([]);
  const [error, setError]                 = useState<string | null>(null);

  const loading = phase === "waking" || phase === "preparing" || phase === "importing";
  const done    = phase === "done";

  const totalImported = allResults.filter(r => r.status === "imported").length;
  const totalSkipped  = allResults.filter(r => r.status === "skipped").length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    resetState();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".zip")) {
      setFile(f);
      resetState();
    } else {
      toast({ description: "Solo se aceptan archivos .zip", variant: "destructive" });
    }
  };

  const resetState = () => {
    setError(null);
    setAllResults([]);
    setProgress({ current: 0, total: 0 });
    setPhase("idle");
  };

  const doImport = async () => {
    if (!file || (!categoryId && !autoCategorize)) return;

    resetState();

    // ── Paso 1: despertar servidor ──────────────────────────────────────────
    setPhase("waking");
    const alive = await waitForServer();
    if (!alive) {
      setError("El servidor no respondió tras 60 s. Verifica que epm-api esté activo en Render.");
      setPhase("idle");
      return;
    }

    // ── Paso 2: preparar (parsear ZIP en el servidor) ────────────────────────
    setPhase("preparing");
    let articles: ArticleParsed[];
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("categoryId", categoryId);
      formData.append("autoCategorize", String(autoCategorize));

      const prepare = await fetchJsonWithFallback<{ articles: ArticleParsed[] }>(
        "/api/admin/import-medium/prepare",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!prepare.ok) {
        setError(prepare.error);
        setPhase("idle");
        return;
      }

      articles = prepare.data.articles;

      if (!articles || articles.length === 0) {
        setError("No se encontraron artículos en el ZIP.");
        setPhase("idle");
        return;
      }

      setProgress({ current: 0, total: articles.length });
    } catch {
      setError("Error al enviar el archivo. Verifica tu conexión.");
      setPhase("idle");
      return;
    }

    // ── Paso 3: importar en lotes ────────────────────────────────────────────
    setPhase("importing");
    const accumulated: BatchResult[] = [];

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);

      try {
        const batchRes = await fetchJsonWithFallback<{ results: BatchResult[] }>(
          "/api/admin/import-medium/batch",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              articles: batch,
              categoryId: parseInt(categoryId, 10),
              defaultStatus,
              migrateImages,
              autoCategorize,
            }),
          }
        );

        if (!batchRes.ok) {
          // Marcar todo el lote como fallido pero continuar con el siguiente
          batch.forEach(a => accumulated.push({
            title: a.title,
            status: "skipped",
            reason: batchRes.error,
          }));
        } else {
          accumulated.push(...batchRes.data.results);
        }
      } catch {
        batch.forEach(a => accumulated.push({
          title: a.title,
          status: "skipped",
          reason: "Error de red al enviar el lote.",
        }));
      }

      setProgress({ current: Math.min(i + BATCH_SIZE, articles.length), total: articles.length });
      setAllResults([...accumulated]);
    }

    setPhase("done");
    const imp = accumulated.filter(r => r.status === "imported").length;
    toast({ description: `Importación completada: ${imp} artículos importados.` });
  };

  const purgeAllArticles = async () => {
    if (!confirm("¿Eliminar TODOS los artículos? Esta acción no se puede deshacer.")) return;
    try {
      const purge = await fetchJsonWithFallback<{ deleted?: number }>("/api/admin/articles/purge", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!purge.ok) throw new Error(purge.error);
      toast({ description: `Se eliminaron ${purge.data.deleted ?? 0} artículos.` });
      resetState();
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : "Error eliminando artículos.", variant: "destructive" });
    }
  };

  const phaseLabel = () => {
    if (phase === "waking")    return "Conectando con el servidor…";
    if (phase === "preparing") return "Leyendo el archivo ZIP…";
    if (phase === "importing") return `Importando… ${progress.current} / ${progress.total} artículos`;
    return "";
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Importar desde Medium</h1>
          <p className="mt-1 text-sm text-muted-foreground font-sans-ui">
            Sube el archivo .zip que descargaste desde tu cuenta de Medium para importar todos tus artículos.
          </p>
        </div>

        {/* Instrucciones */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 font-sans-ui">
          <p className="font-semibold flex items-center gap-1.5 mb-1">
            <Info size={14} /> ¿Cómo exportar desde Medium?
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Ve a <strong>medium.com</strong> → tu foto de perfil → <strong>Settings</strong></li>
            <li>Baja hasta <strong>Download your information</strong> y haz clic en <strong>Export</strong></li>
            <li>Medium te enviará un correo con el enlace al archivo .zip</li>
            <li>Descarga ese .zip y súbelo aquí</li>
          </ol>
        </div>

        <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 font-sans-ui flex gap-2">
          <Wifi size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>Nota:</strong> En el plan gratuito de Render, el servidor se duerme tras 15 min de inactividad.
            El sistema lo despertará automáticamente antes de importar.
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">

          {/* Zona de subida */}
          <div>
            <label className="block text-sm font-medium text-foreground font-sans-ui mb-2">
              Archivo .zip de Medium
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                loading ? "opacity-50 cursor-not-allowed border-border"
                        : "cursor-pointer hover:border-primary/60 hover:bg-muted/30 border-border"
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleFileChange} disabled={loading} />
              {file ? (
                <div className="flex items-center justify-center gap-3 text-foreground">
                  <FileArchive size={24} className="text-primary" />
                  <div className="text-left">
                    <p className="font-medium font-sans-ui text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground font-sans-ui">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  {!loading && (
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null); resetState(); }}
                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-sans-ui">Arrastra tu archivo .zip aquí o haz clic para buscarlo</p>
                </div>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-foreground font-sans-ui mb-2">Categoría</label>
            {loadingCats ? (
              <div className="text-sm text-muted-foreground font-sans-ui flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Cargando…
              </div>
            ) : (
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={loading || autoCategorize}
                className="w-full border border-border rounded-md px-3 py-2 text-sm font-sans-ui bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50">
                <option value="">Selecciona una categoría…</option>
                {(categories ?? []).map(cat => (
                  <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-muted-foreground font-sans-ui">
              {autoCategorize
                ? "Auto-categorización activada: este campo se ignora."
                : "Categoría por defecto para todos los artículos."}
            </p>
          </div>

          {/* Opciones avanzadas */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-sans-ui cursor-pointer">
              <input
                type="checkbox"
                checked={autoCategorize}
                onChange={(e) => setAutoCategorize(e.target.checked)}
                disabled={loading}
                className="accent-primary"
              />
              Clasificar categorías automáticamente (IA heurística por texto)
            </label>
            <label className="flex items-center gap-2 text-sm font-sans-ui cursor-pointer">
              <input
                type="checkbox"
                checked={migrateImages}
                onChange={(e) => setMigrateImages(e.target.checked)}
                disabled={loading}
                className="accent-primary"
              />
              Subir imágenes de Medium a Cloudinary durante la importación
            </label>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-foreground font-sans-ui mb-2">Estado de los artículos importados</label>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { value: "draft",     label: "Borrador (recomendado — revisar antes de publicar)" },
                { value: "published", label: "Publicado" },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm font-sans-ui cursor-pointer">
                  <input type="radio" name="status" value={opt.value}
                    checked={defaultStatus === opt.value}
                    onChange={() => setDefaultStatus(opt.value as "published" | "draft")}
                    disabled={loading} className="accent-primary" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Progreso */}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-800 font-sans-ui bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <Loader2 size={15} className="animate-spin shrink-0" />
                <span>{phaseLabel()}</span>
              </div>
              {phase === "importing" && progress.total > 0 && (
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 font-sans-ui">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                {error}
                <button onClick={doImport}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 underline underline-offset-2">
                  <RefreshCw size={12} /> Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Botón */}
          <button onClick={doImport} disabled={loading || !file || (!categoryId && !autoCategorize)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium font-sans-ui hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
            {loading ? (
              <><Loader2 size={16} className="animate-spin" />{phase === "waking" ? "Conectando…" : phase === "preparing" ? "Procesando ZIP…" : `Importando lote ${Math.ceil(progress.current / BATCH_SIZE)} / ${Math.ceil(progress.total / BATCH_SIZE)}…`}</>
            ) : (
              <><Upload size={16} />Importar artículos</>
            )}
          </button>

          <button
            type="button"
            onClick={purgeAllArticles}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-700 rounded-lg text-sm font-medium font-sans-ui hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle size={16} /> Borrar TODOS los artículos
          </button>
        </div>

        {/* Resultados */}
        {(done || allResults.length > 0) && (
          <div className="mt-6 bg-card border border-border rounded-xl p-6 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-4">
              {totalImported > 0 && (
                <div className="flex items-center gap-2 text-green-700 font-sans-ui text-sm font-semibold">
                  <CheckCircle size={18} />{totalImported} importados
                </div>
              )}
              {totalSkipped > 0 && (
                <div className="flex items-center gap-2 text-yellow-700 font-sans-ui text-sm font-semibold">
                  <XCircle size={18} />{totalSkipped} omitidos
                </div>
              )}
              {loading && (
                <span className="text-xs text-muted-foreground font-sans-ui ml-auto">En progreso…</span>
              )}
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {allResults.map((r, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-md text-sm font-sans-ui ${
                  r.status === "imported" ? "bg-green-50 text-green-800" : "bg-yellow-50 text-yellow-800"
                }`}>
                  {r.status === "imported"
                    ? <CheckCircle size={13} className="mt-0.5 shrink-0" />
                    : <XCircle    size={13} className="mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-medium leading-snug">{r.title}</p>
                    {r.reason && <p className="text-xs opacity-70 mt-0.5">{r.reason}</p>}
                  </div>
                </div>
              ))}
            </div>

            {done && defaultStatus === "draft" && totalImported > 0 && (
              <p className="mt-4 text-xs text-muted-foreground font-sans-ui">
                Los artículos se importaron como borradores. Ve a{" "}
                <a href="/admin/articles" className="underline text-primary">Artículos</a>{" "}
                para revisarlos y publicarlos.
              </p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/** Espera que /api/health responda OK, máximo 60 s */
async function waitForServer(maxWaitMs = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const health = await fetchJsonWithFallback<{ ok?: boolean }>("/api/health", { method: "GET" });
      if (health.ok) return true;
    } catch { /* dormido */ }
    await new Promise(r => setTimeout(r, 3000));
  }
  return false;
}
