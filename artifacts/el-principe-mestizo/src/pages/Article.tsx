import { useParams } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Calendar, User, ArrowLeft, X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import CommentSection from "@/components/CommentSection";
import ArticleCard from "@/components/ArticleCard";
import { useGetArticleBySlug, useGetRelatedArticles, useGetPublicSettings } from "@workspace/api-client-react";
import OptimizedImage from "@/components/OptimizedImage";
import { normalizeMaybeProtocolRelativeUrl } from "@/lib/image";

// ── Hook para inyectar Open Graph / meta tags dinámicos ───────────────────
/**
 * Actualiza los <meta> tags del <head> para que Facebook, WhatsApp,
 * Twitter y Google muestren la imagen de portada del artículo al compartir.
 *
 * IMPORTANTE: Para que esto funcione correctamente en producción, el servidor
 * (Render) debe devolver los meta tags en el HTML inicial (Server-Side Rendering
 * o un middleware que lea el slug y rellene los tags).
 * Esta versión "client-side" sirve para cuando los crawlers ejecutan JS,
 * como el bot de Twitter/X y algunos verificadores.
 */
function useArticleMetaTags(article: {
  title: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  slug: string;
  authorName?: string | null;
} | null, siteSettings: any) {
  useEffect(() => {
    if (!article) return;

    const siteName = siteSettings?.siteName ?? "El Príncipe Mestizo";
    const siteUrl  = siteSettings?.siteUrl  ?? window.location.origin;
    const fallbackImg = siteSettings?.ogImage ?? "";

    const title       = article.title;
    const description = article.summary ?? "";
    const image       = article.coverImageUrl || fallbackImg;
    const url         = `${siteUrl}/articulo/${article.slug}`;

    // Helpers
    const setMeta = (selector: string, attr: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        // Extraemos el atributo desde el selector, ej: [property="og:title"] → property
        const match = selector.match(/\[(\w+)="([^"]+)"\]/);
        if (match) el.setAttribute(match[1], match[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, content);
    };

    // Título de la pestaña
    document.title = `${title} — ${siteName}`;

    // Meta description
    setMeta('meta[name="description"]', "content", description);

    // Open Graph
    setMeta('meta[property="og:type"]',        "content", "article");
    setMeta('meta[property="og:title"]',       "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]',         "content", url);
    setMeta('meta[property="og:site_name"]',   "content", siteName);
    if (image) {
      setMeta('meta[property="og:image"]',       "content", image);
      setMeta('meta[property="og:image:width"]', "content", "1200");
      setMeta('meta[property="og:image:height"]',"content", "630");
      setMeta('meta[property="og:image:alt"]',   "content", title);
    }

    // Twitter Card
    setMeta('meta[name="twitter:card"]',        "content", image ? "summary_large_image" : "summary");
    setMeta('meta[name="twitter:title"]',       "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    if (image) setMeta('meta[name="twitter:image"]', "content", image);

    // Restaurar al desmontar
    return () => {
      document.title = siteName;
    };
  }, [article, siteSettings]);
}

// ── Lightbox con zoom, drag y pinch ──────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos]     = useState({ x: 0, y: 0 });
  const isDragging        = useRef(false);
  const dragOrigin        = useRef({ x: 0, y: 0 });
  const posAtDragStart    = useRef({ x: 0, y: 0 });
  const lastPinchDist     = useRef<number | null>(null);
  const imgRef            = useRef<HTMLImageElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")                      onClose();
      if (e.key === "+" || e.key === "=")          zoom(0.4);
      if (e.key === "-")                           zoom(-0.4);
      if (e.key === "0" || e.key === "r")          reset();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);  // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = useCallback((delta: number) => {
    setScale(s => {
      const next = Math.min(5, Math.max(1, s + delta));
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }); }, []);

  // ── Wheel zoom (desktop) ──────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    zoom(e.deltaY < 0 ? 0.35 : -0.35);
  };

  // ── Mouse drag (desktop) ─────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    posAtDragStart.current = { ...pos };
    e.preventDefault();
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPos({
      x: posAtDragStart.current.x + (e.clientX - dragOrigin.current.x),
      y: posAtDragStart.current.y + (e.clientY - dragOrigin.current.y),
    });
  };
  const onMouseUp = () => { isDragging.current = false; };

  // ── Pinch-to-zoom (mobile) ────────────────────────────────────────────
  const getPinchDist = (touches: React.TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const dist = getPinchDist(e.touches);
    if (lastPinchDist.current !== null) {
      const delta = (dist - lastPinchDist.current) * 0.015;
      setScale(s => Math.min(5, Math.max(1, s + delta)));
    }
    lastPinchDist.current = dist;
  };
  const onTouchEnd = () => { lastPinchDist.current = null; };

  const ctrlBtn = "flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors backdrop-blur-sm";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center select-none"
      onClick={onClose}
    >
      {/* ── Control bar ── */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm"
        onClick={e => e.stopPropagation()}
      >
        <button className={ctrlBtn} onClick={() => zoom(-0.4)} aria-label="Alejar"><ZoomOut size={15} /></button>
        <span className="text-white/60 text-[11px] font-mono w-10 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button className={ctrlBtn} onClick={() => zoom(0.4)} aria-label="Acercar"><ZoomIn size={15} /></button>
        {scale > 1 && (
          <button className={ctrlBtn} onClick={reset} aria-label="Restablecer"><RotateCcw size={14} /></button>
        )}
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button className={ctrlBtn} onClick={onClose} aria-label="Cerrar"><X size={15} /></button>
      </div>

      {/* ── Hint de uso ── */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[10px] text-white/30 font-sans-ui hidden md:block pointer-events-none">
        Rueda para zoom · Arrastrar para mover · Esc para cerrar
      </div>

      {/* ── Imagen ── */}
      <div
        className="overflow-hidden"
        style={{ cursor: scale > 1 ? (isDragging.current ? "grabbing" : "grab") : "zoom-out" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={e => { if (scale === 1) onClose(); else e.stopPropagation(); }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          style={{
            maxWidth: "92vw",
            maxHeight: "88vh",
            objectFit: "contain",
            transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`,
            transition: isDragging.current ? "none" : "transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94)",
            transformOrigin: "center center",
            userSelect: "none",
            WebkitUserSelect: "none",
            willChange: "transform",
          }}
        />
      </div>

      {/* ── Caption ── */}
      {alt && (
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <span className="inline-block bg-black/60 text-white/70 text-[11px] font-sans-ui px-4 py-1.5 rounded-full max-w-md">
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

  return {
    lightbox,
    closeLightbox: () => setLightbox(null),
    openLightbox: (src: string, alt: string) => setLightbox({ src, alt }),
  };
}

function useArticleImageLoading(contentRef: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const container = contentRef.current;
    if (!container) return;

    const imgs = container.querySelectorAll<HTMLImageElement>("img");
    imgs.forEach((img) => {
      const dataSrc = img.getAttribute("data-src");
      if (!img.getAttribute("src") && dataSrc) {
        img.setAttribute("src", normalizeMaybeProtocolRelativeUrl(dataSrc));
      }
      const currentSrc = img.getAttribute("src");
      if (currentSrc) img.setAttribute("src", normalizeMaybeProtocolRelativeUrl(currentSrc));

      img.loading = "lazy";
      img.decoding = "async";
      img.onerror = () => {
        if (img.dataset.fallbackApplied === "1") return;
        img.dataset.fallbackApplied = "1";
        img.style.display = "none";
      };
    });
  }, [contentRef, ready]);
}

// ── Hook: agrupa imágenes consecutivas en filas de 2 ─────────────────────
function useArticleImageGrid(contentRef: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const container = contentRef.current;
    if (!container) return;

    // Buscamos <p> que contengan únicamente una <img> (sin texto)
    const allP = Array.from(container.querySelectorAll<HTMLParagraphElement>("p"));
    const imgOnlyP = allP.filter(p => {
      const real = Array.from(p.childNodes).filter(
        n => !(n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() === ""),
      );
      return real.length === 1 && (real[0] as Element).tagName === "IMG";
    });

    if (imgOnlyP.length < 2) return;

    // Agrupamos elementos <p> consecutivos en el DOM
    const groups: HTMLParagraphElement[][] = [];
    let run: HTMLParagraphElement[] = [];

    for (let i = 0; i < imgOnlyP.length; i++) {
      const p = imgOnlyP[i];
      if (run.length === 0) {
        run.push(p);
      } else {
        let sib: Element | null = run[run.length - 1].nextElementSibling;
        if (sib === p) {
          run.push(p);
        } else {
          if (run.length >= 2) groups.push(run);
          run = [p];
        }
      }
    }
    if (run.length >= 2) groups.push(run);

    // Envolvemos cada grupo en un div grid
    for (const group of groups) {
      const grid = document.createElement("div");
      grid.className = "article-image-grid";
      group[0].parentNode?.insertBefore(grid, group[0]);
      for (const p of group) {
        const img = p.querySelector("img");
        if (img) {
          grid.appendChild(img.cloneNode(true));
        }
        p.remove();
      }
    }
  }, [contentRef, ready]);
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
  const { data: siteSettings } = useGetPublicSettings();

  const contentRef = useRef<HTMLDivElement>(null);
  const contentReady = !!article && !isLoading;

  const { lightbox, closeLightbox, openLightbox } = useArticleLightbox(contentRef);
  useArticleImageGrid(contentRef, contentReady);
  useArticleImageLoading(contentRef, contentReady);

  // ── Inyectar Open Graph meta tags para que la miniatura aparezca al compartir ──
  useArticleMetaTags(article ?? null, siteSettings);

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
                    className="category-tag mb-3"
                    style={{ backgroundColor: catColor }}
                  >
                    {article.category.name}
                  </span>
                </Link>
              )}

              <h1
                className="font-display font-bold leading-tight mb-4 text-gray-900"
                style={{ fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.85rem)", lineHeight: 1.12 }}
              >
                {article.title}
              </h1>

              {article.summary && (
                <p className="font-serif-body text-[1.1rem] text-gray-500 italic leading-relaxed mb-5" style={{ maxWidth: "62ch" }}>
                  {article.summary}
                </p>
              )}

              <div className="article-meta">
                {article.authorName && (
                  <span className="article-meta__author">
                    <User size={13} /> {article.authorName}
                  </span>
                )}
                <span className="article-meta__sep">·</span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
                <span className="article-meta__sep">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
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
              <figure className="mb-7">
                <div className="relative overflow-hidden group">
                  <OptimizedImage
                    src={article.coverImageUrl}
                    alt={article.coverImageAlt ?? article.title}
                    className="w-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.02]"
                    style={{ maxHeight: 500 }}
                    optimizeWidth={1400}
                    priority
                    onClick={() => article.coverImageUrl && openLightbox(article.coverImageUrl, article.coverImageAlt ?? article.title)}
                  />
                  <div className="absolute top-3 right-3 bg-black/50 text-white/80 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <ZoomIn size={16} />
                  </div>
                </div>
                {article.coverImageAlt && (
                  <figcaption className="text-[0.78rem] font-sans-ui text-gray-400 mt-2 text-center italic leading-relaxed">
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
