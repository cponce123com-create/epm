import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusCircle, Pencil, Trash2, Globe, EyeOff, Search, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, FileDown, Loader2, Copy, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGetArticles, useAdminDeleteArticle, useAdminPublishArticle, useGetCategories } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
type SortField = "publishedAt" | "createdAt" | "views";
type SortDir = "asc" | "desc";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("epm-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.token ?? null;
    }
  } catch { /* */ }
  return null;
}

export default function ArticleList() {
  const [statusFilter, setStatusFilter] = useState<"published" | "draft" | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>("publishedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const { data: articles, isLoading } = useAdminGetArticles({ status: statusFilter });
  const { data: categories } = useGetCategories();
  const deleteArticle = useAdminDeleteArticle();
  const publishArticle = useAdminPublishArticle();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });

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

  const handleDuplicate = async (id: number) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/admin/articles/${id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast({ description: "Artículo duplicado como borrador." });
      invalidate();
    } catch {
      toast({ description: "Error al duplicar.", variant: "destructive" });
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    if (!articles) return [];
    let list = [...articles];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.category?.name?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      list = list.filter(a => a.categoryId === categoryFilter || (a as any).secondaryCategoryId === categoryFilter);
    }

    list.sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortField === "views") {
        aVal = a.views ?? 0;
        bVal = b.views ?? 0;
      } else if (sortField === "publishedAt") {
        aVal = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        bVal = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      } else {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });

    return list;
  }, [articles, search, sortField, sortDir, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const allIds = useMemo(() => paginated.map(a => a.id), [paginated]);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkStatus = async (newStatus: "draft" | "published") => {
    if (selectedIds.size === 0) return;
    const label = newStatus === "draft" ? "borradores" : "publicados";
    if (!confirm(`¿Cambiar ${selectedIds.size} artículo(s) a "${label}"?`)) return;
    setBulkLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/admin/articles/bulk-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      const data = await res.json();
      toast({ description: data.message });
      setSelectedIds(new Set());
      invalidate();
    } catch (err: any) {
      toast({ description: err?.message ?? "Error al actualizar artículos", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortDir === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />;
  };

  const siteUrl = import.meta.env.VITE_SITE_URL ?? window.location.origin;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Artículos</h1>
            <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
              {filtered.length} artículo{filtered.length !== 1 ? "s" : ""}
              {page > 1 && ` — Página ${page}`}
            </p>
          </div>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            <PlusCircle size={16} />
            Nuevo artículo
          </Link>
        </div>

        {/* Búsqueda + Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por título o categoría..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Todos", value: undefined },
              { label: "Publicados", value: "published" as const },
              { label: "Borradores", value: "draft" as const },
            ].map(f => (
              <button
                key={String(f.value)}
                onClick={() => { setStatusFilter(f.value); setSelectedIds(new Set()); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-sans-ui font-medium rounded-md border transition-colors ${
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
            <select
              value={categoryFilter ?? ""}
              onChange={e => { setCategoryFilter(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
              className="px-3 py-1.5 text-xs font-sans-ui border border-border rounded-md bg-background"
            >
              <option value="">Todas las categorías</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de acciones masivas */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-muted/60 border border-border rounded-lg">
            <CheckSquare size={16} className="text-primary" />
            <span className="text-sm font-sans-ui font-medium">
              {selectedIds.size} artículo{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => handleBulkStatus("draft")}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans-ui font-medium bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Pasar a borradores
              </button>
              <button
                onClick={() => handleBulkStatus("published")}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans-ui font-medium bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                Publicar
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs font-sans-ui text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="text-sm font-sans-ui text-muted-foreground">Cargando...</div>
            </div>
          ) : !paginated.length ? (
            <div className="p-8 text-center">
              <p className="font-sans-ui text-sm text-muted-foreground">
                {search ? `Sin resultados para "${search}"` : "No hay artículos."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-3 py-3">
                    <button onClick={toggleAll} className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title={allSelected ? "Deseleccionar todos" : "Seleccionar todos"}>
                      {allSelected ? <CheckSquare size={15} /> : someSelected ? <Square size={15} className="opacity-50" /> : <Square size={15} />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Título</th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Categoría</th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("publishedAt")}>
                    <span className="flex items-center gap-1">Publicación <SortIcon field="publishedAt" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("views")}>
                    <span className="flex items-center gap-1">Vistas <SortIcon field="views" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(article => {
                  const pubDate = article.publishedAt ? new Date(article.publishedAt) : null;
                  const isSelected = selectedIds.has(article.id);
                  return (
                    <tr key={article.id} className={`border-b border-border last:border-0 transition-colors ${
                      isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"
                    }`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleOne(article.id)} className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                          {isSelected ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-sans-ui text-sm font-medium line-clamp-1">{article.title}</div>
                        {article.featured && <span className="text-xs text-yellow-600 font-sans-ui">★ Destacado</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {article.category && (
                          <span className="inline-block text-xs px-2 py-0.5 rounded text-white font-sans-ui" style={{ backgroundColor: article.category.color ?? "#333" }}>
                            {article.category.name}
                          </span>
                        )}
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
                          <a
                            href={`${siteUrl}/articulo/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Ver en sitio"
                          >
                            <Eye size={15} />
                          </a>
                          <button
                            onClick={() => handlePublishToggle(article.id, article.status === "published")}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title={article.status === "published" ? "Despublicar" : "Publicar"}
                          >
                            {article.status === "published" ? <EyeOff size={15} /> : <Globe size={15} />}
                          </button>
                          <Link
                            href={`/admin/articles/${article.id}/edit`}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(article.id)}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Duplicar"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id, article.title)}
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="Eliminar"
                          >
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-sans-ui text-muted-foreground">Por página:</span>
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="text-xs font-sans-ui border border-input rounded-md px-2 py-1 bg-background"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans-ui border border-input rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-sm font-sans-ui text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans-ui border border-input rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
