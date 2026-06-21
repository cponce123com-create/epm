import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import ArticleCardFeatured from "@/components/ArticleCardFeatured";
import Sidebar from "@/components/Sidebar";
import OptimizedImage from "@/components/OptimizedImage";
import AdSlot from "@/components/AdSlot";
import BackToTop from "@/components/BackToTop";
import { useGetPageHome, useGetArticles } from "@workspace/api-client-react";
import type { Article, ArticleListItem, Category } from "@workspace/api-client-react";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ── Encabezado de sección estilo impreso ─────────────────── */
function SectionHeading({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      marginBottom: 24, paddingBottom: 12,
      borderBottom: "2px solid #15140F",
    }}>
      <h3 style={{
        fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
        fontWeight: 400, fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
        margin: 0, color: "#15140F", letterSpacing: "-0.01em",
      }}>
        {title}
      </h3>
      {link && (
        <Link href={link} className="epm-mono"
          style={{ fontSize: 11, color: "#7A1F1F", letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none", fontWeight: 600 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          {linkLabel ?? "Ver todas →"}
        </Link>
      )}
    </div>
  );
}

/* ── Encabezado de sección con color ─────────────────────── */
function SectionHeadingColored({ title, color, href }: { title: string; color: string; href: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      marginBottom: 20, paddingBottom: 10,
      borderBottom: `2px solid ${color}`,
    }}>
      <Link href={href} style={{ textDecoration: "none" }}>
        <h3 style={{
          fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
          fontWeight: 400, fontSize: "clamp(1.3rem, 2.2vw, 1.7rem)",
          margin: 0, color: color, letterSpacing: "-0.01em",
        }}>
          {title}
        </h3>
      </Link>
      <Link href={href} className="epm-mono"
        style={{ fontSize: 11, color: "#7A1F1F", letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none", fontWeight: 600 }}>
        Ver todas →
      </Link>
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

/** Helper: pasa un ArticleListItem a ArticleCard que espera Article */
function toArticle(a: ArticleListItem): Article {
  return a as unknown as Article;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface ExternalHeadline {
  id: number;
  title: string;
  link: string;
  source: string;
  summary: string | null;
  pub_date: string;
}

export default function Home() {
  const [page, setPage] = useState(1);
  const { data: pageData, isLoading } = useGetPageHome();
  // Always call hook (React rules), but only use result for page > 1
  const { data: paginated, isLoading: loadingPaginated } = useGetArticles(
    { page, limit: 12 },
  );

  const featured         = pageData?.featured ?? [];
  const latestArticles   = page > 1 ? paginated : pageData?.latestArticles;
  const categorySections = pageData?.categorySections ?? [];

  const hero        = featured[0];
  const panelArts   = featured.slice(1, 4);
  const subFeatured = featured.slice(4, 6);
  const tertiary    = featured.slice(6, 10);

  const loadingFeatured  = isLoading;
  const loadingArticles  = isLoading || (page > 1 && loadingPaginated);

  // ── Noticias externas (botnoticias) ──
  const [externalHeadlines, setExternalHeadlines] = useState<ExternalHeadline[]>([]);
  const [loadingExternal, setLoadingExternal] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/external-news?limit=8`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then(data => {
        setExternalHeadlines(data.headlines ?? []);
        setLoadingExternal(false);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          setLoadingExternal(false);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--epm-paper)" }}>
      <Helmet>
        <title>El Príncipe Mestizo · Comunicación ciudadana desde la selva central</title>
        <meta name="description" content="Periodismo ciudadano desde San Ramón, Chanchamayo (Perú). Opinión, denuncia e investigación." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <Header />

      <main className="max-w-7xl mx-auto px-4 pb-12">

        {/* ══ HERO SPLIT ══════════════════════════════════════════ */}
        <div style={{ minHeight: 340 }} className="lg:min-h-[680px]">
        {!loadingFeatured && hero && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            height: "auto",
            borderBottom: "1px solid #D6CFBF",
            marginBottom: 0,
            animation: "fadeIn 0.3s ease",
          }}
            className="lg:grid-cols-[1fr_360px] lg:h-[680px]">

            {/* ── Foto hero ── */}
            <div style={{ minHeight: 340, position: "relative" }} className="lg:min-h-0">
              <ArticleCardFeatured article={toArticle(hero)} large />
            </div>

            {/* ── Panel oscuro de recomendados ── */}
            <aside style={{
              background: "#3D1010",
              display: "flex", flexDirection: "column",
            }}>
              {/* Cabecera */}
              <div className="epm-mono epm-panel-article" style={{
                paddingBottom: 14,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "baseline", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 10, letterSpacing: "0.24em", fontWeight: 600, color: "#7A1F1F", textTransform: "uppercase" }}>
                  Recomendados
                </span>
                <span style={{ fontSize: 9, letterSpacing: "0.16em", color: "rgba(244,240,231,0.35)", textTransform: "uppercase" }}>
                  Selección del editor
                </span>
              </div>

              {/* Artículos 01, 02, 03 */}
              {panelArts?.map((art, idx) => {
                const date = art.publishedAt ? new Date(art.publishedAt) : new Date(art.createdAt);
                const catColor = art.category?.color ?? "#7A1F1F";
                return (
                  <a key={art.id}
                    href={`/articulo/${art.slug}`}
                    className="epm-panel-article"
                    style={{
                      flex: 1,
                      display: "grid",
                      gridTemplateColumns: "1fr 88px",
                      gap: 16,
                      borderBottom: idx < 2 ? "1px solid rgba(255,255,255,0.1)" : "none",
                      color: "#F4F0E7", textDecoration: "none",
                      alignItems: "center",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>

                    {/* Texto */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span className="epm-mono" style={{ fontSize: 9, letterSpacing: "0.18em", fontWeight: 700, color: "#7A1F1F" }}>
                          0{idx + 1}
                        </span>
                        <span className="epm-mono" style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: catColor, opacity: 0.9 }}>
                          {art.category?.name}
                        </span>
                      </div>
                      <h3 style={{
                        fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
                        fontWeight: 400, fontSize: 17,
                        lineHeight: 1.2, margin: "0 0 10px", color: "#F4F0E7",
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {art.title}
                      </h3>
                      <div className="epm-mono" style={{ fontSize: 9, letterSpacing: "0.08em", opacity: 0.5, display: "flex", gap: 8 }}>
                        <span>{format(date, "d MMM yyyy", { locale: es })}</span>
                        <span>·</span>
                        <span>{art.readingTime} min</span>
                      </div>
                    </div>

                    {/* Thumbnail 88×88 */}
                    {art.coverImageUrl ? (
                      <div style={{ width: 88, height: 88, flexShrink: 0, overflow: "hidden" }}>
                        <OptimizedImage
                          src={art.coverImageUrl}
                          alt={art.coverImageAlt ?? art.title}
                          className="w-full h-full object-cover"
                          optimizeWidth={200}
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: 88, height: 88, flexShrink: 0,
                        background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 12px, rgba(255,255,255,0.02) 12px 13px)",
                      }} />
                    )}
                  </a>
                );
              })}
            </aside>
          </div>
        )}

        {/* ── Skeleton hero ── */}
        {loadingFeatured && (
          <div className="grid lg:grid-cols-[1fr_360px]" style={{ borderBottom: "1px solid #D6CFBF" }}>
            <div className="skeleton-shimmer" style={{ height: 340 }} />
          </div>
        )}
        </div>

        {/* ══ SUB-FEATURED: 2 artículos solo texto ════════════════ */}
        {subFeatured && subFeatured.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{
            gap: 0,
            padding: "32px 0",
            borderBottom: "1px solid #D6CFBF",
            marginBottom: 40,
          }}>
            {subFeatured.map((art, idx) => {
              const date = art.publishedAt ? new Date(art.publishedAt) : new Date(art.createdAt);
              const catColor = art.category?.color ?? "#7A1F1F";
              return (
                <article key={art.id}
                  className={idx === 0
                    ? "pb-8 border-b sm:pb-0 sm:border-b-0 sm:pr-8 sm:border-r"
                    : "pt-8 sm:pt-0 sm:pl-8"}
                  style={{ borderColor: "#D6CFBF" }}>
                  <div className="epm-mono" style={{
                    fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
                    color: catColor, marginBottom: 12, fontWeight: 600,
                  }}>
                    ▌ {art.category?.name}
                  </div>
                  <Link href={`/articulo/${art.slug}`} style={{ textDecoration: "none" }}>
                    <h2 style={{
                      fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
                      fontWeight: 400, fontSize: "clamp(1.3rem, 2vw, 1.75rem)",
                      lineHeight: 1.15, margin: "0 0 12px", color: "#15140F", letterSpacing: "-0.005em",
                      transition: "color 0.15s",
                    }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = "#7A1F1F")}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = "#15140F")}>
                      {art.title}
                    </h2>
                  </Link>
                  {art.summary && (
                    <p style={{
                      fontSize: 14.5, lineHeight: 1.6, color: "#5A564E",
                      margin: "0 0 14px",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {art.summary}
                    </p>
                  )}
                  <div className="epm-mono" style={{ fontSize: 10, color: "#8A857C", letterSpacing: "0.06em", display: "flex", gap: 10 }}>
                    <span>{format(date, "d MMM yyyy", { locale: es })}</span>
                    <span>·</span>
                    <span>{art.readingTime} min de lectura</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ══ PUBLICIDAD ══════════════════════════════════════════ */}
        <div className="mb-8">
          <AdSlot format="leaderboard" />
        </div>

        {/* ══ GRID PRINCIPAL: artículos + sidebar ══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">

          {/* ── Columna izquierda ── */}
          <div>
            {/* Terciarios destacados */}
            {tertiary && tertiary.length > 0 && (
              <div className="mb-10">
                <SectionHeading title="Destacados" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
                  {tertiary.map((art, i) => (
                    <ArticleCard key={art.id} article={toArticle(art)} size="sm" index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Secciones por categoría (desde el endpoint consolidado) */}
            {categorySections.map((sec) => {
              const cat = sec.category as Category;
              if (sec.articles.length === 0) return null;
              const [main, ...rest] = sec.articles;
              return (
                <div key={cat.id} className="mb-10">
                  <SectionHeadingColored
                    title={cat.name}
                    color={cat.color}
                    href={`/categoria/${cat.slug}`}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-x-5">
                    <div className="md:pr-5 md:border-r" style={{ borderColor: "#D6CFBF" }}>
                      <ArticleCard article={toArticle(main)} size="lg" showSummary />
                    </div>
                    <div>
                      {rest.map((art, i) => (
                        <ArticleCard key={art.id} article={toArticle(art)} size="sm" horizontal index={i} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Noticias de última hora (externas) ── */}
            {externalHeadlines.length > 0 && (
              <div className="mb-10">
                <SectionHeading title="Noticias de última hora" link="/noticias" linkLabel="Ver más →" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
                  {externalHeadlines.map((hl) => (
                    <a
                      key={hl.id}
                      href={hl.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                      style={{ textDecoration: "none" }}>
                      <article className="h-full" style={{
                        border: "1px solid #E8E3D7",
                        borderRadius: 0,
                        background: "#FCFAF5",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = "#7A1F1F";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(122,31,31,0.08)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = "#E8E3D7";
                          e.currentTarget.style.boxShadow = "none";
                        }}>
                        <div style={{ padding: 20 }}>
                          {/* Fuente + fecha */}
                          <div className="epm-mono" style={{
                            fontSize: 10,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#7A1F1F",
                            fontWeight: 600,
                            marginBottom: 10,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}>
                            <span>▌ {hl.source}</span>
                            <span style={{ color: "#8A857C", fontWeight: 400 }}>
                              {(() => {
                                try {
                                  const d = new Date(hl.pub_date);
                                  if (isNaN(d.getTime())) return "";
                                  return format(d, "d MMM", { locale: es });
                                } catch {
                                  return "";
                                }
                              })()}
                            </span>
                          </div>
                          {/* Título */}
                          <h3 style={{
                            fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
                            fontWeight: 400,
                            fontSize: 16,
                            lineHeight: 1.3,
                            margin: "0 0 8px",
                            color: "#15140F",
                            transition: "color 0.2s",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                            className="group-hover-child">
                            {hl.title}
                          </h3>
                          {/* Resumen opcional */}
                          {hl.summary && (
                            <p style={{
                              fontSize: 12.5,
                              lineHeight: 1.5,
                              color: "#5A564E",
                              margin: 0,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}>
                              {hl.summary}
                            </p>
                          )}
                        </div>
                      </article>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Últimas entregas paginadas ── */}
            <div className="mt-10">
              <SectionHeading title="Últimas entregas" />

              {loadingArticles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : latestArticles?.articles.length === 0 ? (
                <div className="text-center py-16">
                  <p className="font-display text-lg text-stone-500 mb-2">No hay artículos publicados aún</p>
                  <p className="text-sm font-sans-ui text-stone-400">
                    Importa tus artículos desde el{" "}
                    <Link href="/admin/import-medium" className="underline" style={{ color: "#7A1F1F" }}>panel de administración</Link>
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6">
                    {latestArticles?.articles.map((article, i) => (
                      <ArticleCard key={article.id} article={toArticle(article)} index={i} />
                    ))}
                  </div>

                  {/* Paginación */}
                  {latestArticles && latestArticles.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8 pt-6"
                      style={{ borderTop: "1px solid #D6CFBF" }}>
                      <button
                        onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={page === 1}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ border: "1px solid #D6CFBF", background: "transparent", color: "#15140F", cursor: "pointer" }}>
                        <ChevronLeft size={14} /> Anterior
                      </button>
                      <span className="epm-mono px-3" style={{ fontSize: 11, color: "#8A857C" }}>
                        {page} / {latestArticles.totalPages}
                      </span>
                      <button
                        onClick={() => { setPage(p => Math.min(latestArticles.totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={page >= latestArticles.totalPages}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui disabled:opacity-40 disabled:cursor-not-allowed"
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

      <BackToTop />
      <Footer />
    </div>
  );
}
