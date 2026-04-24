import { useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import ArticleCardFeatured from "@/components/ArticleCardFeatured";
import Sidebar from "@/components/Sidebar";
import { useGetFeaturedArticles, useGetArticles } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const [page, setPage] = useState(1);
  const { data: featured, isLoading: loadingFeatured } = useGetFeaturedArticles();
  const { data: articlesPage, isLoading: loadingArticles } = useGetArticles({ page, limit: 9 });

  const hero = featured?.[0];
  const secondaryFeatured = featured?.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero featured article */}
        {loadingFeatured ? (
          <div className="aspect-[21/9] bg-muted rounded-lg animate-pulse mb-8" />
        ) : hero ? (
          <div className="mb-8">
            <ArticleCardFeatured article={hero} large />
          </div>
        ) : null}

        {/* Secondary featured */}
        {secondaryFeatured && secondaryFeatured.length > 0 && (
          <div className={`grid gap-4 mb-10 ${secondaryFeatured.length === 1 ? "grid-cols-1 max-w-2xl" : "grid-cols-1 md:grid-cols-2"}`}>
            {secondaryFeatured.map(article => (
              <ArticleCardFeatured key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-border flex-1" />
          <h2 className="font-sans-ui text-xs uppercase tracking-widest font-semibold text-muted-foreground px-2">
            Últimas entregas
          </h2>
          <div className="h-px bg-border flex-1" />
        </div>

        {/* Main layout: articles + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
          <div>
            {loadingArticles ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : articlesPage?.articles.length === 0 ? (
              <p className="text-muted-foreground font-sans-ui text-sm">No hay artículos publicados aún.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {articlesPage?.articles.map((article, i) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>

                {/* Pagination */}
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
      </main>

      <Footer />
    </div>
  );
}
