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
  const catColor = category?.color ?? "#C0392B";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Banda de categoría */}
      <div className="border-b-4" style={{ borderColor: catColor }}>
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: catColor }} />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
              {category?.name ?? slug}
            </h1>
            {category?.articleCount != null && (
              <span className="text-xs font-sans-ui text-gray-400 ml-2">
                {category.articleCount} artículos
              </span>
            )}
          </div>
          {category?.description && (
            <p className="font-serif-body text-sm text-gray-500 mt-1 max-w-2xl">{category.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="news-card">
                    <div className="skeleton-shimmer w-full mb-2" style={{ aspectRatio: "16/9" }} />
                    <div className="h-3 skeleton-shimmer rounded w-20 mb-2" />
                    <div className="h-4 skeleton-shimmer rounded w-full mb-1" />
                    <div className="h-4 skeleton-shimmer rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : articlesPage?.articles.length === 0 ? (
              <p className="text-gray-400 font-sans-ui text-sm py-12 text-center">
                No hay artículos en esta categoría aún.
              </p>
            ) : (
              <>
                {/* Primer artículo grande */}
                {articlesPage?.articles[0] && (
                  <div className="mb-6 pb-6 border-b border-border">
                    <ArticleCard article={articlesPage.articles[0]} size="lg" showSummary />
                  </div>
                )}

                {/* Resto en grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5">
                  {articlesPage?.articles.slice(1).map((article, i) => (
                    <ArticleCard key={article.id} article={article} index={i} />
                  ))}
                </div>

                {articlesPage && articlesPage.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-border">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={15} /> Anterior
                    </button>
                    <span className="text-sm font-sans-ui text-gray-400">{page} / {articlesPage.totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(articlesPage.totalPages, p + 1))}
                      disabled={page >= articlesPage.totalPages}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente <ChevronRight size={15} />
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
