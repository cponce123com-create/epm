import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Article } from "@workspace/api-client-react";

interface Props {
  article: Article;
  /** Variante de tamaño */
  size?: "sm" | "md" | "lg";
  /** Layout horizontal (thumbnail a la derecha) */
  horizontal?: boolean;
  /** Índice para animación en cascada */
  index?: number;
  /** Mostrar resumen */
  showSummary?: boolean;
}

export default function ArticleCard({
  article,
  size = "md",
  horizontal = false,
  index = 0,
  showSummary = false,
}: Props) {
  const date = article.publishedAt
    ? new Date(article.publishedAt)
    : new Date(article.createdAt);

  const stagger = `stagger-${Math.min(index + 1, 6)}`;
  const catColor = article.category?.color ?? "#C0392B";

  /* ── Horizontal (thumbnail a la derecha) ── */
  if (horizontal) {
    return (
      <div className={`news-card animate-fade-in-up ${stagger} flex gap-3 items-start`}>
        <div className="flex-1 min-w-0">
          <div className="news-card__section" style={{ color: catColor }}>
            {article.category?.name}
          </div>
          <Link href={`/articulo/${article.slug}`}>
            <h3 className={`news-card__title ${size === "sm" ? "text-[0.88rem]" : ""} hover:text-red-700`}>
              {article.title}
            </h3>
          </Link>
          <div className="news-card__meta">
            {article.authorName && (
              <span className="news-card__author">{article.authorName}</span>
            )}
            <span>{format(date, "d MMM yyyy", { locale: es })}</span>
          </div>
        </div>
        {article.coverImageUrl && (
          <Link href={`/articulo/${article.slug}`} className="shrink-0">
            <div className="overflow-hidden" style={{ width: 96, height: 72 }}>
              <img
                src={article.coverImageUrl}
                alt={article.coverImageAlt ?? article.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          </Link>
        )}
      </div>
    );
  }

  /* ── Vertical (imagen arriba) ── */
  const titleClass =
    size === "lg"
      ? "news-card__title news-card__title--lg"
      : size === "sm"
      ? "news-card__title text-[0.88rem]"
      : "news-card__title";

  return (
    <div className={`news-card animate-fade-in-up ${stagger}`}>
      {/* Imagen */}
      {article.coverImageUrl ? (
        <Link href={`/articulo/${article.slug}`} className="news-card__img">
          <img
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? article.title}
            loading="lazy"
            className="w-full object-cover hover:scale-105 transition-transform duration-300"
            style={{ aspectRatio: "16/9" }}
          />
        </Link>
      ) : (
        <Link href={`/articulo/${article.slug}`} className="news-card__img">
          <div
            className="w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"
            style={{ aspectRatio: "16/9" }}
          >
            <span className="font-display text-3xl text-gray-400 font-bold select-none opacity-40">EPM</span>
          </div>
        </Link>
      )}

      {/* Categoría */}
      <div className="news-card__section" style={{ color: catColor }}>
        <Link href={`/categoria/${article.category?.slug ?? ""}`} className="hover:underline">
          {article.category?.name}
        </Link>
      </div>

      {/* Título */}
      <Link href={`/articulo/${article.slug}`}>
        <h3 className={`${titleClass} hover:text-red-700`}>{article.title}</h3>
      </Link>

      {/* Resumen opcional */}
      {showSummary && article.summary && (
        <p className="news-card__summary line-clamp-2">{article.summary}</p>
      )}

      {/* Meta */}
      <div className="news-card__meta">
        {article.authorName && (
          <span className="news-card__author">{article.authorName}</span>
        )}
        <span>{format(date, "d MMM yyyy", { locale: es })}</span>
        <span>{article.readingTime} min</span>
      </div>
    </div>
  );
}

// Separador de metadatos reutilizable
function MetaSep() {
  return <span className="text-gray-300 select-none">·</span>;
}
