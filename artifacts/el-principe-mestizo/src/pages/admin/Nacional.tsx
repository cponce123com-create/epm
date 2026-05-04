import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusCircle, Pencil, Trash2, Globe, EyeOff, Search, Flag } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGetArticles, useAdminDeleteArticle, useAdminPublishArticle, useGetCategories } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Nacional() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"published" | "draft" | undefined>(undefined);

  const { data: allArticles, isLoading } = useAdminGetArticles({ status: statusFilter });
  const { data: categories } = useGetCategories();
  const deleteArticle = useAdminDeleteArticle();
  const publishArticle = useAdminPublishArticle();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });

  // Resolver el id de la categoría "nacional" (slug o nombre)
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

  // Enlace para crear artículo nuevo con categoría Nacional preseleccionada
  const newArticleHref = nacionalCat
    ? `/admin/articles/new?categoryId=${nacionalCat.id}`
    : "/admin/articles/new";

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-100">
              <Flag size={18} className="text-blue-700" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Nacional</h1>
              <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
                Noticias de cobertura nacional
              </p>
            </div>
          </div>
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

        {/* Aviso si la categoría no existe aún */}
        {!isLoading && !nacionalCat && (
          <div className="mb-5 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
            <Flag size={16} className="text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm font-sans-ui text-yellow-800">
              La categoría <strong>Nacional</strong> aún no existe en el sistema.{" "}
              <Link href="/admin/categories" className="underline hover:text-yellow-900">
                Créala desde Categorías
              </Link>{" "}
              para poder asignarla a tus artículos.
            </p>
          </div>
        )}

        {/* Búsqueda + filtros */}
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

        {/* Tabla */}
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
              <Link
                href={newArticleHref}
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-sans-ui text-primary hover:underline"
              >
                <PlusCircle size={14} />
                Crear el primer artículo
              </Link>
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
                        {article.featured && (
                          <span className="text-xs text-yellow-600 font-sans-ui">★ Destacado</span>
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
      </div>
    </AdminLayout>
  );
}
