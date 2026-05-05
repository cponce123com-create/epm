import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  PlusCircle, Pencil, Trash2, Globe, EyeOff, Search, Flag,
  Rss, FileText, Loader2, ExternalLink, CheckCircle2, X,
  Image as ImageIcon, Upload, Video, Plus, ChevronDown,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  useAdminGetArticles, useAdminDeleteArticle, useAdminPublishArticle,
  useGetCategories,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ── Tipos del scraper ──────────────────────────────────────────────────────
interface ScrapedItem {
  title: string;
  summary: string;
  content: string;
  coverImageUrl: string | null;
  coverVideoUrl: string | null;
  sourceUrl: string;
  publishedAt: string;
}

type TabId = "articles" | "scraper" | "write";

// ── Componente principal ───────────────────────────────────────────────────
export default function Nacional() {
  const [activeTab, setActiveTab] = useState<TabId>("articles");

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        {/* Encabezado con tabs */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="p-2 rounded-md bg-blue-100">
            <Flag size={18} className="text-blue-700" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">Nacional</h1>
            <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
              Noticias de cobertura nacional
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border pb-3">
          {([
            { id: "articles" as TabId, label: "Artículos", icon: <FileText size={14} /> },
            { id: "scraper" as TabId, label: "Scraper Telegram", icon: <Rss size={14} /> },
            { id: "write" as TabId, label: "Redactar", icon: <Pencil size={14} /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans-ui font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "articles" && <TabArticles />}
        {activeTab === "scraper" && <TabScraper />}
        {activeTab === "write" && <TabWrite />}
      </div>
    </AdminLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — Artículos (versión existente, sin cambios funcionales)
// ═══════════════════════════════════════════════════════════════════════════
function TabArticles() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"published" | "draft" | undefined>(undefined);

  const { data: allArticles, isLoading } = useAdminGetArticles({ status: statusFilter });
  const { data: categories } = useGetCategories();
  const deleteArticle = useAdminDeleteArticle();
  const publishArticle = useAdminPublishArticle();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });

  const nacionalCat = useMemo(() => {
    if (!categories) return null;
    return categories.find(
      c => c.slug === "nacional" || c.name.toLowerCase() === "nacional"
    ) ?? null;
  }, [categories]);

  const articles = useMemo(() => {
    if (!allArticles) return [];
    let list = allArticles.filter(a => {
      const inPrimary = a.category?.name?.toLowerCase() === "nacional" ||
        a.category?.slug === "nacional";
      const inSecondary = (a as any).secondaryCategory?.name?.toLowerCase() === "nacional" ||
        (a as any).secondaryCategory?.slug === "nacional";
      return inPrimary || inSecondary;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [allArticles, search]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteArticle.mutateAsync({ id });
      invalidate();
      toast({ description: "Artículo eliminado." });
    } catch {
      toast({ description: "Error al eliminar el artículo.", variant: "destructive" });
    }
  };

  const handlePublishToggle = async (id: number, published: boolean) => {
    try {
      await publishArticle.mutateAsync({ id });
      invalidate();
      toast({ description: published ? "Artículo despublicado." : "Artículo publicado." });
    } catch {
      toast({ description: "Error al cambiar el estado.", variant: "destructive" });
    }
  };

  const published = articles.filter(a => a.status === "published").length;
  const drafts    = articles.filter(a => a.status === "draft").length;

  const newArticleHref = nacionalCat
    ? `/admin/articles/new?categoryId=${nacionalCat.id}`
    : "/admin/articles/new";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link
          href={newArticleHref}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
        >
          <PlusCircle size={16} />
          Nuevo artículo
        </Link>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total",       value: articles.length,                        color: "text-foreground" },
          { label: "Publicados",  value: published,                              color: "text-green-700" },
          { label: "Borradores",  value: drafts,                                 color: "text-yellow-700" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-card-border rounded-lg px-4 py-3">
            <p className="text-xs font-sans-ui text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {!isLoading && !nacionalCat && (
        <div className="mb-5 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <Flag size={16} className="text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-sm font-sans-ui text-yellow-800">
            La categoría <strong>Nacional</strong> aún no existe.{" "}
            <Link href="/admin/categories" className="underline hover:text-yellow-900">
              Créala desde Categorías
            </Link>.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          {[
            { label: "Todos",        value: undefined },
            { label: "Publicados",   value: "published" as const },
            { label: "Borradores",   value: "draft"    as const },
          ].map(f => (
            <button
              key={String(f.value)}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-sans-ui font-medium rounded-md border transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="text-sm font-sans-ui text-muted-foreground">Cargando...</div>
          </div>
        ) : !articles.length ? (
          <div className="p-10 text-center">
            <Flag size={28} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-sans-ui text-sm text-muted-foreground">
              {search ? `Sin resultados para "${search}"` : "No hay artículos en Nacional todavía."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Título</th>
                <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Publicación</th>
                <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Vistas</th>
                <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => {
                const pubDate = article.publishedAt ? new Date(article.publishedAt) : null;
                return (
                  <tr key={article.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-sans-ui text-sm font-medium line-clamp-1">{article.title}</div>
                      {article.featured && <span className="text-xs text-yellow-600 font-sans-ui">★ Destacado</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground font-sans-ui">
                      {pubDate ? format(pubDate, "d MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground font-sans-ui">
                      {(article.views ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-sans-ui font-medium px-2 py-0.5 rounded ${
                        article.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {article.status === "published" ? "Publicado" : "Borrador"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePublishToggle(article.id, article.status === "published")}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title={article.status === "published" ? "Despublicar" : "Publicar"}
                        >
                          {article.status === "published" ? <EyeOff size={15} /> : <Globe size={15} />}
                        </button>
                        <Link href={`/admin/articles/${article.id}/edit`} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Editar">
                          <Pencil size={15} />
                        </Link>
                        <button onClick={() => handleDelete(article.id, article.title)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — Scraper Telegram (multicanal hasta 10, soporte video)
// ═══════════════════════════════════════════════════════════════════════════
const MAX_CHANNELS = 10;

function TabScraper() {
  // Lista de canales persistida en localStorage
  const [channels, setChannels] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("epm_scraper_channels") ?? "[]");
      return Array.isArray(saved) ? saved.filter((c: unknown) => typeof c === "string" && c.trim()) : [];
    } catch {
      return [];
    }
  });
  const [activeChannel, setActiveChannel] = useState<string>(channels[0] ?? "");
  const [newChannel, setNewChannel] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [items, setItems] = useState<(ScrapedItem & { editedTitle?: string; editedSummary?: string; imported?: boolean })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importingId, setImportingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Persistir canales
  useEffect(() => {
    localStorage.setItem("epm_scraper_channels", JSON.stringify(channels));
  }, [channels]);

  // Si no hay canal activo pero hay canales, usar el primero
  useEffect(() => {
    if (!activeChannel && channels.length > 0) {
      setActiveChannel(channels[0]);
    }
  }, [channels, activeChannel]);

  const addChannel = () => {
    const name = newChannel.trim().replace(/^@/, "");
    if (!name) return;
    if (channels.includes(name)) {
      toast({ description: "Ese canal ya está en la lista.", variant: "destructive" });
      return;
    }
    if (channels.length >= MAX_CHANNELS) {
      toast({ description: `Máximo ${MAX_CHANNELS} canales.`, variant: "destructive" });
      return;
    }
    const updated = [...channels, name];
    setChannels(updated);
    setActiveChannel(name);
    setNewChannel("");
    setShowAdd(false);
  };

  const removeChannel = (name: string) => {
    const updated = channels.filter(c => c !== name);
    setChannels(updated);
    if (activeChannel === name) {
      setActiveChannel(updated[0] ?? "");
    }
  };

  const handleScrape = async (channel?: string) => {
    const target = channel ?? activeChannel;
    if (!target.trim()) return;
    setLoading(true);
    setError("");
    setItems([]);
    setActiveChannel(target);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/nacional/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelUsername: target.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const data = await res.json();
      const scrapedItems = (data.items ?? []).map((item: ScrapedItem) => ({
        ...item,
        editedTitle: item.title,
        editedSummary: item.summary,
      }));
      setItems(scrapedItems);

      if (scrapedItems.length === 0) {
        setError(`No se encontraron noticias en @${target}.`);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("El servidor está despertando, intenta de nuevo en 30 segundos.");
      } else {
        setError(err?.message ?? "Error al extraer noticias.");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleImport = async (index: number) => {
    const item = items[index];
    if (!item || item.imported) return;

    setImportingId(index);
    try {
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/nacional/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          item: {
            title: item.editedTitle ?? item.title,
            summary: item.editedSummary ?? item.summary,
            content: item.content,
            coverImageUrl: item.coverImageUrl,
            coverVideoUrl: item.coverVideoUrl,
            sourceUrl: item.sourceUrl,
            publishedAt: item.publishedAt,
          },
          channelUsername: activeChannel.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al importar");
      }

      const updated = [...items];
      updated[index] = { ...updated[index], imported: true };
      setItems(updated);

      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      toast({ description: "✓ Importado — revísalo en Artículos" });
    } catch (err: any) {
      toast({ description: err?.message ?? "Error al importar", variant: "destructive" });
    } finally {
      setImportingId(null);
    }
  };

  const handleDiscard = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* ── Lista de canales ──────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">
            Canales ({channels.length}/{MAX_CHANNELS})
          </span>
          {channels.length < MAX_CHANNELS && (
            <button
              onClick={() => { setShowAdd(!showAdd); setNewChannel(""); }}
              className="flex items-center gap-1 text-xs font-sans-ui text-primary hover:underline"
            >
              <Plus size={12} />
              Agregar
            </button>
          )}
        </div>

        {/* Lista de chips */}
        {channels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {channels.map(ch => (
              <span
                key={ch}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans-ui font-medium cursor-pointer transition-colors ${
                  activeChannel === ch
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
                onClick={() => { setActiveChannel(ch); }}
              >
                @{ch}
                <button
                  onClick={e => { e.stopPropagation(); removeChannel(ch); }}
                  className="hover:opacity-70"
                  title="Quitar canal"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input para agregar */}
        {showAdd && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newChannel}
              onChange={e => setNewChannel(e.target.value)}
              placeholder="Username del canal (sin @)"
              className="flex-1 px-3 py-1.5 text-xs font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => e.key === "Enter" && addChannel()}
            />
            <button
              onClick={addChannel}
              disabled={!newChannel.trim()}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-sans-ui font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        )}
      </div>

      {/* ── Botón de extracción ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {channels.length > 1 && (
          <div className="relative">
            <select
              value={activeChannel}
              onChange={e => handleScrape(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {channels.map(ch => (
                <option key={ch} value={ch}>@{ch}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
        )}
        <button
          onClick={() => handleScrape()}
          disabled={loading || !activeChannel.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Rss size={16} />}
          {loading ? `Extrayendo de @${activeChannel}...` : "Extraer noticias"}
        </button>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm font-sans-ui text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="text-xs text-muted-foreground font-sans-ui mb-3">
            {items.length} noticias encontradas en @{activeChannel}
          </div>
          <div className="grid gap-4">
            {items.map((item, i) => (
              <div
                key={i}
                className={`border rounded-lg p-4 transition-colors ${
                  item.imported
                    ? "bg-green-50 border-green-200"
                    : "bg-card border-card-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Thumbnail: imagen o video */}
                  <div className="w-full sm:w-48 shrink-0 relative">
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt=""
                        className="w-full aspect-video object-cover rounded-md bg-muted"
                        onError={e => ((e.target as HTMLElement).style.display = "none")}
                      />
                    ) : (
                      <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center">
                        <ImageIcon size={24} className="text-muted-foreground/40" />
                      </div>
                    )}
                    {item.coverVideoUrl && (
                      <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-sans-ui font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Video size={10} /> VIDEO
                      </div>
                    )}
                  </div>

                  {/* Contenido editable */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      value={item.editedTitle ?? item.title}
                      onChange={e => {
                        const updated = [...items];
                        updated[i] = { ...updated[i], editedTitle: e.target.value };
                        setItems(updated);
                      }}
                      disabled={item.imported}
                      className="w-full text-sm font-sans-ui font-semibold border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                    />
                    <textarea
                      value={item.editedSummary ?? item.summary}
                      onChange={e => {
                        const updated = [...items];
                        updated[i] = { ...updated[i], editedSummary: e.target.value };
                        setItems(updated);
                      }}
                      disabled={item.imported}
                      rows={2}
                      className="w-full text-xs font-sans-ui border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-60"
                    />
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-sans-ui">
                      <span>
                        {format(new Date(item.publishedAt), "d MMM yyyy HH:mm", { locale: es })}
                      </span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <ExternalLink size={11} />
                        Fuente
                      </a>
                    </div>

                    {/* Botones */}
                    <div className="flex items-center gap-2 pt-1">
                      {!item.imported ? (
                        <>
                          <button
                            onClick={() => handleImport(i)}
                            disabled={importingId === i}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-sans-ui font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {importingId === i ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Importar como borrador
                          </button>
                          <button
                            onClick={() => handleDiscard(i)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans-ui font-medium rounded-md border border-border hover:bg-muted transition-colors"
                          >
                            <X size={12} />
                            Descartar
                          </button>
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-sans-ui font-medium text-green-700">
                          <CheckCircle2 size={14} />
                          ✓ Importado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — Redactar (formulario inline rápido)
// ═══════════════════════════════════════════════════════════════════════════
function TabWrite() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: categories } = useGetCategories();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useState<HTMLInputElement | null>(null);

  const nacionalCat = useMemo(() => {
    if (!categories) return null;
    return categories.find(
      c => c.slug === "nacional" || c.name.toLowerCase() === "nacional"
    ) ?? null;
  }, [categories]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al subir");
      const data = await res.json();
      setCoverImageUrl(data.url);
      toast({ description: "Imagen subida correctamente." });
    } catch (err: any) {
      toast({ description: err?.message ?? "Error al subir", variant: "destructive" });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ description: "El título es obligatorio.", variant: "destructive" });
      return;
    }
    if (!nacionalCat) {
      toast({ description: "No existe la categoría 'nacional'. Créala primero.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          categoryId: nacionalCat.id,
          coverImageUrl: coverImageUrl || undefined,
          status: publishNow ? "published" : "draft",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }

      // Limpiar
      setTitle("");
      setSummary("");
      setContent("");
      setCoverImageUrl("");
      setPublishNow(false);

      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      toast({ description: publishNow ? "Artículo publicado." : "Borrador guardado." });
    } catch (err: any) {
      toast({ description: err?.message ?? "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!nacionalCat) {
    return (
      <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
        <Flag size={16} className="text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-sm font-sans-ui text-yellow-800">
          La categoría <strong>Nacional</strong> aún no existe.{" "}
          <Link href="/admin/categories" className="underline hover:text-yellow-900">
            Créala desde Categorías
          </Link>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-card border border-card-border rounded-lg p-6 space-y-5 max-w-2xl">
      <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
        Redactar noticia nacional
      </h2>

      <div className="space-y-1.5">
        <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">
          Título *
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título de la noticia"
          required
          className="w-full px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">
          Resumen / Bajada ({summary.length}/300)
        </label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value.slice(0, 300))}
          placeholder="Resumen breve de la noticia..."
          rows={3}
          maxLength={300}
          className="w-full px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">
          Cuerpo
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Contenido HTML de la noticia..."
          rows={10}
          className="w-full px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">
          Imagen de portada
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={coverImageUrl}
            onChange={e => setCoverImageUrl(e.target.value)}
            placeholder="https://... o sube una imagen →"
            className="flex-1 px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-1.5 px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-muted hover:bg-accent transition-colors cursor-pointer whitespace-nowrap">
            <Upload size={13} />
            {uploading ? "Subiendo…" : "Subir"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        {coverImageUrl && (
          <img
            src={coverImageUrl}
            alt="Preview"
            className="h-20 rounded-md object-cover mt-2"
            onError={e => ((e.target as HTMLElement).style.display = "none")}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-sans-ui cursor-pointer">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={e => setPublishNow(e.target.checked)}
            className="rounded"
          />
          Publicar ahora
        </label>
        <span className="text-xs text-muted-foreground font-sans-ui">
          {publishNow ? "El artículo será visible inmediatamente." : "Quedará como borrador."}
        </span>
      </div>

      <div className="flex items-center justify-end pt-2 border-t border-border">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
