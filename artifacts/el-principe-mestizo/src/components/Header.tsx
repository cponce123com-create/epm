import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useGetArticles, useGetPublicSettings, useGetCategories } from "@workspace/api-client-react";

/* ── SVG Escudo / Crest ───────────────────────────────────── */
function Crest({ size = 44, color = "#7A1F1F" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" aria-hidden="true">
      <circle cx="30" cy="30" r="28.5" stroke={color} strokeWidth="1" />
      <path d="M14 22l5-7 4 5 4-8 4 8 4-5 5 7v4H14v-4z" fill={color} />
      <rect x="14" y="28" width="32" height="1" fill={color} />
      <text x="30" y="46" textAnchor="middle" fill={color}
        fontFamily="'DM Serif Display', serif" fontSize="14" fontWeight="400"
        fontStyle="italic">P</text>
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen]       = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQ, setSearchQ]         = useState("");
  const [debouncedQ, setDebouncedQ]   = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [location, navigate]          = useLocation();
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false); setSearchOpen(false);
    setSearchQ(""); setDebouncedQ("");
  }, [location]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ), 320);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (desktopSearchRef.current?.contains(target) || mobileSearchRef.current?.contains(target)) return;
      setSearchOpen(false); setSearchQ(""); setDebouncedQ("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const { data: latestData }        = useGetArticles({ page: 1, limit: 5 });
  const { data: liveData, isLoading: liveLoading } = useGetArticles(
    { search: debouncedQ, limit: 5 } as any,
    // @ts-ignore
    { enabled: debouncedQ.length >= 2 }
  );
  const liveArticles: any[] = (liveData as any)?.articles ?? [];
  const { data: siteSettings }  = useGetPublicSettings();
  const { data: allCategories } = useGetCategories();

  const rawLogoUrl = ((siteSettings as any)?.logoUrl ?? "").trim();
  const siteName   = ((siteSettings as any)?.siteName || "").trim() || "El Príncipe Mestizo";
  const logoUrl    = rawLogoUrl.startsWith("https://") && !rawLogoUrl.includes("picsum.photos") ? rawLogoUrl : "";
  const [logoError, setLogoError] = useState(false);
  useEffect(() => { setLogoError(false); }, [logoUrl]);
  const showLogo = !!logoUrl && !logoError;

  const latestArticles: any[] = (latestData as any)?.articles ?? [];

  const navLinks = [
    { label: "Inicio",        href: "/" },
    { label: "Denuncia",      href: "/categoria/denuncia" },
    { label: "Opinión",       href: "/categoria/opinion" },
    { label: "Investigación", href: "/categoria/investigacion" },
    { label: "Ciudad",        href: "/categoria/ciudad" },
    { label: "Política",      href: "/categoria/politica" },
    { label: "Políticos",     href: "/categoria/politicos" },
    { label: "Acerca de",     href: "/acerca-de" },
  ];

  const getChildren = (slug: string) => {
    const parent = allCategories?.find(c => c.slug === slug);
    if (!parent) return [];
    return allCategories?.filter(c => (c as any).parentId === parent.id) ?? [];
  };

  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);

  const closeSearch = () => { setSearchOpen(false); setSearchQ(""); setDebouncedQ(""); };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { navigate(`/buscar?q=${encodeURIComponent(searchQ.trim())}`); closeSearch(); }
  };

  const openDrop  = (href: string) => { if (dropdownTimer.current) clearTimeout(dropdownTimer.current); setOpenDropdown(href); };
  const closeDrop = () => { dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 180); };
  const keepDrop  = (href: string) => { if (dropdownTimer.current) clearTimeout(dropdownTimer.current); setOpenDropdown(href); };

  const today = format(new Date(), "EEEE · d 'de' MMMM 'de' yyyy", { locale: es });
  const headerTopText = ((siteSettings as any)?.headerTopText || "San Ramón, Chanchamayo · Perú").trim();

  /* Ticker: duplicate list for seamless loop */
  const tickerItems = latestArticles.length > 0
    ? [...latestArticles, ...latestArticles].map(a => a.title)
    : [];

  return (
    <>
      {/* ══ STRIP SUPERIOR ══════════════════════════════════════ */}
      <div style={{ background: "#15140F", borderBottom: "1px solid rgba(122,31,31,0.5)" }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between"
          style={{ height: 36 }}>
          <span className="epm-mono hidden sm:block"
            style={{ fontSize: 10, color: "rgba(244,240,231,0.55)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {today}
          </span>
          <span className="epm-mono"
            style={{ fontSize: 10, color: "rgba(244,240,231,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {headerTopText}
          </span>
          <div className="flex items-center gap-4">
            <Link href="/admin/login"
              style={{ fontSize: 10, color: "rgba(244,240,231,0.45)", fontFamily: "var(--app-font-mono)", letterSpacing: "0.1em" }}
              className="hover:text-white transition-colors hidden sm:block epm-mono">
              ADMIN
            </Link>
          </div>
        </div>
      </div>

      {/* ══ MASTHEAD ════════════════════════════════════════════ */}
      <header style={{
        background: "#15140F",
        padding: "24px 0 20px",
        borderBottom: "4px double #7A1F1F",
      }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

            {/* Izquierda: hamburger móvil + búsqueda desktop */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 140 }}>
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden"
                style={{ background: "transparent", border: "1px solid rgba(244,240,231,0.2)", color: "#F4F0E7", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                aria-label="Menú">
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
                <span className="epm-mono" style={{ fontSize: 10, letterSpacing: "0.12em" }}>SECCIONES</span>
              </button>

              {/* Search desktop */}
              <div className="hidden lg:flex items-center" ref={desktopSearchRef} style={{ position: "relative" }}>
                {searchOpen ? (
                  <>
                    <form onSubmit={handleSearch} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "rgba(244,240,231,0.08)", border: "1px solid rgba(244,240,231,0.2)",
                      padding: "8px 12px",
                    }}>
                      <Search size={13} style={{ color: "#F4F0E7", opacity: 0.6 }} />
                      <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder="Buscar artículos…"
                        style={{ background: "transparent", border: "none", outline: "none", color: "#F4F0E7", fontSize: 12, width: 190, fontFamily: "var(--app-font-sans)" }}
                        className="placeholder:text-stone-500" />
                      <button type="button" onClick={closeSearch} style={{ color: "rgba(244,240,231,0.5)", cursor: "pointer", background: "none", border: "none" }}>
                        <X size={12} />
                      </button>
                    </form>
                    {debouncedQ.length >= 2 && (
                      <LiveSearchDropdown query={debouncedQ} articles={liveArticles} isLoading={liveLoading} onClose={closeSearch} />
                    )}
                  </>
                ) : (
                  <button onClick={() => setSearchOpen(true)}
                    style={{ background: "transparent", border: "1px solid rgba(244,240,231,0.2)", color: "rgba(244,240,231,0.7)", padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    className="epm-mono" aria-label="Buscar">
                    <Search size={13} />
                    <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Buscar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Centro: escudo + título */}
            <div style={{ textAlign: "center", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <Crest size={48} color="#7A1F1F" />
              <Link href="/" style={{ textDecoration: "none" }}>
                {showLogo ? (
                  <img src={logoUrl} alt={siteName} style={{ height: 52, width: "auto", objectFit: "contain" }} onError={() => setLogoError(true)} />
                ) : (
                  <div>
                    <div style={{
                      fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
                      fontSize: "clamp(2.4rem, 5.6vw, 4.5rem)",
                      fontWeight: 400,
                      color: "#F4F0E7",
                      lineHeight: 0.95,
                      letterSpacing: "-0.012em",
                    }}>
                      {siteName}
                    </div>
                    <div className="epm-mono" style={{
                      fontSize: 9, letterSpacing: "0.36em", textTransform: "uppercase",
                      marginTop: 10, color: "rgba(244,240,231,0.55)",
                    }}>
                      Periodismo ciudadano · San Ramón · Perú
                    </div>
                  </div>
                )}
              </Link>
              <Crest size={48} color="#7A1F1F" />
            </div>

            {/* Derecha: search móvil + apoyar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140, justifyContent: "flex-end" }}>
              <button onClick={() => setSearchOpen(!searchOpen)}
                className="lg:hidden"
                style={{ background: "transparent", border: "none", color: "rgba(244,240,231,0.7)", cursor: "pointer", padding: 8 }}
                aria-label={searchOpen ? "Cerrar búsqueda" : "Abrir búsqueda"}>
                <Search size={18} />
              </button>
              <Link href="/acerca-de" className="hidden lg:block"
                style={{ background: "#7A1F1F", color: "#fff", border: "none", padding: "9px 16px", cursor: "pointer", fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                Apoyar →
              </Link>
            </div>
          </div>

          {/* ── Nav desktop (dentro del masthead) ── */}
          <nav className="hidden lg:block" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(244,240,231,0.12)" }}>
            <ul style={{ display: "flex", justifyContent: "center", alignItems: "stretch", margin: 0, padding: 0, listStyle: "none", gap: 0 }}>
              {navLinks.map(link => {
                const slug     = link.href.replace("/categoria/", "");
                const children = getChildren(slug);
                const active   = isActive(link.href);
                const isOpen   = openDropdown === link.href;
                return (
                  <li key={link.href} style={{ position: "relative" }}
                    onMouseEnter={() => children.length > 0 && openDrop(link.href)}
                    onMouseLeave={() => children.length > 0 && closeDrop()}>
                    <Link href={link.href} className="epm-navlink"
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "6px 16px",
                        fontFamily: "var(--app-font-sans)",
                        fontSize: 13, fontWeight: active ? 600 : 500,
                        letterSpacing: "0.04em",
                        color: active ? "#fff" : "rgba(244,240,231,0.82)",
                        textDecoration: "none",
                        opacity: active ? 1 : 0.88,
                      }}>
                      {link.label}
                      {children.length > 0 && (
                        <ChevronDown size={11} style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.7 }} />
                      )}
                    </Link>

                    {/* Dropdown */}
                    {children.length > 0 && isOpen && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0,
                        background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                        minWidth: 200, zIndex: 200,
                        borderTop: "3px solid #7A1F1F",
                      }}
                        onMouseEnter={() => keepDrop(link.href)}
                        onMouseLeave={() => closeDrop()}>
                        {children.map((child, i) => (
                          <Link key={child.id} href={`/categoria/${child.slug}`}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "11px 16px", fontSize: 13,
                              fontFamily: "var(--app-font-sans)", fontWeight: 500,
                              color: "#15140F", textDecoration: "none",
                              borderBottom: i < children.length - 1 ? "1px solid #f0ece0" : "none",
                              transition: "background 0.12s",
                            }}
                            className="hover:bg-stone-50">
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: child.color ?? "#7A1F1F", flexShrink: 0 }} />
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* ── Mobile search expanded ── */}
        {searchOpen && (
          <div className="lg:hidden px-4 pt-3 pb-1" ref={mobileSearchRef} style={{ position: "relative" }}>
            <form onSubmit={handleSearch} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(244,240,231,0.08)", border: "1px solid rgba(244,240,231,0.2)",
              padding: "10px 14px",
            }}>
              <Search size={14} style={{ color: "rgba(244,240,231,0.6)" }} />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Buscar artículos…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#F4F0E7", fontSize: 14, fontFamily: "var(--app-font-sans)" }} />
              {searchQ && (
                <button type="button" onClick={closeSearch}
                  style={{ color: "rgba(244,240,231,0.5)", cursor: "pointer", background: "none", border: "none" }}>
                  <X size={14} />
                </button>
              )}
            </form>
            {debouncedQ.length >= 2 && (
              <LiveSearchDropdown query={debouncedQ} articles={liveArticles} isLoading={liveLoading} onClose={closeSearch} mobile />
            )}
          </div>
        )}
      </header>

      {/* ══ MOBILE MENU ═════════════════════════════════════════ */}
      <div style={{
        overflow: "hidden",
        maxHeight: menuOpen ? "600px" : "0",
        transition: "max-height 0.3s ease",
        background: "#1D1B16",
      }} className="lg:hidden">
        <nav style={{ padding: "8px 0" }}>
          {navLinks.map(link => {
            const slug     = link.href.replace("/categoria/", "");
            const children = getChildren(slug);
            return (
              <div key={link.href}>
                <Link href={link.href}
                  style={{
                    display: "block", padding: "10px 20px",
                    fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 500,
                    color: isActive(link.href) ? "#fff" : "rgba(244,240,231,0.75)",
                    textDecoration: "none", letterSpacing: "0.04em",
                  }}>
                  {link.label}
                </Link>
                {children.length > 0 && (
                  <div style={{ paddingLeft: 32 }}>
                    {children.map(child => (
                      <Link key={child.id} href={`/categoria/${child.slug}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 0", fontSize: 12,
                          fontFamily: "var(--app-font-sans)",
                          color: "rgba(244,240,231,0.55)", textDecoration: "none",
                        }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: child.color ?? "#7A1F1F", flexShrink: 0 }} />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* ══ TICKER ÚLTIMA HORA ══════════════════════════════════ */}
      {tickerItems.length > 0 && (
        <div style={{
          background: "#7A1F1F",
          display: "flex", alignItems: "center",
          overflow: "hidden", borderBottom: "1px solid #3D1010",
          height: 38,
        }}>
          {/* Etiqueta fija */}
          <div className="epm-mono" style={{
            background: "#3D1010", color: "#fff",
            padding: "0 16px", height: "100%",
            display: "flex", alignItems: "center", gap: 7,
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            flexShrink: 0,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", boxShadow: "0 0 6px #fff", animation: "blink 1.5s ease-in-out infinite" }} />
            Última hora
          </div>

          {/* Ticker scrolling */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <div className="epm-ticker-inner epm-mono" style={{
              display: "flex", gap: 48, whiteSpace: "nowrap",
              padding: "0 24px", fontSize: 11, letterSpacing: "0.05em", color: "#fff",
            }}>
              {tickerItems.map((title, i) => (
                <span key={i}>● {title}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Live Search Dropdown ─────────────────────────────────── */
function LiveSearchDropdown({
  query, articles, isLoading, onClose, mobile = false,
}: {
  query: string; articles: any[]; isLoading: boolean; onClose: () => void; mobile?: boolean;
}) {
  return (
    <div style={{
      position: "absolute",
      top: mobile ? "calc(100% + 4px)" : "calc(100% + 8px)",
      left: 0, right: mobile ? 0 : "auto",
      minWidth: mobile ? undefined : "360px",
      background: "#fff",
      boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      zIndex: 300,
      borderTop: "3px solid #7A1F1F",
    }}>
      {isLoading ? (
        <div style={{ padding: "14px 16px", fontSize: 13, color: "#888", fontFamily: "var(--app-font-sans)" }}>Buscando…</div>
      ) : articles.length === 0 ? (
        <div style={{ padding: "14px 16px", fontSize: 13, color: "#888", fontFamily: "var(--app-font-sans)" }}>
          Sin resultados para "<strong>{query}</strong>"
        </div>
      ) : (
        <>
          {articles.map((article: any) => {
            const date = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
            return (
              <Link key={article.id} href={`/articulo/${article.slug}`} onClick={onClose}
                style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "10px 14px", textDecoration: "none",
                  borderBottom: "1px solid #f0ece0", transition: "background 0.1s",
                }}
                className="hover:bg-stone-50">
                {article.coverImageUrl && (
                  <img src={article.coverImageUrl} alt={article.title}
                    style={{ width: 52, height: 39, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--app-font-mono)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: article.category?.color ?? "#7A1F1F" }}>
                    {article.category?.name}
                  </span>
                  <p style={{ margin: "2px 0", fontSize: 13, fontFamily: "var(--app-font-sans)", fontWeight: 600, color: "#15140F", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {article.title}
                  </p>
                  <span style={{ fontSize: 10, fontFamily: "var(--app-font-mono)", color: "#aaa" }}>
                    {format(date, "d MMM yyyy", { locale: es })}
                  </span>
                </div>
              </Link>
            );
          })}
          <Link href={`/buscar?q=${encodeURIComponent(query)}`} onClick={onClose}
            style={{ display: "block", padding: "10px 14px", fontSize: 12, fontFamily: "var(--app-font-sans)", color: "#7A1F1F", fontWeight: 600, textDecoration: "none", background: "#fdf6f0" }}
            className="hover:bg-stone-100">
            Ver todos los resultados para "{query}" →
          </Link>
        </>
      )}
    </div>
  );
}
