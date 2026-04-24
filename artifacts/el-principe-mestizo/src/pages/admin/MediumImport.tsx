import { useState, useRef } from "react";
import { Upload, FileArchive, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Info, Wifi } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useGetCategories } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  title: string;
  status: "imported" | "skipped";
  reason?: string;
}

interface ImportResponse {
  ok: boolean;
  imported: number;
  skipped: number;
  results: ImportResult[];
}

/** Espera que el servidor esté disponible haciendo ping al health endpoint */
async function waitForServer(maxWaitMs = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch("/api/health", { method: "GET" });
      if (res.ok) return true;
    } catch {
      // servidor dormido, seguir esperando
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  return false;
}

type Phase = "idle" | "waking" | "uploading" | "done";

export default function MediumImport() {
  const { data: categories, isLoading: loadingCats } = useGetCategories();
  const { token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile]                   = useState<File | null>(null);
  const [categoryId, setCategoryId]       = useState<string>("");
  const [defaultStatus, setDefaultStatus] = useState<"published" | "draft">("draft");
  const [phase, setPhase]                 = useState<Phase>("idle");
  const [response, setResponse]           = useState<ImportResponse | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  const loading = phase === "waking" || phase === "uploading";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResponse(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".zip")) {
      setFile(f);
      setResponse(null);
      setError(null);
    } else {
      toast({ description: "Solo se aceptan archivos .zip", variant: "destructive" });
    }
  };

  const doImport = async () => {
    if (!file) {
      toast({ description: "Selecciona el archivo .zip de Medium.", variant: "destructive" });
      return;
    }
    if (!categoryId) {
      toast({ description: "Selecciona una categoría para los artículos importados.", variant: "destructive" });
      return;
    }

    setError(null);
    setResponse(null);

    // Paso 1: despertar el servidor
    setPhase("waking");
    const alive = await waitForServer(60_000);
    if (!alive) {
      setError("El servidor no respondió después de 60 segundos. Revisa que el servicio epm-api esté activo en Render y vuelve a intentarlo.");
      setPhase("idle");
      return;
    }

    // Paso 2: subir el archivo
    setPhase("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("categoryId", categoryId);
      formData.append("defaultStatus", defaultStatus);

      const res = await fetch("/api/admin/import-medium", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error desconocido al importar.");
      } else {
        setResponse(data as ImportResponse);
        toast({ description: `Importación completada: ${data.imported} artículos importados.` });
      }
    } catch (err) {
      setError(
        "Error al subir el archivo. Verifica tu conexión e intenta de nuevo."
      );
    } finally {
      setPhase("done");
    }
  };

  const phaseLabel = () => {
    if (phase === "waking")   return "Despertando el servidor… (puede tardar hasta 60 s)";
    if (phase === "uploading") return "Importando artículos…";
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
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 font-sans-ui space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <Info size={14} />
            ¿Cómo exportar desde Medium?
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Ve a <strong>medium.com</strong> → tu foto de perfil → <strong>Settings</strong></li>
            <li>Baja hasta <strong>Download your information</strong> y haz clic en <strong>Export</strong></li>
            <li>Medium te enviará un correo con el enlace al archivo .zip</li>
            <li>Descarga ese .zip y súbelo aquí</li>
          </ol>
        </div>

        {/* Aviso servidor dormido */}
        <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 font-sans-ui flex gap-2">
          <Wifi size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>Nota:</strong> En el plan gratuito de Render, el servidor se duerme tras 15 min de inactividad.
            Al importar, el sistema lo despertará automáticamente antes de subir el archivo.
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
                      onClick={e => {
                        e.stopPropagation();
                        setFile(null);
                        setError(null);
                        setResponse(null);
                        setPhase("idle");
                      }}
                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                      title="Quitar archivo"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-sans-ui">Arrastra tu archivo .zip aquí o haz clic para buscarlo</p>
                  <p className="text-xs mt-1 opacity-60 font-sans-ui">Solo archivos .zip exportados de Medium</p>
                </div>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-foreground font-sans-ui mb-2">
              Categoría para los artículos importados
            </label>
            {loadingCats ? (
              <div className="text-sm text-muted-foreground font-sans-ui flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Cargando categorías…
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                disabled={loading}
                className="w-full border border-border rounded-md px-3 py-2 text-sm font-sans-ui bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                <option value="">Selecciona una categoría…</option>
                {(categories ?? []).map(cat => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Estado por defecto */}
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

          {/* Indicador de fase */}
          {loading && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 font-sans-ui">
              <Loader2 size={16} className="animate-spin shrink-0" />
              <span>{phaseLabel()}</span>
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
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 underline underline-offset-2"
                >
                  <RefreshCw size={12} /> Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Botón */}
          <button
            onClick={doImport}
            disabled={loading || !file || !categoryId}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium font-sans-ui hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {phase === "waking" ? "Conectando con el servidor…" : "Importando artículos…"}
              </>
            ) : (
              <>
                <Upload size={16} />
                Importar artículos
              </>
            )}
          </button>
        </div>

        {/* Resultados */}
        {response && (
          <div className="mt-6 bg-card border border-border rounded-xl p-6 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center gap-2 text-green-700 font-sans-ui text-sm font-semibold">
                <CheckCircle size={18} />
                {response.imported} importados
              </div>
              {response.skipped > 0 && (
                <div className="flex items-center gap-2 text-yellow-700 font-sans-ui text-sm font-semibold">
                  <XCircle size={18} />
                  {response.skipped} omitidos
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {response.results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-3 py-2 rounded-md text-sm font-sans-ui ${
                    r.status === "imported"
                      ? "bg-green-50 text-green-800"
                      : "bg-yellow-50 text-yellow-800"
                  }`}
                >
                  {r.status === "imported"
                    ? <CheckCircle size={14} className="mt-0.5 shrink-0" />
                    : <XCircle    size={14} className="mt-0.5 shrink-0" />
                  }
                  <div>
                    <p className="font-medium">{r.title}</p>
                    {r.reason && <p className="text-xs opacity-70 mt-0.5">{r.reason}</p>}
                  </div>
                </div>
              ))}
            </div>

            {defaultStatus === "draft" && response.imported > 0 && (
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
