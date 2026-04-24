import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, ArrowRight, User } from "lucide-react";
import type { Article } from "@workspace/api-client-react";

interface Props {
  article: Article;
  large?: boolean;
}

export default function ArticleCardFeatured({ article, large = false }: Props) {
  const date = article.publishedAt
    ? new Date(article.publishedAt)
    : new Date(article.createdAt);

  /* ── Hero grande ── */
  if (large) {
    return (
      <article className="relative overflow-hidden rounded-xl group animate-fade-in shadow-lg">
        {/* Imagen */}
        <div className="aspect-[21/9] md:aspect-[21/8] relative min-h-[260px]">
          {article.coverImageUrl ? (
            <img
              src={article.coverImageUrl}
              alt={article.coverImageAlt ?? article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[hsl(210_18%_10%)] via-[hsl(355_60%_20%)] to-[hsl(210_15%_8%)]" />
          )}
          {/* Gradiente de lectura */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

          {/* Línea carmesí decorativa */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[hsl(355_72%_38%)]" />
        </div>

        {/* Contenido superpuesto */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
          {/* Categoría */}
          <Link href={`/categoria/${article.category?.slug ?? ""}`}>
            <span
              className="inline-block text-xs font-sans-ui font-semibold px-3 py-1 rounded text-white uppercase tracking-widest mb-4 hover:opacity-85 transition-opacity"
              style={{ backgroundColor: article.category?.color ?? "#C0392B" }}
            >
              {article.category?.name}
            </span>
          </Link>

          {/* Título */}
          <Link href={`/articulo/${article.slug}`}>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight mb-3 hover:text-[hsl(355_72%_78%)] transition-colors">
              {article.title}
            </h1>
          </Link>

          {/* Resumen */}
          <p className="text-[hsl(35_20%_82%)] font-serif text-base md:text-lg leading-relaxed mb-5 max-w-3xl line-clamp-2 hidden sm:block">
            {article.summary}
          </p>

          {/* Meta + CTA */}
          <div className="flex flex-wrap items-center gap-3 md:gap-5">
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm font-sans-ui text-[hsl(35_15%_62%)]">
              <span className="flex items-center gap-1.5">
                <User size={12} />
                {article.authorName}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">
                {format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
              <span className="sm:hidden">
                {format(date, "d MMM yyyy", { locale: es })}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {article.readingTime} min
              </span>
            </div>

            <Link
              href={`/articulo/${article.slug}`}
              className="ml-auto flex items-center gap-2 font-sans-ui text-sm font-semibold text-white bg-[hsl(355_72%_38%)] hover:bg-[hsl(355_72%_46%)] px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Leer más <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  /* ── Tarjeta destacada secundaria ── */
  return (
    <article className="relative overflow-hidden rounded-xl group article-card animate-fade-in-up shadow-md">
      <div className="aspect-[4/3] relative">
        {article.coverImageUrl ? (
          <img
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[hsl(210_15%_15%)] to-[hsl(355_72%_30%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/30 to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5">
        <Link href={`/categoria/${article.category?.slug ?? ""}`}>
          <span
            className="inline-block text-[11px] font-sans-ui font-semibold px-2.5 py-0.5 rounded text-white uppercase tracking-widest mb-2 hover:opacity-85 transition-opacity"
            style={{ backgroundColor: article.category?.color ?? "#C0392B" }}
          >
            {article.category?.name}
          </span>
        </Link>

        <Link href={`/articulo/${article.slug}`}>
          <h2 className="font-display text-lg font-bold text-white leading-snug hover:text-[hsl(355_72%_78%)] transition-colors mb-2 line-clamp-3">
            {article.title}
          </h2>
        </Link>

        <div className="flex items-center gap-3 text-xs font-sans-ui text-[hsl(35_15%_62%)]">
          <span>{format(date, "d MMM yyyy", { locale: es })}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {article.readingTime} min
          </span>
        </div>
      </div>
    </article>
  );
}
