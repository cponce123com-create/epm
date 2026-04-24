import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, User } from "lucide-react";
import type { Article } from "@workspace/api-client-react";

interface Props {
  article: Article;
  /** Índice de la tarjeta para animar en cascada (0-5) */
  index?: number;
}

export default function ArticleCard({ article, index = 0 }: Props) {
  const date = article.publishedAt
    ? new Date(article.publishedAt)
    : new Date(article.createdAt);

  const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

  return (
    <article
      className={`article-card animate-fade-in-up ${staggerClass} bg-card rounded-xl overflow-hidden border border-card-border group flex flex-col`}
    >
      {/* Imagen de portada */}
      <Link href={`/articulo/${article.slug}`} className="block overflow-hidden">
        <div className="aspect-[16/9] overflow-hidden bg-muted">
          {article.coverImageUrl ? (
            <img
              src={article.coverImageUrl}
              alt={article.coverImageAlt ?? article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[hsl(210_15%_18%)] to-[hsl(355_60%_28%)] flex items-center justify-center">
              <span className="font-display text-4xl text-white/20 font-bold select-none">
                EPM
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-1">
        {/* Categoría */}
        <div className="mb-3">
          <Link href={`/categoria/${article.category?.slug ?? ""}`}>
            <span
              className="inline-block text-[11px] font-sans-ui font-semibold px-2.5 py-0.5 rounded text-white uppercase tracking-wider hover:opacity-85 transition-opacity"
              style={{ backgroundColor: article.category?.color ?? "#C0392B" }}
            >
              {article.category?.name}
            </span>
          </Link>
        </div>

        {/* Título */}
        <Link href={`/articulo/${article.slug}`} className="flex-1">
          <h2 className="font-display text-[1.05rem] font-semibold leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-3">
            {article.title}
          </h2>
        </Link>

        {/* Resumen */}
        <p className="text-sm text-muted-foreground font-serif leading-relaxed line-clamp-2 mb-4">
          {article.summary}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] font-sans-ui text-muted-foreground mt-auto pt-3 border-t border-border">
          <span className="flex items-center gap-1">
            <User size={11} />
            {article.authorName}
          </span>
          <span className="text-border">·</span>
          <span>{format(date, "d MMM yyyy", { locale: es })}</span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1 ml-auto">
            <Clock size={11} />
            {article.readingTime} min
          </span>
        </div>
      </div>
    </article>
  );
}
