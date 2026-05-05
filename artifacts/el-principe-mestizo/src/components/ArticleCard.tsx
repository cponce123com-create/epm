import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import type { Article } from "@workspace/api-client-react";
import OptimizedImage from "@/components/OptimizedImage";

interface Props {
  article: Article;
  size?: "sm" | "md" | "lg";
  horizontal?: boolean;
  index?: number;
  showSummary?: boolean;
}

export default function ArticleCard({
  article,
  size = "md",
  horizontal = false,
  index = 0,
  showSummary = false,
}: Props) {
  const [imgErr, setImgErr] = useState(false);
  const date     = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
  const stagger  = `stagger-${Math.min(index + 1, 6)}`;
  const catColor = article.category?.color ?? "#7A1F1F";

  /* ── Variante horizontal ── */
  if (horizontal) {
    return (
      <div className={`news-card--horizontal animate-fade-in-up ${stagger}`}
        style={{ borderTopColor: catColor }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="news-card__section" style={{ color: catColor }}>
            {article.category?.name}
          </div>
          <Link href={`/articulo/${article.slug}`} style={{ textDecoration: "none" }}>
            <h3 className={`news-card__title ${size === "sm" ? "text-[0.88rem]" : ""}`}>
              {article.title}
            </h3>
          </Link>
          <div className="news-card__meta" style={{ border: "none", padding: 0, margin: 0 }}>
            {article.authorName && <span className="news-card__author">{article.authorName}</span>}
            <span>{format(date, "d MMM yyyy", { locale: es })}</span>
          </div>
        </div>
        {article.coverImageUrl && !imgErr && (
          <Link href={`/articulo/${article.slug}`} className="news-card__thumb">
            <OptimizedImage
              src={article.coverImageUrl}
              alt={article.coverImageAlt ?? article.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              optimizeWidth={320}
            />
          </Link>
        )}
      </div>
    );
  }

  /* ── Variante vertical ── */
  const titleClass =
    size === "lg" ? "news-card__title news-card__title--lg" :
    size === "sm" ? "news-card__title" :
    "news-card__title";

  return (
    <div className={`news-card animate-fade-in-up ${stagger}`}
      style={{ borderTopColor: catColor }}>

      {/* Imagen */}
      {article.coverImageUrl && !imgErr ? (
        <Link href={`/articulo/${article.slug}`} className="news-card__img" style={{ position: "relative", overflow: "hidden" }}>
          <OptimizedImage
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? article.title}
            optimizeWidth={size === "lg" ? 960 : 600}
            className="w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
            style={{ aspectRatio: "16/9" }}
            onError={() => setImgErr(true)}
          />
          <div
            className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.15), transparent 50%)",
              opacity: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
          />
        </Link>
      ) : !imgErr ? (
        <Link href={`/articulo/${article.slug}`} className="news-card__img">
          <div style={{
            width: "100%", aspectRatio: "16/9",
            background: "repeating-linear-gradient(135deg, #e8e1d4 0 12px, #ddd3c0 12px 13px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "rgba(90,86,78,0.25)", fontWeight: 400 }}>EPM</span>
          </div>
        </Link>
      ) : null}

      {/* Contenido con padding interno */}
      <div className="news-card__body">
        {/* Categoría */}
        <div className="news-card__section" style={{ color: catColor }}>
          <Link href={`/categoria/${article.category?.slug ?? ""}`}
            style={{ color: catColor, textDecoration: "none" }}
            className="hover:underline">
            {article.category?.name}
          </Link>
        </div>

        {/* Título */}
        <Link href={`/articulo/${article.slug}`} style={{ textDecoration: "none" }}>
          <h3 className={titleClass}>{article.title}</h3>
        </Link>

        {/* Resumen */}
        {showSummary && article.summary && (
          <p className="news-card__summary line-clamp-2">{article.summary}</p>
        )}

        {/* Meta */}
        <div className="news-card__meta">
          {article.authorName && <span className="news-card__author">{article.authorName}</span>}
          <span>{format(date, "d MMM yyyy", { locale: es })}</span>
          <span>{article.readingTime} min</span>
        </div>
      </div>
    </div>
  );
}
