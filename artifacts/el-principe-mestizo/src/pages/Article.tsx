import { useParams } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Calendar, User, ArrowLeft, X, ZoomIn } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import CommentSection from "@/components/CommentSection";
import ArticleCard from "@/components/ArticleCard";
import { useGetArticleBySlug, useGetRelatedArticles } from "@workspace/api-client-react";

// ── Lightbox ──────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/92 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/70 transition-colors"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      {alt && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="inline-block bg-black/60 text-white/80 text-xs font-sans-ui px-4 py-1.5 rounded-full max-w-lg">
            {alt}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Hook que convierte imágenes del artículo en clicables ─────────────────
function useArticleLightbox(contentRef: React.RefObject<HTMLDivElement | null>) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const imgs = container.querySelectorAll<HTMLImageElement>("img");
    imgs.forEach(img => {
      img.style.cursor = "zoom-in";
      img.title = "Clic para ampliar";

      const wrapper = img.parentElement;
      // Añadir ícono de zoom encima de cada imagen
      if (wrapper && !wrapper.querySelector(".zoom-hint")) {
        wrapper.style.position = "relative";
        const hint = document.createElement("div");
        hint.className = "zoom-hint";
        hint.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;
        hint.style.cssText = "position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.55);color:#fff;padding:5px;border-radius:4px;pointer-events:none;opacity:0;transition:opacity 0.15s;display:flex;align-items:center;justify-content:center;";
        wrapper.appendChild(hint);
        wrapper.addEventListener("mouseenter", () => { hint.style.opacity = "1"; });
        wrapper.addEventListener("mouseleave", () => { hint.style.opacity = "0"; });
      }

      const handler = () => {
        setLightbox({ src: img.src, alt: img.alt ?? "" });
      };
      img.addEventListener("click", handler);
      (img as any)._lightboxHandler = handler;
    });

    return () => {
      imgs.forEach(img => {
        if ((img as any)._lightboxHandler) {
          img.removeEventListener("click", (img as any)._lightboxHandler);
        }
      });
    };
  }, [contentRef]);

  return { lightbox, closeLightbox: () => setLightbox(null) };
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function SkeletonArticle() {
  return (
    <div className="space-y-4 animate-pulse py-10">
      <div className="h-3 skeleton-shimmer rounded w-24" />
      <div className="h-9 skeleton-shimmer rounded w-full" />
      <div className="h-9 skeleton-shimmer rounded w-3/4" />
      <div className="h-px bg-border mt-4" />
      <div className="skeleton-shimmer w-full rounded" style={{ aspectRatio: "16/9" }} />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`h-4 skeleton-shimmer rounded ${i % 5 === 4 ? "w-2/3" : "w-full"}`} />
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

  const contentRef = useRef<HTMLDivElement>(null);
  const { lightbox, closeLightbox } = useArticleLightbox(contentRef);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <SkeletonArticle />
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
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-sans-ui text-primary hover:underline">
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const date      = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
  const catColor  = article.category?.color ?? "#C0392B";

  return (
    <div className="min-h-screen bg-background">
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={closeLightbox} />}
      <ReadingProgress />
      <Header />

      {/* Publicidad */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="ad-slot ad-slot--leaderboard" />
      </div>

      <article className="max-w-7xl mx-auto px-4 pb-12 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ── Contenido ── */}
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs font-sans-ui text-gray-400 mb-4">
              <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
              {article.category && (
                <>
                  <span>/</span>
                  <Link href={`/categoria/${article.category.slug}`} className="hover:text-primary transition-colors">
                    {article.category.name}
                  </Link>
                </>
              )}
            </nav>

            {/* Cabecera */}
            <header className="mb-6 max-w-3xl">
              {article.category && (
                <Link href={`/categoria/${article.category.slug}`}>
                  <span
                    className="inline-block text-[11px] font-sans-ui font-bold px-2.5 py-0.5 text-white uppercase tracking-widest mb-3 hover:opacity-85 transition-opacity"
                    style={{ backgroundColor: catColor }}
                  >
                    {article.category.name}
                  </span>
                </Link>
              )}

              <h1
                className="font-display font-bold leading-tight mb-4 text-gray-900"
                style={{ fontSize: "clamp(1.7rem, 3vw + 0.5rem, 2.8rem)", lineHeight: 1.15 }}
              >
                {article.title}
              </h1>

              <p className="font-serif-body text-lg text-gray-500 italic leading-relaxed mb-5">
                {article.summary}
              </p>

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

            {/* Publicidad inline */}
            <div className="mb-5">
              <div className="ad-slot ad-slot--banner" />
            </div>

            {/* Imagen de portada */}
            {article.coverImageUrl && (
              <figure className="mb-6">
                <img
                  src={article.coverImageUrl}
                  alt={article.coverImageAlt ?? article.title}
                  className="w-full object-cover cursor-zoom-in"
                  style={{ maxHeight: 480 }}
                  onClick={() => article.coverImageUrl && closeLightbox()}
                />
                {article.coverImageAlt && (
                  <figcaption className="text-xs font-sans-ui text-gray-400 mt-1.5 text-center italic">
                    {article.coverImageAlt}
                  </figcaption>
                )}
              </figure>
            )}

            {/* ── Cuerpo del artículo ── */}
            <div
              ref={contentRef}
              className="article-body"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Publicidad final */}
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
