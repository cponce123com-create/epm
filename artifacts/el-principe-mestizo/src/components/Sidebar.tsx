import { Link } from "wouter";
import { TrendingUp, Tag, Loader2 } from "lucide-react";
import { useGetMostRead, useGetCategories } from "@workspace/api-client-react";

function SidebarBlock({ title, icon: Icon, children, loading }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
        <Icon size={15} className="text-primary" />
        <h3 className="font-display font-semibold text-base">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 skeleton-shimmer rounded shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 skeleton-shimmer rounded w-full" />
                <div className="h-3 skeleton-shimmer rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : children}
    </div>
  );
}

export default function Sidebar() {
  const { data: mostRead, isLoading: loadingMostRead } = useGetMostRead();
  const { data: categories, isLoading: loadingCats } = useGetCategories();

  return (
    <aside className="space-y-6">

      {/* Lo más leído */}
      <SidebarBlock title="Lo más leído" icon={TrendingUp} loading={loadingMostRead}>
        <ol className="space-y-4">
          {mostRead?.slice(0, 5).map((article, i) => (
            <li key={article.id} className="flex gap-3 group">
              <span className="font-display text-2xl font-bold text-muted-foreground/30 leading-none mt-0.5 w-7 shrink-0 select-none">
                {i + 1}
              </span>
              <div className="min-w-0">
                <Link
                  href={`/articulo/${article.slug}`}
                  className="font-display text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-2 block"
                >
                  {article.title}
                </Link>
                {article.category && (
                  <Link href={`/categoria/${article.category.slug}`}>
                    <span
                      className="inline-block text-[10px] px-1.5 py-0.5 rounded text-white mt-1.5 font-sans-ui font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: article.category.color ?? "#333" }}
                    >
                      {article.category.name}
                    </span>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </SidebarBlock>

      {/* Categorías */}
      <SidebarBlock title="Categorías" icon={Tag} loading={loadingCats}>
        <ul className="space-y-0">
          {categories?.map(cat => (
            <li key={cat.id}>
              <Link
                href={`/categoria/${cat.slug}`}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:text-primary transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-sans-ui text-sm">{cat.name}</span>
                </div>
                <span className="text-xs font-sans-ui text-muted-foreground bg-muted px-2 py-0.5 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {cat.articleCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SidebarBlock>

      {/* Espacio publicitario */}
      <div className="bg-muted border border-dashed border-border rounded-xl p-5 text-center">
        <p className="text-[10px] font-sans-ui text-muted-foreground uppercase tracking-widest mb-3">
          Publicidad
        </p>
        <div className="bg-background rounded-lg h-[250px] flex items-center justify-center border border-border/50">
          <p className="text-xs text-muted-foreground font-sans-ui">
            Espacio publicitario<br />300 × 250
          </p>
        </div>
      </div>
    </aside>
  );
}
