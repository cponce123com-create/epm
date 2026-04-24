import { useParams } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Calendar, User, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import CommentSection from "@/components/CommentSection";
import ArticleCard from "@/components/ArticleCard";
import { useGetArticleBySlug, useGetRelatedArticles } from "@workspace/api-client-react";

function SkeletonArticle() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse py-12">
      <div className="h-4 skeleton-shimmer rounded w-24" />
      <div className="h-9 skeleton-shimmer rounded w-full" />
      <div className="h-9 skeleton-shimmer rounded w-3/4" />
      <div className="h-4 skeleton-shimmer rounded w-1/2 mt-2" />
      <div className="h-px bg-border mt-6" />
      <div className="h-[360px] skeleton-shimmer rounded-xl mt-6" />
      <div className="space-y-3 mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-4 skeleton-shimmer rounded ${i % 4 === 3 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

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
        <div className="max-w-7xl mx-auto px-4">
          <SkeletonArticle />
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
          <div className="text-6xl mb-6">📰</div>
          <h1 className="font-display text-3xl font-bold mb-3">Artículo no encontrado</h1>
          <p className="text-muted-foreground font-sans-ui text-base mb-8">
            El artículo que buscas no existe o fue eliminado.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-sans-ui text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft size={15} />
            Volver al inicio
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const date = article.publishedAt
    ? new Date(article.publishedAt)
    : new Date(article.createdAt);

  return (
    <div className="min-h-screen bg-background">
      <ReadingProgress />
      <Header />

      <article className="animate-fade-in">
        {/* Imagen de portada — ancho completo */}
        {article.coverImageUrl && (
          <div className="w-full aspect-[21/9] max-h-[520px] relative overflow-hidden">
            <img
              src={article.coverImageUrl}
              alt={article.coverImageAlt ?? article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 xl:gap-16">

            {/* Contenido principal */}
            <div>
              {/* Breadcrumb / volver */}
              <div className="mb-6">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-sans-ui text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft size={13} />
                  Inicio
                </Link>
                {article.category && (
                  <>
                    <span className="text-muted-foreground/40 mx-2 font-sans-ui text-xs">/</span>
                    <Link
                      href={`/categoria/${article.category.slug}`}
                      className="text-xs font-sans-ui text-muted-foreground hover:text-primary transition-colors"
                    >
                      {article.category.name}
                    </Link>
                  </>
                )}
              </div>

              {/* Cabecera del artículo */}
              <header className="mb-8 max-w-3xl">
                {/* Badge de categoría */}
                {article.category && (
                  <Link href={`/categoria/${article.category.slug}`}>
                    <span
                      className="inline-block text-xs font-sans-ui font-semibold px-3 py-1 rounded text-white uppercase tracking-widest mb-4 hover:opacity-85 transition-opacity"
                      style={{ backgroundColor: article.category.color ?? "#C0392B" }}
                    >
                      {article.category.name}
                    </span>
                  </Link>
                )}

                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-5 text-foreground">
                  {article.title}
                </h1>

                <p className="font-serif text-lg md:text-xl text-muted-foreground italic leading-relaxed mb-7">
                  {article.summary}
                </p>

                {/* Meta del artículo */}
                <div className="flex flex-wrap items-center gap-4 text-sm font-sans-ui text-muted-foreground pb-6 border-b border-border">
                  <span className="flex items-center gap-1.5">
                    <User size={14} />
                    <span className="font-medium text-foreground">{article.authorName}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {article.readingTime} min de lectura
                  </span>
                </div>
              </header>

              {/* Cuerpo del artículo */}
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* Compartir */}
              <div className="mt-10 pt-8 border-t border-border">
                <ShareButtons title={article.title} />
              </div>

              {/* Artículos relacionados */}
              {related && related.length > 0 && (
                <section className="mt-14 pt-8 border-t border-border">
                  <h2 className="font-display text-2xl font-semibold mb-6 section-title">
                    Artículos relacionados
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {related.map((rel, i) => (
                      <ArticleCard key={rel.id} article={rel} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {/* Comentarios */}
              <div className="mt-14">
                <CommentSection articleId={article.id} />
              </div>
            </div>

            {/* Sidebar */}
            <Sidebar />
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
