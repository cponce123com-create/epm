import { useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import ArticleCardFeatured from "@/components/ArticleCardFeatured";
import Sidebar from "@/components/Sidebar";
import { useGetFeaturedArticles, useGetArticles } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-card-border">
      <div className="aspect-[16/9] skeleton-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-3 skeleton-shimmer rounded w-20" />
        <div className="h-4 skeleton-shimmer rounded w-full" />
        <div className="h-4 skeleton-shimmer rounded w-4/5" />
        <div className="h-3 skeleton-shimmer rounded w-3/4 mt-2" />
        <div className="h-3 skeleton-shimmer rounded w-1/2 mt-1" />
        <div className="h-3 skeleton-shimmer rounded w-28 mt-4" />
      </div>
    </div>
  );
}

function SkeletonHero() {
  return (
    <div className="aspect-[21/9] skeleton-shimmer rounded-xl mb-8 min-h-[220px]" />
  );
}

export default function Home() {
  const [page, setPage] = useState(1);
  const { data: featured, isLoading: loadingFeatured } = useGetFeaturedArticles();
  const { data: articlesPage, isLoading: loadingArticles } = useGetArticles({ page, limit: 9 });

  const hero = featured?.[0];
  const secondaryFeatured = featured?.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-10">

        {/* Hero — artículo destacado principal */}
        {loadingFeatured ? (
          <SkeletonHero />
        ) : hero ? (
          <div className="mb-8">
            <ArticleCardFeatured article={hero} large />
          </div>
        ) : null}

        {/* Destacados secundarios */}
        {secondaryFeatured && secondaryFeatured.length > 0 && (
          <div
            className={`grid gap-5 mb-12 ${
              secondaryFeatured.length === 1
                ? "grid-cols-1 max-w-2xl"
                : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {secondaryFeatured.map(article => (
              <ArticleCardFeatured key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Separador de sección */}
        <div className="flex items-center gap-4 mb-8 md:mb-10">
          <div className="h-px bg-border flex-1" />
          <div className="flex items-center gap-2 px-3">
            <Flame size={14} className="text-primary" />
            <h2 className="font-sans-ui text-xs uppercase tracking-widest font-semibold text-muted-foreground">
              Últimas entregas
            </h2>
          </div>
          <div className="h-px bg-border flex-1" />
        </div>

        {/* Layout principal: artículos + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 xl:gap-14">
          <div>
            {loadingArticles ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : articlesPage?.articles.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="text-4xl mb-4">✍️</div>
                <p className="font-display text-lg text-foreground mb-2">Aún no hay artículos publicados</p>
                <p className="text-muted-foreground font-sans-ui text-sm">
                  Importa tus artículos desde{" "}
                  <Link href="/admin/import-medium" className="text-primary underline">
                    Medium
                  </Link>{" "}
                  o crea uno nuevo desde el panel de administración.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 mb-10">
                  {articlesPage?.articles.map((article, i) => (
                    <ArticleCard key={article.id} article={article} index={i} />
                  ))}
                </div>

                {/* Paginación */}
                {articlesPage && articlesPage.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      disabled={page === 1}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui border border-border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-x-0.5"
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: articlesPage.totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === articlesPage.totalPages || Math.abs(p - page) <= 1)
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span key={`dots-${i}`} className="px-2 text-muted-foreground font-sans-ui text-sm">…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              className={`w-9 h-9 rounded-lg text-sm font-sans-ui font-medium transition-all ${
                                page === p
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "border border-border hover:bg-muted text-foreground"
                              }`}
                            >
                              {p}
                            </button>
                          )
                        )
                      }
                    </div>

                    <button
                      onClick={() => { setPage(p => Math.min(articlesPage.totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      disabled={page >= articlesPage.totalPages}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui border border-border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:translate-x-0.5"
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
      </main>

      <Footer />
    </div>
  );
}
