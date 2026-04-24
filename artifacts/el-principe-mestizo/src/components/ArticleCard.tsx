import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock } from "lucide-react";
import type { Article } from "@workspace/api-client-react";

interface Props {
  article: Article;
}

export default function ArticleCard({ article }: Props) {
  const date = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);

  return (
    <article className="bg-card rounded-lg overflow-hidden border border-card-border hover:shadow-md transition-shadow group">
      {article.coverImageUrl && (
        <Link href={`/articulo/${article.slug}`}>
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={article.coverImageUrl}
              alt={article.coverImageAlt ?? article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-sans-ui font-medium px-2 py-0.5 rounded text-white uppercase tracking-wide"
            style={{ backgroundColor: article.category?.color ?? "#333" }}
          >
            {article.category?.name}
          </span>
        </div>
        <Link href={`/articulo/${article.slug}`}>
          <h2 className="font-display text-lg font-semibold leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-3">
            {article.title}
          </h2>
        </Link>
        <p className="text-sm text-muted-foreground font-serif leading-relaxed line-clamp-2 mb-4">
          {article.summary}
        </p>
        <div className="flex items-center gap-3 text-xs font-sans-ui text-muted-foreground">
          <span>{format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
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
