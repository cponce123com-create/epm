import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useGetMostRead, useGetCategories, useGetPublicSettings, useGetArticles } from "@workspace/api-client-react";
import AdSlot from "@/components/AdSlot";

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

function AdBanner({ url, link, alt }: { url: string; link?: string; alt?: string }) {
  if (!url) return (
    <div className="ad-slot ad-slot--rectangle">
      <span className="text-xs mt-6">Publicidad 300 × 250</span>
    </div>
  );
  const img = (
    <img
      src={url}
      alt={alt || "Publicidad"}
      className="w-full h-auto rounded object-cover"
      style={{ maxHeight: "300px" }}
    />
  );
  if (link) return (
    <a href={link} target="_blank" rel="noopener noreferrer sponsored" className="block hover:opacity-90 transition-opacity">
      {img}
    </a>
  );
  return <div>{img}</div>;
}

/* ── Íconos SVG inline (Facebook / X-Twitter) ── */
function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.013 1.792-4.674 4.533-4.674 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.927-1.956 1.879v2.246h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}
function IconTwitter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function Sidebar() {
  const { data: mostRead, isLoading: loadingMR } = useGetMostRead();
  const { data: categories, isLoading: loadingCats } = useGetCategories();
  const { data: settings } = useGetPublicSettings();
  const { data: latestPage } = useGetArticles({ limit: 5 } as any);
  const s = settings as any;

  const latestArticles = (latestPage as any)?.articles ?? [];
  const facebookUrl = s?.facebookUrl ?? "";
  const twitterUrl  = s?.twitterUrl  ?? "";

  return (
    <aside>

      {/* Banner 1 */}
      <div className="mb-6">
        <AdBanner url={s?.adBanner1Url ?? ""} link={s?.adBanner1Link} alt={s?.adBanner1Alt} />
      </div>

      {/* Últimas noticias */}
      {latestArticles.length > 0 && (
        <div className="sidebar-block">
          <div className="sidebar-block__title">Últimas noticias</div>

          <div>
            {latestArticles.map((article: any) => {
              const date = article.publishedAt
                ? new Date(article.publishedAt)
                : new Date(article.createdAt);
              return (
                <Link
                  key={article.id}
                  href={`/articulo/${article.slug}`}
                  className="flex gap-2.5 py-2.5 border-b border-border last:border-0 group items-start"
                  style={{ textDecoration: "none" }}
                >
                  {article.coverImageUrl && (
                    <img
                      src={article.coverImageUrl}
                      alt={article.title}
                      className="object-cover rounded shrink-0"
                      style={{ width: 60, height: 45 }}
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0">
                    <span
                      className="block text-[10px] font-sans-ui font-semibold uppercase tracking-wide"
                      style={{ color: article.category?.color ?? "#C0392B" }}
                    >
                      {article.category?.name}
                    </span>
                    <p className="font-display text-[0.78rem] font-semibold leading-tight text-gray-800 group-hover:text-red-700 transition-colors line-clamp-2 mt-0.5 mb-0.5">
                      {article.title}
                    </p>
                    <span className="text-[10px] font-sans-ui text-gray-400">
                      {format(date, "d MMM", { locale: es })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link
            href="/"
            className="block text-[11px] font-sans-ui font-semibold text-red-700 hover:text-red-900 mt-2 transition-colors"
          >
            Ver todas las noticias →
          </Link>
        </div>
      )}

      {/* Lo más leído */}
      <div className="sidebar-block">
        <div className="sidebar-block__title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#7A1F1F" aria-hidden="true"><path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-5 1 1 2 1 3-4Z"/></svg>
          Lo más leído
        </div>
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
                    className="sidebar-item__title block"
                  >
                    {article.title}
                  </Link>
                  {article.category && (
                    <span
                      className="epm-mono mt-1 block"
                      style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: article.category.color ?? "#7A1F1F" }}
                    >
                      {article.category.name} · {(article as any).views?.toLocaleString("es-PE") ?? ""} lecturas
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Banner 2 */}
      {s?.adBanner2Url && (
        <div className="sidebar-block" style={{ borderTop: "none", paddingTop: 0 }}>
          <AdBanner url={s.adBanner2Url} link={s.adBanner2Link} alt={s.adBanner2Alt} />
        </div>
      )}

      {/* Síguenos */}
      {(facebookUrl || twitterUrl) && (
        <div className="sidebar-block">
          <div className="sidebar-block__title">Síguenos</div>
          <div className="flex flex-col gap-2">
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded transition-colors"
                style={{ background: "#1877F2", color: "#fff" }}
                aria-label="Síguenos en Facebook"
                onMouseEnter={e => (e.currentTarget.style.background = "#1565d8")}
                onMouseLeave={e => (e.currentTarget.style.background = "#1877F2")}
              >
                <IconFacebook />
                <div>
                  <div className="font-sans-ui text-[13px] font-semibold">Facebook</div>
                  <div className="font-sans-ui text-[10px] opacity-80">Síguenos en Facebook</div>
                </div>
              </a>
            )}
            {twitterUrl && (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded transition-colors"
                style={{ background: "#000", color: "#fff" }}
                aria-label="Síguenos en Twitter / X"
                onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
                onMouseLeave={e => (e.currentTarget.style.background = "#000")}
              >
                <IconTwitter />
                <div>
                  <div className="font-sans-ui text-[13px] font-semibold">Twitter / X</div>
                  <div className="font-sans-ui text-[10px] opacity-70">Síguenos en X</div>
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Categorías */}
      <div className="sidebar-block">
        <div className="sidebar-block__title">Explorar por sección</div>
        {loadingCats ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 skeleton-shimmer rounded" />
            ))}
          </div>
        ) : (
          <ul>
            {categories?.filter(c => !(c as any).parentId && c.articleCount > 0).map(cat => {
              const children = categories.filter(c => (c as any).parentId === cat.id && c.articleCount > 0);
              return (
                <li key={cat.id}>
                  <Link
                    href={`/categoria/${cat.slug}`}
                    className="flex items-center justify-between py-2.5 border-b border-border group"
                    style={{ textDecoration: "none" }}
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
                  {children.length > 0 && (
                    <ul className="pl-5 mb-1">
                      {children.map(child => (
                        <li key={child.id}>
                          <Link
                            href={`/categoria/${child.slug}`}
                            className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0 group"
                            style={{ textDecoration: "none" }}
                          >
                            <span className="font-sans-ui text-[12px] text-gray-500 group-hover:text-red-700 transition-colors">
                              {child.name}
                            </span>
                            <span className="text-[10px] font-sans-ui text-gray-300 group-hover:text-red-400 transition-colors">
                              {child.articleCount}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Banner 3 */}
      {s?.adBanner3Url ? (
        <div className="sidebar-block" style={{ borderTop: "none", paddingTop: 0 }}>
          <AdBanner url={s.adBanner3Url} link={s.adBanner3Link} alt={s.adBanner3Alt} />
        </div>
      ) : (
        <div className="sidebar-block">
          <AdSlot format="rectangle" />
        </div>
      )}

    </aside>
  );
}
