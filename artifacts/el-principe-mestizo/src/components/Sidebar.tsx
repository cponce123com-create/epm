import { Link } from "wouter";
import { TrendingUp, Tag } from "lucide-react";
import { useGetMostRead, useGetCategories } from "@workspace/api-client-react";

export default function Sidebar() {
  const { data: mostRead } = useGetMostRead();
  const { data: categories } = useGetCategories();

  return (
    <aside className="space-y-8">
      {/* Most read */}
      <div className="bg-card border border-card-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="font-display font-semibold text-base">Lo más leído</h3>
        </div>
        <ol className="space-y-4">
          {mostRead?.slice(0, 5).map((article, i) => (
            <li key={article.id} className="flex gap-3">
              <span className="font-display text-2xl font-bold text-muted-foreground/40 leading-none mt-0.5 w-6 shrink-0">
                {i + 1}
              </span>
              <div>
                <Link
                  href={`/articulo/${article.slug}`}
                  className="font-display text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-2"
                >
                  {article.title}
                </Link>
                <span
                  className="inline-block text-xs px-1.5 py-0.5 rounded text-white mt-1 font-sans-ui"
                  style={{ backgroundColor: article.category?.color ?? "#333" }}
                >
                  {article.category?.name}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Categories */}
      <div className="bg-card border border-card-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={16} className="text-primary" />
          <h3 className="font-display font-semibold text-base">Categorías</h3>
        </div>
        <ul className="space-y-2">
          {categories?.map(cat => (
            <li key={cat.id}>
              <Link
                href={`/categoria/${cat.slug}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:text-primary transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-sans-ui text-sm">{cat.name}</span>
                </div>
                <span className="text-xs font-sans-ui text-muted-foreground group-hover:text-primary transition-colors">
                  {cat.articleCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Ad slot */}
      <div className="bg-muted border border-border rounded-lg p-5 text-center">
        <p className="text-xs font-sans-ui text-muted-foreground uppercase tracking-widest mb-2">Publicidad</p>
        <div className="bg-background rounded h-[250px] flex items-center justify-center border border-dashed border-border">
          <p className="text-xs text-muted-foreground font-sans-ui">Espacio publicitario</p>
        </div>
      </div>
    </aside>
  );
}
