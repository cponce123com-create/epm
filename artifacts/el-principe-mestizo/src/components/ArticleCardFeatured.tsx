import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import type { Article } from "@workspace/api-client-react";

function ImgWithFallback({ src, alt, className, style, loading }: {
  src: string; alt: string; className?: string; style?: React.CSSProperties; loading?: "lazy" | "eager";
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return <div className={`bg-gray-800 ${className ?? ""}`} style={style} />;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading ?? "eager"}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

interface Props {
  article: Article;
  large?: boolean;
}

export default function ArticleCardFeatured({ article, large = false }: Props) {
  const date = article.publishedAt
    ? new Date(article.publishedAt)
    : new Date(article.createdAt);

  const catColor = article.category?.color ?? "#C0392B";

  /* ── Hero principal (ocupa todo el ancho) ── */
  if (large) {
    return (
      <div className="hero-card animate-fade-in">
        {article.coverImageUrl ? (
          <ImgWithFallback
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? article.title}
            className="hero-card__img"
            loading="eager"
          />
        ) : (
          <div
            className="hero-card__img bg-gradient-to-br from-gray-800 to-red-900"
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <span className="font-display text-white/20 text-6xl font-bold">EPM</span>
          </div>
        )}
        <div className="hero-card__overlay" />
        <div className="hero-card__body">
          {/* Categoría */}
          <Link href={`/categoria/${article.category?.slug ?? ""}`}>
            <span
              className="inline-block text-[11px] font-sans-ui font-700 uppercase tracking-widest text-white px-2.5 py-0.5 mb-3"
              style={{ backgroundColor: catColor }}
            >
              {article.category?.name}
            </span>
          </Link>

          {/* Título */}
          <Link href={`/articulo/${article.slug}`}>
            <h1 className="font-display text-white font-bold leading-tight mb-3 hover:text-red-200 transition-colors"
              style={{ fontSize: "clamp(1.5rem, 3vw + 0.5rem, 2.6rem)", lineHeight: 1.15 }}>
              {article.title}
            </h1>
          </Link>

          {/* Resumen */}
          <p className="text-gray-300 font-serif-body text-base leading-relaxed mb-4 max-w-3xl line-clamp-2 hidden sm:block">
            {article.summary}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-[12px] font-sans-ui text-gray-300">
            {article.authorName && (
              <span className="font-semibold text-white">{article.authorName}</span>
            )}
            <span>·</span>
            <span>{format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
            <span>·</span>
            <span>{article.readingTime} min de lectura</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Card destacada secundaria ── */
  return (
    <div className="hero-card animate-fade-in-up stagger-2">
      {article.coverImageUrl ? (
        <ImgWithFallback
          src={article.coverImageUrl}
          alt={article.coverImageAlt ?? article.title}
          className="w-full object-cover block"
          style={{ aspectRatio: "4/3" }}
          loading="lazy"
        />
      ) : (
        <div className="w-full bg-gradient-to-br from-gray-700 to-red-900" style={{ aspectRatio: "4/3" }} />
      )}
      <div className="hero-card__overlay" />
      <div className="hero-card__body" style={{ padding: "14px 16px" }}>
        <Link href={`/categoria/${article.category?.slug ?? ""}`}>
          <span
            className="inline-block text-[10px] font-sans-ui font-700 uppercase tracking-widest text-white px-2 py-0.5 mb-2"
            style={{ backgroundColor: catColor }}
          >
            {article.category?.name}
          </span>
        </Link>
        <Link href={`/articulo/${article.slug}`}>
          <h2 className="font-display text-white font-bold leading-tight hover:text-red-200 transition-colors text-[1.05rem] md:text-[1.2rem]">
            {article.title}
          </h2>
        </Link>
        <div className="text-[11px] font-sans-ui text-gray-400 mt-1.5">
          {format(date, "d MMM yyyy", { locale: es })} · {article.readingTime} min
        </div>
      </div>
    </div>
  );
}
