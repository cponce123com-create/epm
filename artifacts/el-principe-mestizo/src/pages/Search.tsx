import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search as SearchIcon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useGetArticles } from "@workspace/api-client-react";

export default function Search() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isLoading } = useGetArticles(
    { search: debouncedQuery, limit: 20 },
  // @ts-ignore
    { enabled: debouncedQuery.length > 1 }
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-display text-2xl font-bold mb-6">Buscar artículos</h1>

        {/* Search input */}
        <div className="relative mb-8">
          <SearchIcon
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar en El Príncipe Mestizo..."
            className="w-full pl-10 pr-4 py-3 text-base font-serif border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>

        {/* Results */}
        {debouncedQuery.length <= 1 ? (
          <p className="text-sm font-sans-ui text-muted-foreground">Escribe al menos 2 caracteres para buscar.</p>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : results?.articles.length === 0 ? (
          <div className="text-center py-10">
            <p className="font-display text-lg font-semibold mb-2">Sin resultados</p>
            <p className="text-sm font-sans-ui text-muted-foreground">
              No se encontraron artículos para "<span className="font-medium">{debouncedQuery}</span>".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-sans-ui text-muted-foreground mb-2">
              {results?.total} resultado{results?.total !== 1 ? "s" : ""} para "<span className="font-medium text-foreground">{debouncedQuery}</span>"
            </p>
            {results?.articles.map(article => {
              const date = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
              return (
                <article key={article.id} className="bg-card border border-card-border rounded-lg p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-sans-ui font-medium px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: article.category?.color ?? "#333" }}
                    >
                      {article.category?.name}
                    </span>
                    <span className="text-xs font-sans-ui text-muted-foreground">
                      {format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </span>
                  </div>
                  <Link href={`/articulo/${article.slug}`}>
                    <h2 className="font-display font-semibold text-base leading-snug mb-1.5 hover:text-primary transition-colors">
                      {article.title}
                    </h2>
                  </Link>
                  <p className="text-sm font-serif text-muted-foreground leading-relaxed line-clamp-2">
                    {article.summary}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
