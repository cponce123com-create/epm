import { Link } from "wouter";
import { useGetMostRead, useGetCategories } from "@workspace/api-client-react";

function SidebarSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="w-7 h-7 skeleton-shimmer rounded shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 skeleton-shimmer rounded" />
            <div className="h-3 skeleton-shimmer rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { data: mostRead, isLoading: loadingMR } = useGetMostRead();
  const { data: categories, isLoading: loadingCats } = useGetCategories();

  return (
    <aside>

      {/* Publicidad rectangular */}
      <div className="mb-6">
        <div className="ad-slot ad-slot--rectangle">
          <span className="text-xs mt-6">300 × 250</span>
        </div>
      </div>

      {/* Lo más leído */}
      <div className="sidebar-block">
        <div className="sidebar-block__title">Lo más leído</div>
        {loadingMR ? (
          <SidebarSkeleton />
        ) : (
          <ol>
            {mostRead?.slice(0, 6).map((article, i) => (
              <li key={article.id} className="sidebar-item">
                <span className="sidebar-item__num">{i + 1}</span>
                <div className="min-w-0">
                  <Link
                    href={`/articulo/${article.slug}`}
                    className="sidebar-item__title block hover:text-red-700 transition-colors"
                  >
                    {article.title}
                  </Link>
                  {article.category && (
                    <span
                      className="text-[10px] font-sans-ui font-semibold uppercase tracking-wide mt-1 block"
                      style={{ color: article.category.color ?? "#C0392B" }}
                    >
                      {article.category.name}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Categorías */}
      <div className="sidebar-block">
        <div className="sidebar-block__title">Categorías</div>
        {loadingCats ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 skeleton-shimmer rounded" />
            ))}
          </div>
        ) : (
          <ul>
            {categories?.map(cat => (
              <li key={cat.id}>
                <Link
                  href={`/categoria/${cat.slug}`}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0 group"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-sans-ui text-[13px] font-medium text-gray-700 group-hover:text-red-700 transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-sans-ui text-gray-400 font-medium group-hover:text-red-500 transition-colors">
                    {cat.articleCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Segunda publicidad */}
      <div className="sidebar-block" style={{ borderTop: "none", paddingTop: 0 }}>
        <div className="ad-slot ad-slot--rectangle">
          <span className="text-xs mt-6">300 × 250</span>
        </div>
      </div>

    </aside>
  );
}
