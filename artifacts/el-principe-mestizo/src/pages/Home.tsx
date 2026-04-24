import { useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import ArticleCardFeatured from "@/components/ArticleCardFeatured";
import Sidebar from "@/components/Sidebar";
import { useGetFeaturedArticles, useGetArticles, useGetCategories } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function SkeletonHero() {
  return <div className="w-full skeleton-shimmer" style={{ aspectRatio: "16/8", minHeight: 260 }} />;
}
function SkeletonCard() {
  return (
    <div className="news-card">
      <div className="skeleton-shimmer w-full mb-2" style={{ aspectRatio: "16/9" }} />
      <div className="h-3 skeleton-shimmer rounded w-20 mb-2" />
      <div className="h-4 skeleton-shimmer rounded w-full mb-1" />
      <div className="h-4 skeleton-shimmer rounded w-3/4 mb-2" />
      <div className="h-3 skeleton-shimmer rounded w-28" />
    </div>
  );
}

export default function Home() {
  const [page, setPage] = useState(1);
  const { data: featured,     isLoading: loadingFeatured }  = useGetFeaturedArticles();
  const { data: articlesPage, isLoading: loadingArticles }  = useGetArticles({ page, limit: 12 });
  const { data: categories }                                = useGetCategories();

  const hero      = featured?.[0];
  const secondary = featured?.slice(1, 3);   // dos secundarios
  const tertiary  = featured?.slice(3, 7);   // hasta 4 terciarios

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Publicidad leaderboard ── */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="ad-slot ad-slot--leaderboard" />
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-12">

        {/* ════════════════════════════════════════
            BLOQUE HERO
        ════════════════════════════════════════ */}
        {loadingFeatured ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2"><SkeletonHero /></div>
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ) : hero && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 mb-0">
            {/* Hero principal — 2/3 del ancho */}
            <div className="lg:col-span-2 col-divider pr-0 lg:pr-4">
              <ArticleCardFeatured article={hero} large />
            </div>

            {/* Secundarios — 1/3 del ancho */}
            <div className="pl-0 lg:pl-4 pt-4 lg:pt-0 space-y-0">
              {secondary?.map((art, i) => (
                <div key={art.id} className={i < (secondary.length - 1) ? "border-b border-border pb-4 mb-4" : ""}>
                  <ArticleCard article={art} size="md" showSummary={i === 0} index={i} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            PUBLICIDAD HORIZONTAL
        ════════════════════════════════════════ */}
        <div className="my-5">
          <div className="ad-slot ad-slot--leaderboard" />
        </div>

        {/* ════════════════════════════════════════
            GRID PRINCIPAL: artículos + sidebar
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ── Columna izquierda ── */}
          <div>
            {/* Terciarios destacados */}
            {tertiary && tertiary.length > 0 && (
              <div className="mb-6">
                <div className="section-heading section-heading--colored">Destacados</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {tertiary.map((art, i) => (
                    <ArticleCard key={art.id} article={art} size="sm" index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Categorías en secciones */}
            {categories?.filter(c => c.articleCount > 0).map(cat => (
              <CategorySection key={cat.id} catSlug={cat.slug} catName={cat.name} catColor={cat.color} />
            ))}

            {/* ── Todos los artículos paginados ── */}
            <div className="mt-8">
              <div className="section-heading">Últimas entregas</div>

              {loadingArticles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : articlesPage?.articles.length === 0 ? (
                <div className="text-center py-16">
                  <p className="font-display text-lg text-gray-500 mb-2">No hay artículos publicados aún</p>
                  <p className="text-sm font-sans-ui text-gray-400">
                    Importa tus artículos desde el{" "}
                    <Link href="/admin/import-medium" className="text-red-700 underline">panel de administración</Link>
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5">
                    {articlesPage?.articles.map((article, i) => (
                      <ArticleCard key={article.id} article={article} index={i} />
                    ))}
                  </div>

                  {/* Paginación */}
                  {articlesPage && articlesPage.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-border">
                      <button
                        onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={page === 1}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={15} /> Anterior
                      </button>

                      <span className="text-sm font-sans-ui text-gray-500 px-3">
                        {page} / {articlesPage.totalPages}
                      </span>

                      <button
                        onClick={() => { setPage(p => Math.min(articlesPage.totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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
          </div>

          {/* ── Sidebar ── */}
          <Sidebar />
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ── Mini sección por categoría ── */
function CategorySection({ catSlug, catName, catColor }: { catSlug: string; catName: string; catColor: string }) {
  const { data } = useGetArticles({ page: 1, limit: 4, category: catSlug });
  const articles = data?.articles ?? [];
  if (articles.length === 0) return null;

  const [main, ...rest] = articles;

  return (
    <div className="mb-8">
      <div className="section-heading section-heading--colored" style={{ borderTopColor: catColor, color: catColor }}>
        <Link href={`/categoria/${catSlug}`} className="hover:underline">{catName}</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-x-5">
        {/* Principal de la sección */}
        <div className="col-divider pr-0 md:pr-5">
          <ArticleCard article={main} size="lg" showSummary />
        </div>

        {/* Secundarios de la sección */}
        <div>
          {rest.map((art, i) => (
            <ArticleCard key={art.id} article={art} size="sm" horizontal index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
