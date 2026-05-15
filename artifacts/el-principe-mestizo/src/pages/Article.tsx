import { useParams } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Calendar, User, ArrowLeft, X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import CommentSection from "@/components/CommentSection";
import ArticleCard from "@/components/ArticleCard";
import BackToTop from "@/components/BackToTop";
import AdSlot from "@/components/AdSlot";
import { useGetArticleBySlug, useGetRelatedArticles, useGetPublicSettings } from "@workspace/api-client-react";
import OptimizedImage from "@/components/OptimizedImage";
import { normalizeMaybeProtocolRelativeUrl } from "@/lib/image";

// ── Hook para metatags Open Graph ──────────────────────────────────────────
function useArticleMetaTags(
  article: {
    title: string;
    summary?: string | null;
    coverImageUrl?: string | null;
    slug: string;
    authorName?: string | null;
  } | null,
  siteSettings: any,
) {
  useEffect(() => {
    if (!article) return;
    const siteName = siteSettings?.siteName ?? "El Príncipe Mestizo";
    const siteUrl = siteSettings?.siteUrl ?? window.location.origin;
    const fallbackImg = siteSettings?.ogImage ?? "";
    const title = article.title;
    const description = article.summary ?? "";
    const image = article.coverImageUrl || fallbackImg;
    const url = `${siteUrl}/articulo/${article.slug}`;

    const setMeta = (selector: string, attr: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const match = selector.match(/\[(\w+)="([^"]+)"\]/);
        if (match) el.setAttribute(match[1], match[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, content);
    };

    document.title = `${title} — ${siteName}`;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:type"]', "content", "article");
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:site_name"]', "content", siteName);
    if (image) {
      setMeta('meta[property="og:image"]', "content", image);
      setMeta('meta[property="og:image:width"]', "content", "1200");
      setMeta('meta[property="og:image:height"]', "content", "630");
      setMeta('meta[property="og:image:alt"]', "content", title);
    }
    setMeta('meta[name="twitter:card"]', "content", image ? "summary_large_image" : "summary");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    if (image) setMeta('meta[name="twitter:image"]', "content", image);

    return () => { document.title = siteName; };
  }, [article, siteSettings]);
}

// ── Lightbox con navegación entre imágenes ──────────────────────────────────
function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: { src: string; alt: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const posAtDragStart = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  const current = images[currentIndex];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrentIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
      if (e.key === "+" || e.key === "=") zoom(0.4);
      if (e.key === "-") zoom(-0.4);
      if (e.key === "0" || e.key === "r") reset();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [images.length]);

  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [currentIndex]);

  const zoom = useCallback((delta: number) => {
    setScale((s) => {
      const next = Math.min(5, Math.max(1, s + delta));
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }); }, []);

  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    zoom(e.deltaY < 0 ? 0.35 : -0.35);
  };

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
      setScale((s) => Math.min(5, Math.max(1, s + delta)));
    }
    lastPinchDist.current = dist;
  };
  const onTouchEnd = () => { lastPinchDist.current = null; };

  const ctrlBtn =
    "flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors backdrop-blur-sm";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center select-none"
      onClick={onClose}
    >
      {/* Control bar */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button className={ctrlBtn} onClick={() => zoom(-0.4)} aria-label="Alejar">
          <ZoomOut size={15} />
        </button>
        <span className="text-white/60 text-[11px] font-mono w-10 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button className={ctrlBtn} onClick={() => zoom(0.4)} aria-label="Acercar">
          <ZoomIn size={15} />
        </button>
        {scale > 1 && (
          <button className={ctrlBtn} onClick={reset} aria-label="Restablecer">
            <RotateCcw size={14} />
          </button>
        )}
        <span className="text-white/40 text-[11px] font-mono tabular-nums">
          {currentIndex + 1}/{images.length}
        </span>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button className={ctrlBtn} onClick={onClose} aria-label="Cerrar">
          <X size={15} />
        </button>
      </div>

      {/* Nav arrows */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((i) => i - 1);
              }}
              aria-label="Anterior"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {currentIndex < images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((i) => i + 1);
              }}
              aria-label="Siguiente"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </>
      )}

      {/* Keyboard hint */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[10px] text-white/30 font-sans-ui hidden md:block pointer-events-none">
        ← → Navegar · Rueda zoom · Arrastrar mover · Esc cerrar
      </div>

      {/* Image */}
      <div
        className="overflow-hidden"
        style={{
          cursor:
            scale > 1 ? (isDragging.current ? "grabbing" : "grab") : "zoom-out",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          if (scale === 1) onClose();
          else e.stopPropagation();
        }}
      >
        <img
          key={currentIndex}
          src={current.src}
          alt={current.alt}
          draggable={false}
          style={{
            maxWidth: "92vw",
            maxHeight: "88vh",
            objectFit: "contain",
            transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`,
            transition: isDragging.current
              ? "none"
              : "transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94)",
            transformOrigin: "center center",
            userSelect: "none",
            WebkitUserSelect: "none",
            willChange: "transform",
          }}
        />
      </div>

      {/* Caption */}
      {current.alt && (
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <span className="inline-block bg-black/60 text-white/70 text-[11px] font-sans-ui px-4 py-1.5 rounded-full max-w-md">
            {current.alt}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Hook: recolecta todas las imágenes del artículo para navegación ─────────
function useArticleLightbox(contentRef: React.RefObject<HTMLDivElement | null>) {
  const [lightbox, setLightbox] = useState<{
    images: { src: string; alt: string }[];
    index: number;
  } | null>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const imgs = container.querySelectorAll<HTMLImageElement>("img");
    const allImages = Array.from(imgs).map((img) => ({
      src: img.src,
      alt: img.alt ?? "",
    }));

    imgs.forEach((img, i) => {
      img.style.cursor = "zoom-in";
      img.title = "Clic para ampliar";

      const wrapper = img.parentElement;
      if (wrapper && !wrapper.querySelector(".zoom-hint")) {
        wrapper.style.position = "relative";
        const hint = document.createElement("div");
        hint.className = "zoom-hint";
        hint.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;
        hint.style.cssText =
          "position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.55);color:#fff;padding:5px;border-radius:4px;pointer-events:none;opacity:0;transition:opacity 0.15s;display:flex;align-items:center;justify-content:center;";
        wrapper.appendChild(hint);
        wrapper.addEventListener("mouseenter", () => {
          hint.style.opacity = "1";
        });
        wrapper.addEventListener("mouseleave", () => {
          hint.style.opacity = "0";
        });
      }

      const handler = () => {
        setLightbox({ images: allImages, index: i });
      };
      img.addEventListener("click", handler);
      (img as any)._lightboxHandler = handler;
    });

    return () => {
      imgs.forEach((img) => {
        if ((img as any)._lightboxHandler) {
          img.removeEventListener("click", (img as any)._lightboxHandler);
        }
      });
    };
  }, [contentRef]);

  return {
    lightbox,
    closeLightbox: () => setLightbox(null),
    openLightbox: (src: string, alt: string) =>
      setLightbox({ images: [{ src, alt }], index: 0 }),
  };
}

function useArticleImageLoading(
  contentRef: React.RefObject<HTMLDivElement | null>,
  ready: boolean,
) {
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
      if (currentSrc)
        img.setAttribute("src", normalizeMaybeProtocolRelativeUrl(currentSrc));

      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => {
        if (img.dataset.fallbackApplied === "1") return;
        img.dataset.fallbackApplied = "1";
        img.style.display = "none";
      };
    });
  }, [contentRef, ready]);
}

// ── Hook: agrupa imágenes consecutivas en filas de 2 ─────────────────────
function useArticleImageGrid(
  contentRef: React.RefObject<HTMLDivElement | null>,
  ready: boolean,
) {
  useEffect(() => {
    if (!ready) return;
    const container = contentRef.current;
    if (!container) return;

    const allP = Array.from(
      container.querySelectorAll<HTMLParagraphElement>("p"),
    );
    const imgOnlyP = allP.filter((p) => {
      const real = Array.from(p.childNodes).filter(
        (n) =>
          !(
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "").trim() === ""
          ),
      );
      return real.length === 1 && (real[0] as Element).tagName === "IMG";
    });

    if (imgOnlyP.length < 2) return;

    const groups: HTMLParagraphElement[][] = [];
    let run: HTMLParagraphElement[] = [];

    for (let i = 0; i < imgOnlyP.length; i++) {
      const p = imgOnlyP[i];
      if (run.length === 0) {
        run.push(p);
      } else {
        const sib: Element | null = run[run.length - 1].nextElementSibling;
        if (sib === p) {
          run.push(p);
        } else {
          if (run.length >= 2) groups.push(run);
          run = [p];
        }
      }
    }
    if (run.length >= 2) groups.push(run);

    for (const group of groups) {
      const grid = document.createElement("div");
      grid.className = "article-image-grid";
      group[0].parentNode?.insertBefore(grid, group[0]);
      for (const p of group) {
        const img = p.querySelector("img");
        if (img) {
          // Strip inline width/height so CSS object-fit:cover controls sizing
          img.removeAttribute("width");
          img.removeAttribute("height");
          img.style.width = "";
          img.style.height = "";
          grid.appendChild(img);
        }
        p.remove();
      }
    }
  }, [contentRef, ready]);
}

// ── Hook: mejora imágenes del cuerpo ─────────────────────────────────────
function useArticleBodyImages(
  contentRef: React.RefObject<HTMLDivElement | null>,
  ready: boolean,
) {
  useEffect(() => {
    if (!ready) return;
    const container = contentRef.current;
    if (!container) return;

    const imgs = container.querySelectorAll<HTMLImageElement>("img");
    imgs.forEach((img, i) => {
      img.setAttribute("referrerpolicy", "no-referrer");
      if (i > 0) img.setAttribute("loading", "lazy");
      if (!img.dataset.fallbackSet) {
        img.dataset.fallbackSet = "1";
        img.addEventListener("error", function onErr() {
          img.removeEventListener("error", onErr);
          img.style.display = "none";
          const parent = img.parentElement;
          if (parent && !parent.querySelector(".img-broken")) {
            const ph = document.createElement("div");
            ph.className = "img-broken";
            ph.style.cssText =
              "width:100%;background:hsl(0 0% 94%);display:flex;align-items:center;justify-content:center;aspect-ratio:16/9;border-radius:4px;";
            ph.innerHTML =
              '<span style="font-family:var(--app-font-sans);font-size:0.75rem;color:hsl(0 0% 55%)">Imagen no disponible</span>';
            parent.insertBefore(ph, img);
          }
        });
      }
    });
  }, [contentRef, ready]);
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function SkeletonArticle() {
  return (
    <div className="space-y-4 animate-pulse py-10 max-w-3xl mx-auto">
      <div className="h-3 skeleton-shimmer rounded w-24" />
      <div className="h-9 skeleton-shimmer rounded w-full" />
      <div className="h-9 skeleton-shimmer rounded w-3/4" />
      <div className="h-px bg-border mt-4" />
      <div
        className="skeleton-shimmer w-full rounded"
        style={{ aspectRatio: "16/9" }}
      />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 skeleton-shimmer rounded ${i % 5 === 4 ? "w-2/3" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Componente de avatar con iniciales ─────────────────────────────────────
function AuthorAvatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-sans font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  // @ts-ignore
  const { data: article, isLoading, isError } = useGetArticleBySlug(slug!, {
    enabled: !!slug,
    // @ts-ignore
  });
  // @ts-ignore
  const { data: related } = useGetRelatedArticles(slug!, {
    enabled: !!slug,
  });
  const { data: siteSettings } = useGetPublicSettings();

  const contentRef = useRef<HTMLDivElement>(null);
  const contentReady = !!article && !isLoading;

  const API_BASE =
    (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  const processedContent = useMemo(() => {
    const raw = article?.content;
    if (!raw) return "";
    return raw.replace(
      /src="(\/api\/proxy-image\?[^"]*)"/gi,
      (_, path) => `src="${API_BASE}${path}"`,
    );
  }, [article?.content, API_BASE]);

  // Order: grid first, then image loading, then lightbox
  useArticleImageGrid(contentRef, contentReady);
  useArticleImageLoading(contentRef, contentReady);
  useArticleBodyImages(contentRef, contentReady);
  const { lightbox, closeLightbox, openLightbox } =
    useArticleLightbox(contentRef);

  useArticleMetaTags(article ?? null, siteSettings);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
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
        <div className="max-w-4xl mx-auto px-4 py-24 text-center animate-fade-in">
          <p className="font-display text-4xl font-bold text-gray-200 mb-4">
            404
          </p>
          <h1 className="font-display text-2xl font-bold mb-3">
            Artículo no encontrado
          </h1>
          <p className="text-gray-500 font-sans-ui text-sm mb-8">
            El artículo que buscas no existe o fue eliminado.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-sans-ui text-primary hover:underline"
          >
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const date = article.publishedAt
    ? new Date(article.publishedAt)
    : new Date(article.createdAt);
  const catColor = article.category?.color ?? "#C0392B";

  return (
    <div className="min-h-screen bg-background">
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={closeLightbox}
        />
      )}
      <ReadingProgress />
      <Header />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 animate-fade-in">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs font-sans-ui text-gray-400 mb-6 pt-6">
          <Link
            href="/"
            className="hover:text-primary transition-colors"
          >
            Inicio
          </Link>
          {article.category && (
            <>
              <span>/</span>
              <Link
                href={`/categoria/${article.category.slug}`}
                className="hover:text-primary transition-colors"
              >
                {article.category.name}
              </Link>
            </>
          )}
        </nav>

        {/* ═══════════════════════════════════════════════
           HERO SECTION
           ═══════════════════════════════════════════════ */}
        <header className="mb-10">
          {/* Category badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {article.category && (
              <Link href={`/categoria/${article.category.slug}`}>
                <span
                  className="category-tag"
                  style={{ backgroundColor: catColor }}
                >
                  {article.category.name}
                </span>
              </Link>
            )}
            {(article as any).secondaryCategory && (
              <Link
                href={`/categoria/${(article as any).secondaryCategory.slug}`}
              >
                <span
                  className="category-tag"
                  style={{
                    backgroundColor:
                      (article as any).secondaryCategory.color ?? "#555",
                  }}
                >
                  {(article as any).secondaryCategory.name}
                </span>
              </Link>
            )}
          </div>

          {/* Title */}
          <h1
            className="font-display font-bold leading-tight mb-5 text-gray-900"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw + 0.5rem, 3rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            {article.title}
          </h1>

          {/* Summary */}
          {article.summary && (
            <p
              className="font-serif-body text-[1.05rem] sm:text-[1.15rem] text-gray-500 italic leading-relaxed mb-6"
              style={{ maxWidth: "65ch" }}
            >
              {article.summary}
            </p>
          )}

          {/* Author row */}
          <div className="flex items-center gap-3 mb-3">
            <AuthorAvatar
              name={article.authorName ?? "EPM"}
              size={44}
            />
            <div>
              <p className="font-sans-ui text-sm font-semibold text-gray-800">
                {article.authorName ?? "El Príncipe Mestizo"}
              </p>
              <p className="font-sans-ui text-xs text-gray-400">
                Comunicación ciudadana desde la selva central
              </p>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans-ui text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              {format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}
            </span>
            <span className="hidden sm:inline text-gray-300">·</span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {article.readingTime} min de lectura
            </span>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════
           COVER IMAGE
           ═══════════════════════════════════════════════ */}
        {article.coverImageUrl && (
          <figure className="mb-10 -mx-4 sm:-mx-6">
            <div className="relative overflow-hidden group">
              <OptimizedImage
                src={article.coverImageUrl}
                alt={article.coverImageAlt ?? article.title}
                className="w-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.02]"
                style={{ maxHeight: 520 }}
                optimizeWidth={1400}
                priority
                onClick={() =>
                  article.coverImageUrl &&
                  openLightbox(
                    article.coverImageUrl,
                    article.coverImageAlt ?? article.title,
                  )
                }
              />
              <div className="absolute top-3 right-3 bg-black/50 text-white/80 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <ZoomIn size={16} />
              </div>
            </div>
            {article.coverImageAlt && (
              <figcaption className="text-[0.78rem] font-sans-ui text-gray-400 mt-2 text-center italic leading-relaxed max-w-2xl mx-auto">
                {article.coverImageAlt}
              </figcaption>
            )}
          </figure>
        )}

        {/* Ad slot inline */}
        <div className="mb-8">
          <AdSlot format="horizontal" />
        </div>

        {/* ═══════════════════════════════════════════════
           ARTICLE BODY — single column centered
           ═══════════════════════════════════════════════ */}
        <div
          ref={contentRef}
          className="article-body"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />

        {/* Ad slot after body */}
        <div className="mt-10 mb-8">
          <AdSlot format="leaderboard" />
        </div>

        {/* Share */}
        <div className="pt-6 border-t border-border">
          <ShareButtons title={article.title} />
        </div>

        {/* Related articles */}
        {related && related.length > 0 && (
          <section className="mt-10 pt-6 border-t border-border">
            <div className="section-heading section-heading--colored mb-6">
              Artículos relacionados
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-6">
              {related.map((rel, i) => (
                <ArticleCard key={rel.id} article={rel} size="sm" index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Comments */}
        <div className="mt-12">
          <CommentSection articleId={article.id} />
        </div>
      </article>

      <BackToTop />
      <Footer />
    </div>
  );
}
