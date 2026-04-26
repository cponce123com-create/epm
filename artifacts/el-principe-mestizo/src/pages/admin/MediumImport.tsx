import { useState, useRef } from "react";
import {
  Upload, FileArchive, CheckCircle, XCircle,
  AlertCircle, Loader2, RefreshCw, Info, Wifi, Sparkles, Image
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useGetCategories } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

// En producción apunta al backend directamente para evitar limitaciones del proxy CDN.
// En desarrollo (sin VITE_API_URL) usa rutas relativas que el proxy de Vite maneja.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface ArticleParsed {
  title:       string;
  slug:        string;
  summary:     string;
  content:     string;
  publishedAt: string | null;
  status:      "published" | "draft";
  readingTime: number;
}

interface BatchResult {
  title:   string;
  status:  "imported" | "skipped";
  reason?: string;
}

const BATCH_SIZE = 5;

type Phase = "idle" | "waking" | "preparing" | "importing" | "done";

export default function MediumImport() {
  const { data: categories, isLoading: loadingCats } = useGetCategories();
  const { token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile]                       = useState<File | null>(null);
  const [categoryId, setCategoryId]           = useState<string>("");
  const [defaultStatus, setDefaultStatus]     = useState<"published" | "draft">("draft");
  const [autoCategorize, setAutoCategorize]   = useState(true);
  const [uploadImages, setUploadImages]       = useState(false);
  const [phase, setPhase]                     = useState<Phase>("idle");
  const [progress, setProgress]               = useState({ current: 0, total: 0 });
  const [allResults, setAllResults]           = useState<BatchResult[]>([]);
  const [error, setError]                     = useState<string | null>(null);

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

  const canImport = !!file && (autoCategorize || !!categoryId);

  const doImport = async () => {
    if (!canImport) return;

    resetState();

    // ── Paso 1: despertar servidor ──────────────────────────────────────────
    setPhase("waking");
    const alive = await waitForServer(API_BASE);
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
      formData.append("file", file!);
      formData.append("categoryId", categoryId);
      formData.append("autoCategorize", String(autoCategorize));

      const res = await fetch(`${API_BASE}/api/admin/import-medium/prepare`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? `Error al preparar el ZIP (HTTP ${res.status}).`);
        setPhase("idle");
        return;
      }

      const data = await res.json() as { articles: ArticleParsed[] };
      articles = data.articles;

      if (!articles || articles.length === 0) {
        setError("No se encontraron artículos en el ZIP.");
        setPhase("idle");
        return;
      }

      setProgress({ current: 0, total: articles.length });
    } catch (err) {
      const msg = err instanceof TypeError
        ? "Error de red al enviar el archivo. Verifica tu conexión y que el servidor esté activo."
        : `Error inesperado: ${String(err)}`;
      setError(msg);
      setPhase("idle");
      return;
    }

    // ── Paso 3: importar en lotes ────────────────────────────────────────────
    setPhase("importing");
    const accumulated: BatchResult[] = [];

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);

      try {
        const res = await fetch(`${API_BASE}/api/admin/import-medium/batch`, {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${token}`,
          },
          body: JSON.stringify({
            articles:      batch,
            categoryId:    parseInt(categoryId, 10) || 0,
            defaultStatus,
            autoCategorize,
            uploadImages,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string };
          batch.forEach(a => accumulated.push({
            title:  a.title,
            status: "skipped",
            reason: data.error ?? `Error HTTP ${res.status}`,
          }));
        } else {
          const data = await res.json() as { results: BatchResult[] };
          accumulated.push(...data.results);
        }
      } catch {
        batch.forEach(a => accumulated.push({
          title:  a.title,
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
                loading
                  ? "opacity-50 cursor-not-allowed border-border"
                  : "cursor-pointer hover:border-primary/60 hover:bg-muted/30 border-border"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileChange}
                disabled={loading}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3 text-foreground">
                  <FileArchive size={24} className="text-primary" />
                  <div className="text-left">
                    <p className="font-medium font-sans-ui text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground font-sans-ui">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  {!loading && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setFile(null); resetState(); }}
                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                    >
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
              <>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  disabled={loading || autoCategorize}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm font-sans-ui bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">Selecciona una categoría…</option>
                  {(categories ?? []).map(cat => (
                    <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                  ))}
                </select>
                {autoCategorize && (
                  <p className="mt-1 text-xs text-muted-foreground font-sans-ui">
                    Auto-categorización activada: este campo se ignora.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Opciones */}
          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={autoCategorize}
                onChange={e => setAutoCategorize(e.target.checked)}
                disabled={loading}
                className="mt-0.5 accent-primary"
              />
              <div>
                <span className="flex items-center gap-1.5 text-sm font-sans-ui font-medium text-foreground group-hover:text-primary transition-colors">
                  <Sparkles size={13} className="text-primary" />
                  Clasificar categorías automáticamente (IA heurística por texto)
                </span>
                <p className="text-xs text-muted-foreground font-sans-ui mt-0.5">
                  Asigna la categoría más apropiada según el contenido de cada artículo.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={uploadImages}
                onChange={e => setUploadImages(e.target.checked)}
                disabled={loading}
                className="mt-0.5 accent-primary"
              />
              <div>
                <span className="flex items-center gap-1.5 text-sm font-sans-ui font-medium text-foreground group-hover:text-primary transition-colors">
                  <Image size={13} className="text-primary" />
                  Subir imágenes de Medium a Cloudinary durante la importación
                </span>
                <p className="text-xs text-muted-foreground font-sans-ui mt-0.5">
                  Más lento pero garantiza que las portadas se muestren correctamente.
                  Requiere Cloudinary configurado en el servidor.
                </p>
              </div>
            </label>
          </div>

          {/* Estado publicación */}
          <div>
            <label className="block text-sm font-medium text-foreground font-sans-ui mb-2">
              Estado de los artículos importados
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { value: "draft",     label: "Borrador (recomendado — revisar antes de publicar)" },
                { value: "published", label: "Publicado" },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm font-sans-ui cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={defaultStatus === opt.value}
                    onChange={() => setDefaultStatus(opt.value as "published" | "draft")}
                    disabled={loading}
                    className="accent-primary"
                  />
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
                <button
                  onClick={doImport}
                  disabled={!canImport}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 underline underline-offset-2 disabled:opacity-40"
                >
                  <RefreshCw size={12} /> Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Botón */}
          <button
            onClick={doImport}
            disabled={loading || !canImport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium font-sans-ui hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {phase === "waking"
                  ? "Conectando…"
                  : phase === "preparing"
                  ? "Procesando ZIP…"
                  : `Importando lote ${Math.ceil(progress.current / BATCH_SIZE)} / ${Math.ceil(progress.total / BATCH_SIZE)}…`}
              </>
            ) : (
              <><Upload size={16} />Importar artículos</>
            )}
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
                <div
                  key={i}
                  className={`flex items-start gap-2 px-3 py-2 rounded-md text-sm font-sans-ui ${
                    r.status === "imported" ? "bg-green-50 text-green-800" : "bg-yellow-50 text-yellow-800"
                  }`}
                >
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

/** Espera que el backend responda OK, máximo 60 s */
async function waitForServer(apiBase: string, maxWaitMs = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${apiBase}/api/health`);
      if (res.ok) return true;
    } catch { /* servidor dormido */ }
    await new Promise(r => setTimeout(r, 3000));
  }
  return false;
}
