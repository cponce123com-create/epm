import { useParams } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Calendar, User, ArrowLeft, Share2 } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import CommentSection from "@/components/CommentSection";
import ArticleCard from "@/components/ArticleCard";
import { useGetArticleBySlug, useGetRelatedArticles } from "@workspace/api-client-react";

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, isError } = useGetArticleBySlug(slug!, {
    query: { enabled: !!slug },
  });
  const { data: related } = useGetRelatedArticles(slug!, {
    query: { enabled: !!slug },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-4 animate-pulse">
              <div className="h-3 skeleton-shimmer rounded w-24" />
              <div className="h-8 skeleton-shimmer rounded w-full" />
              <div className="h-8 skeleton-shimmer rounded w-3/4" />
              <div className="h-px bg-border" />
              <div className="skeleton-shimmer w-full" style={{ aspectRatio: "16/9" }} />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`h-4 skeleton-shimmer rounded ${i % 5 === 4 ? "w-2/3" : "w-full"}`} />
              ))}
            </div>
            <div className="hidden lg:block">
              <div className="h-64 skeleton-shimmer rounded" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-24 text-center animate-fade-in">
          <p className="font-display text-4xl font-bold text-gray-200 mb-4">404</p>
          <h1 className="font-display text-2xl font-bold mb-3">Artículo no encontrado</h1>
          <p className="text-gray-500 font-sans-ui text-sm mb-8">El artículo que buscas no existe o fue eliminado.</p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-sans-ui text-red-700 hover:underline">
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const date = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
  const catColor = article.category?.color ?? "#C0392B";

  return (
    <div className="min-h-screen bg-background">
      <ReadingProgress />
      <Header />

      {/* Publicidad leaderboard */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="ad-slot ad-slot--leaderboard" />
      </div>

      <article className="max-w-7xl mx-auto px-4 pb-12 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ── Contenido ── */}
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs font-sans-ui text-gray-400 mb-4">
              <Link href="/" className="hover:text-red-700 transition-colors">Inicio</Link>
              {article.category && (
                <>
                  <span>/</span>
                  <Link href={`/categoria/${article.category.slug}`} className="hover:text-red-700 transition-colors">
                    {article.category.name}
                  </Link>
                </>
              )}
            </nav>

            {/* Cabecera del artículo */}
            <header className="mb-6 max-w-3xl">
              {/* Badge categoría */}
              {article.category && (
                <Link href={`/categoria/${article.category.slug}`}>
                  <span
                    className="inline-block text-[11px] font-sans-ui font-700 px-2.5 py-0.5 text-white uppercase tracking-widest mb-3 hover:opacity-85 transition-opacity"
                    style={{ backgroundColor: catColor }}
                  >
                    {article.category.name}
                  </span>
                </Link>
              )}

              <h1 className="font-display font-bold leading-tight mb-4 text-gray-900"
                style={{ fontSize: "clamp(1.7rem, 3vw + 0.5rem, 2.8rem)", lineHeight: 1.15 }}>
                {article.title}
              </h1>

              <p className="font-serif-body text-lg text-gray-500 italic leading-relaxed mb-5">
                {article.summary}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-[12px] font-sans-ui text-gray-500 pb-4 border-b-2 border-gray-900">
                <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                  <User size={13} /> {article.authorName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {article.readingTime} min de lectura
                </span>
              </div>
            </header>

            {/* Publicidad entre cabecera y cuerpo */}
            <div className="mb-5">
              <div className="ad-slot ad-slot--banner" />
            </div>

            {/* Imagen de portada */}
            {article.coverImageUrl && (
              <figure className="mb-6">
                <img
                  src={article.coverImageUrl}
                  alt={article.coverImageAlt ?? article.title}
                  className="w-full object-cover"
                  style={{ maxHeight: 480 }}
                />
                {article.coverImageAlt && (
                  <figcaption className="text-xs font-sans-ui text-gray-400 mt-1.5 text-center">
                    {article.coverImageAlt}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Cuerpo */}
            <div
              className="article-body"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Publicidad al final del artículo */}
            <div className="mt-8 mb-8">
              <div className="ad-slot ad-slot--leaderboard" />
            </div>

            {/* Compartir */}
            <div className="pt-6 border-t border-border">
              <ShareButtons title={article.title} />
            </div>

            {/* Relacionados */}
            {related && related.length > 0 && (
              <section className="mt-10 pt-6 border-t border-border">
                <div className="section-heading section-heading--colored mb-4">Artículos relacionados</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5">
                  {related.map((rel, i) => (
                    <ArticleCard key={rel.id} article={rel} size="sm" index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Comentarios */}
            <div className="mt-10">
              <CommentSection articleId={article.id} />
            </div>
          </div>

          {/* ── Sidebar ── */}
          <Sidebar />
        </div>
      </article>

      <Footer />
    </div>
  );
}
