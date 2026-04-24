import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusCircle, Pencil, Trash2, Globe, EyeOff } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGetArticles, useAdminDeleteArticle, useAdminPublishArticle } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ArticleList() {
  const [statusFilter, setStatusFilter] = useState<"published" | "draft" | undefined>(undefined);
  const { data: articles, isLoading } = useAdminGetArticles({ status: statusFilter });
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

  const handlePublishToggle = async (id: number, published: boolean) => {
    try {
      await publishArticle.mutateAsync({ id, data: { published: !published } });
      invalidate();
      toast({ description: published ? "Artículo despublicado." : "Artículo publicado." });
    } catch {
      toast({ description: "Error al cambiar el estado.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Artículos</h1>
            <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
              {articles?.length ?? 0} artículos en total
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

        {/* Filters */}
        <div className="flex gap-2 mb-5">
          {[
            { label: "Todos", value: undefined },
            { label: "Publicados", value: "published" as const },
            { label: "Borradores", value: "draft" as const },
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

        {/* Table */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="text-sm font-sans-ui text-muted-foreground">Cargando...</div>
            </div>
          ) : !articles?.length ? (
            <div className="p-8 text-center">
              <p className="font-sans-ui text-sm text-muted-foreground">No hay artículos.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Título</th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Categoría</th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Fecha</th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articles.map(article => {
                  const date = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
                  return (
                    <tr key={article.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-sans-ui text-sm font-medium line-clamp-1">{article.title}</div>
                        {article.featured && (
                          <span className="text-xs text-yellow-600 font-sans-ui">★ Destacado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded text-white font-sans-ui"
                          style={{ backgroundColor: article.category?.color ?? "#333" }}
                        >
                          {article.category?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground font-sans-ui">
                        {format(date, "d MMM yyyy", { locale: es })}
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
