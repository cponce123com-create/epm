import { useState } from "react";
import { useParams } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ArticleCard from "@/components/ArticleCard";
import { useGetArticles, useGetCategories } from "@workspace/api-client-react";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const { data: categories } = useGetCategories();
  const { data: articlesPage, isLoading } = useGetArticles(
    { page, limit: 12, category: slug },
    { query: { enabled: !!slug } }
  );

  const category = categories?.find(c => c.slug === slug);
  const categoryNames: Record<string, string> = {
    denuncia: "Denuncia",
    opinion: "Opinión",
    investigacion: "Investigación",
    ciudad: "Ciudad",
    politica: "Política",
  };
  const displayName = category?.name ?? categoryNames[slug ?? ""] ?? slug ?? "";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Category banner */}
      <div
        className="py-12 px-4"
        style={{ backgroundColor: category?.color ? `${category.color}18` : "hsl(var(--muted))", borderBottom: `3px solid ${category?.color ?? "hsl(var(--primary))"}` }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category?.color ?? "hsl(var(--primary))" }}
            />
            <span className="font-sans-ui text-xs uppercase tracking-widest text-muted-foreground">Sección</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{displayName}</h1>
          {category?.description && (
            <p className="font-serif text-base text-muted-foreground max-w-2xl">{category.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : articlesPage?.articles.length === 0 ? (
              <p className="text-muted-foreground font-sans-ui text-sm">No hay artículos en esta categoría aún.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {articlesPage?.articles.map(article => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>

                {articlesPage && articlesPage.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-sans-ui border border-border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </button>
                    <span className="font-sans-ui text-sm text-muted-foreground px-3">
                      Página {page} de {articlesPage.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(articlesPage.totalPages, p + 1))}
                      disabled={page >= articlesPage.totalPages}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-sans-ui border border-border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <Sidebar />
        </div>
      </div>

      <Footer />
    </div>
  );
}
