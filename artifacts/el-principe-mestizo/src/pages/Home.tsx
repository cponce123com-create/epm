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
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", height: 580, border: "1px solid #D6CFBF" }}>
      <div className="skeleton-shimmer" style={{ height: "100%" }} />
      <div style={{ background: "#15140F", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "16px 0", borderBottom: "1px solid rgba(244,240,231,0.08)" }}>
            <div className="skeleton-shimmer" style={{ width: 80, height: 60, flexShrink: 0, opacity: 0.3 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="skeleton-shimmer" style={{ height: 8, width: "40%", opacity: 0.2 }} />
              <div className="skeleton-shimmer" style={{ height: 12, width: "90%", opacity: 0.2 }} />
              <div className="skeleton-shimmer" style={{ height: 12, width: "70%", opacity: 0.2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="news-card">
      <div className="skeleton-shimmer w-full mb-3" style={{ aspectRatio: "16/9" }} />
      <div className="h-3 skeleton-shimmer rounded w-20 mb-2" />
      <div className="h-4 skeleton-shimmer rounded w-full mb-1" />
      <div className="h-4 skeleton-shimmer rounded w-3/4 mb-2" />
      <div className="h-3 skeleton-shimmer rounded w-28" />
    </div>
  );
}

export default function Home() {
  const [page, setPage] = useState(1);
  const { data: featured,     isLoading: loadingFeatured } = useGetFeaturedArticles();
  const { data: articlesPage, isLoading: loadingArticles } = useGetArticles({ page, limit: 12 });
  const { data: categories }                               = useGetCategories();

  const hero      = featured?.[0];
  const secondary = featured?.slice(1, 4);  // 3 en panel oscuro
  const tertiary  = featured?.slice(4, 8);  // hasta 4 terciarios

  return (
    <div className="min-h-screen" style={{ background: "var(--epm-paper)" }}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 pb-12">

        {/* ══ HERO SPLIT: foto grande izquierda + panel recomendados ══ */}
        <div style={{ margin: "0 -16px", marginBottom: 0 }} className="md:mx-0">
          {loadingFeatured ? (
            <SkeletonHero />
          ) : hero ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              borderBottom: "1px solid #D6CFBF",
            }}
              className="lg:grid-cols-[1fr_300px]">

              {/* Hero principal */}
              <div style={{ minHeight: 400, height: "100%" }}
                className="lg:min-h-[560px]">
                <ArticleCardFeatured article={hero} large />
              </div>

              {/* Panel oscuro de recomendados */}
              <aside style={{
                background: "#15140F",
                display: "flex", flexDirection: "column",
              }}>
                {/* Cabecera del panel */}
                <div className="epm-mono" style={{
                  padding: "18px 24px 14px",
                  borderBottom: "1px solid rgba(244,240,231,0.1)",
                  display: "flex", alignItems: "baseline", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 10, letterSpacing: "0.24em", fontWeight: 600, color: "#7A1F1F", textTransform: "uppercase" }}>
                    Recomendados
                  </span>
                  <span style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(244,240,231,0.35)", textTransform: "uppercase" }}>
                    Selección del editor
                  </span>
                </div>

                {/* Artículos secundarios */}
                {secondary?.map((art, idx) => (
                  <div key={art.id} style={{
                    flex: 1,
                    borderBottom: idx < (secondary.length - 1) ? "1px solid rgba(244,240,231,0.08)" : "none",
                    transition: "background 0.2s ease",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <ArticleCardFeatured article={art} large={false} />
                  </div>
                ))}
              </aside>
            </div>
          ) : null}
        </div>

        {/* ══ PUBLICIDAD LEADERBOARD ══════════════════════════════ */}
        <div className="my-6">
          <div className="ad-slot ad-slot--leaderboard" />
        </div>

        {/* ══ GRID PRINCIPAL: artículos + sidebar ══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ── Columna izquierda ── */}
          <div>
            {/* Terciarios destacados */}
            {tertiary && tertiary.length > 0 && (
              <div className="mb-8">
                <div className="section-heading">
                  <span>Destacados</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-0">
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

            {/* ── Últimas entregas paginadas ── */}
            <div className="mt-8">
              <div className="section-heading">
                <span>Últimas entregas</span>
              </div>

              {loadingArticles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : articlesPage?.articles.length === 0 ? (
                <div className="text-center py-16">
                  <p className="font-display text-lg text-stone-500 mb-2">No hay artículos publicados aún</p>
                  <p className="text-sm font-sans-ui text-stone-400">
                    Importa tus artículos desde el{" "}
                    <Link href="/admin/import-medium" className="underline" style={{ color: "#7A1F1F" }}>panel de administración</Link>
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-0">
                    {articlesPage?.articles.map((article, i) => (
                      <ArticleCard key={article.id} article={article} index={i} />
                    ))}
                  </div>

                  {/* Paginación */}
                  {articlesPage && articlesPage.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8 pt-6" style={{ borderTop: "1px solid #D6CFBF" }}>
                      <button
                        onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={page === 1}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        style={{ border: "1px solid #D6CFBF", background: "transparent", color: "#15140F", cursor: "pointer" }}>
                        <ChevronLeft size={14} /> Anterior
                      </button>
                      <span className="epm-mono text-stone-400 px-3" style={{ fontSize: 11 }}>
                        {page} / {articlesPage.totalPages}
                      </span>
                      <button
                        onClick={() => { setPage(p => Math.min(articlesPage.totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={page >= articlesPage.totalPages}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        style={{ border: "1px solid #D6CFBF", background: "transparent", color: "#15140F", cursor: "pointer" }}>
                        Siguiente <ChevronRight size={14} />
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
      <div className="section-heading section-heading--colored" style={{ color: catColor }}>
        <Link href={`/categoria/${catSlug}`} className="hover:opacity-80 transition-opacity"
          style={{ color: catColor, textDecoration: "none", fontFamily: "var(--app-font-mono)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase" }}>
          {catName}
        </Link>
        <Link href={`/categoria/${catSlug}`}
          style={{ fontSize: "0.6rem", fontFamily: "var(--app-font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7A1F1F", textDecoration: "none" }}
          className="hover:opacity-75 transition-opacity">
          Ver todas →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-x-5">
        <div style={{ paddingRight: 0, borderRight: "none" }} className="md:pr-5 md:border-r md:border-stone-200">
          <ArticleCard article={main} size="lg" showSummary />
        </div>
        <div>
          {rest.map((art, i) => (
            <ArticleCard key={art.id} article={art} size="sm" horizontal index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
