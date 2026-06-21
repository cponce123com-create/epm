import { useParams, Link } from "wouter";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Calendar, Newspaper } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import BackToTop from "@/components/BackToTop";
import { Helmet } from "react-helmet-async";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface ExternalHeadline {
  id: number;
  title: string;
  link: string;
  source: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  slug: string | null;
  pub_date: string;
  created_at: string;
}

function safeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return format(d, "d MMM yyyy", { locale: es });
  } catch {
    return "";
  }
}

function NoticiaMetaTags({ headline }: { headline: ExternalHeadline | null }) {
  if (!headline) return null;

  const siteUrl = window.location.origin;
  const canonicalUrl = `${siteUrl}/noticia/${headline.slug}`;
  const image = headline.image_url ?? "";
  const desc = headline.summary ?? "";

  return (
    <Helmet>
      <title>{`${headline.title} — El Príncipe Mestizo`}</title>
      <meta name="description" content={desc} />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={headline.title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="El Príncipe Mestizo" />
      <meta property="og:locale" content="es_PE" />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={headline.title} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  );
}

function SkeletonNoticia() {
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

export default function NoticiaExterna() {
  const { slug } = useParams<{ slug: string }>();
  const [headline, setHeadline] = useState<ExternalHeadline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();

    fetch(`${API_BASE}/api/external-headlines/${slug}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then(data => {
        setHeadline(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <SkeletonNoticia />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !headline) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center animate-fade-in">
          <p className="font-display text-4xl font-bold text-gray-200 mb-4">404</p>
          <h1 className="font-display text-2xl font-bold mb-3">
            Noticia no encontrada
          </h1>
          <p className="text-gray-500 font-sans-ui text-sm mb-8">
            La noticia externa que buscas no existe o fue eliminada.
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

  return (
    <div className="min-h-screen bg-background">
      <NoticiaMetaTags headline={headline} />
      <ReadingProgress />
      <Header />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 animate-fade-in">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs font-sans-ui text-gray-400 mb-6 pt-6">
          <Link href="/" className="hover:text-primary transition-colors">
            Inicio
          </Link>
          <span>/</span>
          <span className="text-gray-500">Noticias externas</span>
        </nav>

        {/* ═══════════════════════════════════════════════
           HERO SECTION
           ═══════════════════════════════════════════════ */}
        <header className="mb-10">
          {/* Source badge */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className="category-tag"
              style={{ backgroundColor: "#7A1F1F" }}
            >
              {headline.source}
            </span>
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
            {headline.title}
          </h1>

          {/* Meta: fecha + link original */}
          <div className="flex flex-wrap items-center gap-4 text-sm font-sans-ui text-gray-500 mb-6">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {safeDate(headline.pub_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Newspaper size={14} />
              {headline.source}
            </span>
            <a
              href={headline.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline ml-auto"
            >
              <ExternalLink size={14} />
              Fuente original
            </a>
          </div>

          {/* Share buttons */}
          <ShareButtons
            title={headline.title}
            url={`${window.location.origin}/noticia/${headline.slug}`}
          />
        </header>

        {/* ═══════════════════════════════════════════════
           FEATURED IMAGE
           ═══════════════════════════════════════════════ */}
        {headline.image_url && (
          <div className="mb-10 -mx-4 sm:mx-0 sm:rounded-lg overflow-hidden">
            <img
              src={headline.image_url}
              alt={headline.title}
              className="w-full h-auto object-cover"
              style={{ maxHeight: 500 }}
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════
           CONTENT
           ═══════════════════════════════════════════════ */}
        <div className="max-w-3xl mx-auto">
          {/* Summary */}
          {headline.summary && (
            <div
              className="text-base sm:text-lg leading-relaxed text-gray-700 font-serif mb-8 italic border-l-4 border-primary pl-4"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              {headline.summary}
            </div>
          )}

          {/* Full content */}
          {headline.content ? (
            <div
              className="prose-custom"
              style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: "clamp(1rem, 1.2vw + 0.3rem, 1.2rem)",
                lineHeight: 1.75,
                color: "#2D2A24",
              }}
              dangerouslySetInnerHTML={{ __html: headline.content }}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 font-sans-ui text-sm mb-4">
                El contenido completo está disponible en la fuente original.
              </p>
              <a
                href={headline.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-sans-ui font-medium text-white rounded-none transition-colors"
                style={{ backgroundColor: "#7A1F1F" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#9a2828")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#7A1F1F")}
              >
                <ExternalLink size={14} />
                Leer en {headline.source}
              </a>
            </div>
          )}

          {/* Bottom share + source */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ShareButtons
                title={headline.title}
                url={`${window.location.origin}/noticia/${headline.slug}`}
              />
              <a
                href={headline.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-sans-ui"
              >
                <ExternalLink size={14} />
                Ver fuente original
              </a>
            </div>
          </div>
        </div>
      </article>

      <BackToTop />
      <Footer />
    </div>
  );
}
