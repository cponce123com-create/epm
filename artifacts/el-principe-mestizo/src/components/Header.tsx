import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useGetArticles, useGetPublicSettings, useGetCategories } from "@workspace/api-client-react";

function Crest({ size = 54, color = "#7A1F1F" }: { size?: number; color?: string }) {
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
  const [menuOpen, setMenuOpen]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ]       = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [location, navigate] = useLocation();
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef     = useRef<HTMLDivElement>(null);

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
      if (searchRef.current?.contains(e.target as Node)) return;
      setSearchOpen(false); setSearchQ(""); setDebouncedQ("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const { data: latestData }   = useGetArticles({ page: 1, limit: 5 });
  const { data: liveData, isLoading: liveLoading } = useGetArticles(
    { search: debouncedQ, limit: 5 } as any,
    // @ts-ignore
    { enabled: debouncedQ.length >= 2 }
  );
  const liveArticles: any[]        = (liveData as any)?.articles ?? [];
  const { data: siteSettings }     = useGetPublicSettings();
  const { data: allCategories }    = useGetCategories();

  const s = siteSettings as any;
  const siteName = (s?.siteName || "El Príncipe Mestizo").trim();
  const rawLogo  = (s?.logoUrl ?? "").trim();
  const logoUrl  = rawLogo.startsWith("https://") && !rawLogo.includes("picsum.photos") ? rawLogo : "";
  const [logoErr, setLogoErr] = useState(false);
  useEffect(() => { setLogoErr(false); }, [logoUrl]);

  const [exchangeRate, setExchangeRate] = useState<string>("");
  useEffect(() => {
    // Usamos el proxy de CORS o intentamos directamente si el entorno lo permite
    // Dado que es un archivo .txt simple, podemos parsearlo fácilmente
    fetch("https://www.sunat.gob.pe/a/txt/tipoCambio.txt")
      .then(r => r.text())
      .then(text => {
        // Formato esperado: "04/05/2026|3.512|3.521|"
        const parts = text.split('|');
        if (parts.length >= 3) {
          const compra = parts[1];
          const venta = parts[2];
          setExchangeRate(`USD/PEN · Compra: ${compra} Venta: ${venta}`);
        }
      })
      .catch(() => {
        // Fallback a la API anterior si falla SUNAT (por temas de CORS en el navegador)
        fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json")
          .then(r => r.json())
          .then(d => { const pen = d?.usd?.pen; if (pen) setExchangeRate(`USD/PEN · ${Number(pen).toFixed(2)}`); })
          .catch(() => {});
      });
  }, []);

  const latestArticles: any[] = (latestData as any)?.articles ?? [];

  /* ── Datos del strip superior ── */
  const today = format(new Date(), "EEEE · d 'de' MMMM 'de' yyyy", { locale: es }).toUpperCase();
  const edicion = s?.edicionNumero ? `· EDICIÓN Nº ${s.edicionNumero} · AÑO ${s.anoNumero ?? "I"}` : "· PERIODISMO CIUDADANO";
  const clima   = s?.climaTexto   || "San Ramón · Chanchamayo";
  const tipo    = s?.climaTipo    || "";
  const tipoCambio = s?.tipoCambio || "";

  /* ── Nav ── */
  const navLinks = [
    { label: "Inicio",        href: "/" },
    { label: "Denuncia",      href: "/categoria/denuncia" },
    { label: "Investigación", href: "/categoria/investigacion" },
    { label: "Opinión",       href: "/categoria/opinion" },
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

  const isActive  = (href: string) => href === "/" ? location === "/" : location.startsWith(href);
  const closeSearch = () => { setSearchOpen(false); setSearchQ(""); setDebouncedQ(""); };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { navigate(`/buscar?q=${encodeURIComponent(searchQ.trim())}`); closeSearch(); }
  };
  const openDrop  = (href: string) => { if (dropdownTimer.current) clearTimeout(dropdownTimer.current); setOpenDropdown(href); };
  const closeDrop = () => { dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 180); };
  const keepDrop  = (href: string) => { if (dropdownTimer.current) clearTimeout(dropdownTimer.current); setOpenDropdown(href); };

  /* Ticker */
  const tickerItems = latestArticles.length > 0
    ? [...latestArticles, ...latestArticles].map((a: any) => a.title)
    : [];

  return (
    <>
      {/* ══ STRIP SUPERIOR ══════════════════════════════════════ */}
      <div style={{
        background: "#15140F",
        borderBottom: "1px solid #7A1F1F",
      }}>
        <div className="max-w-7xl mx-auto" style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Izquierda: fecha completa (sm+) / abreviada (móvil) */}
          <span className="epm-mono" style={{ fontSize: 11, color: "rgba(244,240,231,0.65)", letterSpacing: "0.1em" }}>
            <span className="hidden sm:inline">{today} {edicion}</span>
            <span className="sm:hidden">{format(new Date(), "EEE d MMM yyyy", { locale: es }).toUpperCase()}</span>
          </span>
          {/* Derecha: clima (md+) · tipo de cambio (sm+) · EN VIVO siempre */}
          <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {clima && (
              <span className="epm-mono hidden md:inline" style={{ fontSize: 11, color: "rgba(244,240,231,0.55)", letterSpacing: "0.08em" }}>
                {clima}{tipo ? ` · ${tipo}` : ""}
              </span>
            )}
            {(exchangeRate || tipoCambio) && (
              <span className="epm-mono" style={{ fontSize: 11, color: "rgba(244,240,231,0.55)", letterSpacing: "0.08em" }}>
                <span className="hidden sm:inline">{exchangeRate || tipoCambio}</span>
                <span className="sm:hidden">{exchangeRate ? (exchangeRate.includes('Compra') ? `USD/PEN: ${exchangeRate.split('Venta: ')[1]}` : exchangeRate.split(' · ')[0]) : tipoCambio}</span>
              </span>
            )}
            <span className="epm-mono" style={{ fontSize: 11, color: "#7A1F1F", display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.12em" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7A1F1F", display: "inline-block", animation: "blink 1.5s ease-in-out infinite" }} />
              EN VIVO
            </span>
          </span>
        </div>
      </div>

      {/* ══ MASTHEAD ════════════════════════════════════════════ */}
      <header className="epm-masthead" style={{
        background: "#15140F",
        borderBottom: "4px double #7A1F1F",
      }}>
        {/* ── 3 columnas: izquierda · centro · derecha ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, maxWidth: 1280, margin: "0 auto", padding: "0 8px" }}>

          {/* IZQUIERDA: Secciones + búsqueda */}
          <div className="epm-masthead-col" style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
            {/* Botón Secciones (mobile: solo ícono; desktop: ícono + texto) */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="epm-mono"
              style={{ background: "transparent", border: "1px solid rgba(244,240,231,0.25)", color: "#F4F0E7", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              aria-label="Secciones">
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
              <span className="hidden lg:inline" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Secciones</span>
            </button>

            <div className="hidden lg:block" ref={searchRef} style={{ position: "relative" }}>
              {searchOpen ? (
                <>
                  <form onSubmit={handleSearch} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(244,240,231,0.07)", border: "none",
                    padding: "10px 12px",
                  }}>
                    <Search size={14} style={{ color: "rgba(244,240,231,0.6)" }} />
                    <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                      placeholder="Buscar…"
                      style={{ background: "transparent", border: "none", outline: "none", color: "#F4F0E7", fontSize: 12, width: 160, fontFamily: "var(--app-font-sans)" }} />
                    <button type="button" onClick={closeSearch} style={{ background: "none", border: "none", color: "rgba(244,240,231,0.5)", cursor: "pointer" }}><X size={12} /></button>
                  </form>
                  {debouncedQ.length >= 2 && (
                    <LiveSearchDropdown query={debouncedQ} articles={liveArticles} isLoading={liveLoading} onClose={closeSearch} />
                  )}
                </>
              ) : (
                <button onClick={() => setSearchOpen(true)}
                  style={{ background: "transparent", border: "none", color: "rgba(244,240,231,0.65)", cursor: "pointer", padding: 8 }}>
                  <Search size={16} />
                </button>
              )}
            </div>
          </div>

          {/* CENTRO: Crest · Logo + Título · Crest */}
          <div style={{ textAlign: "center", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <span className="hidden sm:block"><Crest size={48} color="#7A1F1F" /></span>
            <Link href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {logoUrl && !logoErr && (
                <img
                  src={logoUrl}
                  alt={siteName}
                  fetchPriority="high"
                  style={{ height: "clamp(32px, 8vw, 52px)", width: "auto", objectFit: "contain", marginBottom: 8 }}
                  onError={() => setLogoErr(true)}
                />
              )}
              <div style={{
                fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
                fontWeight: 400,
                fontSize: "clamp(1.6rem, 5vw, 4rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.012em",
                color: "#F4F0E7",
              }}>
                {siteName}
              </div>
              <div className="epm-mono hidden sm:block" style={{
                fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase",
                marginTop: 10, color: "rgba(244,240,231,0.55)",
              }}>
                Periodismo ciudadano · San Ramón · Chanchamayo · Perú
              </div>
            </Link>
            <span className="hidden sm:block"><Crest size={48} color="#7A1F1F" /></span>
          </div>

          {/* DERECHA: Iniciar sesión + Apoyar */}
          <div className="epm-masthead-col" style={{ display: "flex", gap: 6, flex: "0 0 auto", justifyContent: "flex-end", alignItems: "center" }}>
            {/* Mobile search */}
            <button onClick={() => setSearchOpen(!searchOpen)} className="lg:hidden"
              style={{ background: "transparent", border: "none", color: "rgba(244,240,231,0.7)", cursor: "pointer", padding: 6 }}
              aria-label="Buscar"><Search size={18} /></button>

            <Link href="/admin/login" className="hidden lg:flex epm-mono"
              style={{ background: "transparent", border: "1px solid rgba(244,240,231,0.25)", color: "#F4F0E7", padding: "10px 14px", cursor: "pointer", fontSize: 12, textDecoration: "none", alignItems: "center" }}>
              Iniciar sesión
            </Link>
            
            {/* Apoyar Button: Hidden on very small screens, shown as icon on small, full on large */}
            <Link href="/acerca-de" 
              className="epm-mono"
              style={{ 
                background: "#7A1F1F", border: "none", color: "#fff", 
                padding: "10px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600, 
                textDecoration: "none", display: "flex", alignItems: "center", 
                fontFamily: "var(--app-font-sans)",
                borderRadius: "2px"
              }}>
              <span className="hidden sm:inline">Apoyar →</span>
              <span className="sm:hidden">Apoyar</span>
            </Link>
          </div>
        </div>

        {/* ── NAV DESKTOP (dentro del masthead, debajo del título) ── */}
        <nav className="hidden lg:flex" style={{
          justifyContent: "center", gap: 36,
          paddingTop: 20,
          borderTop: "1px solid rgba(244,240,231,0.1)",
          maxWidth: 1280, margin: "24px auto 0", paddingBottom: 0,
        }}>
          {navLinks.map((link, i) => {
            const slug     = link.href.replace("/categoria/", "");
            const children = getChildren(slug);
            const active   = isActive(link.href);
            const isOpen   = openDropdown === link.href;
            return (
              <div key={link.href} style={{ position: "relative" }}
                onMouseEnter={() => children.length > 0 && openDrop(link.href)}
                onMouseLeave={() => children.length > 0 && closeDrop()}>
                <Link href={link.href} className="epm-navlink"
                  style={{
                    fontFamily: "var(--app-font-sans)",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    letterSpacing: "0.04em",
                    color: active ? "#fff" : "rgba(244,240,231,0.85)",
                    textDecoration: "none",
                    display: "block",
                    paddingBottom: 20,
                  }}>
                  {link.label}
                </Link>

                {children.length > 0 && isOpen && (
                  <div style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                    minWidth: 190, zIndex: 200, borderTop: "3px solid #7A1F1F",
                  }}
                    onMouseEnter={() => keepDrop(link.href)}
                    onMouseLeave={() => closeDrop()}>
                    {children.map((child, ci) => (
                      <Link key={child.id} href={`/categoria/${child.slug}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "11px 16px", fontSize: 13,
                          fontFamily: "var(--app-font-sans)", fontWeight: 500,
                          color: "#15140F", textDecoration: "none",
                          borderBottom: ci < children.length - 1 ? "1px solid #f0ece0" : "none",
                        }}
                        className="hover:bg-stone-50">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: child.color ?? "#7A1F1F", flexShrink: 0 }} />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Mobile search expandido */}
        {searchOpen && (
          <div className="lg:hidden px-4 pt-3 pb-1" style={{ position: "relative" }}>
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
                  style={{ background: "none", border: "none", color: "rgba(244,240,231,0.5)", cursor: "pointer" }}>
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

      {/* ══ MENÚ MÓVIL ══════════════════════════════════════════ */}
      <div style={{
        overflow: "hidden",
        maxHeight: menuOpen ? "600px" : "0",
        transition: "max-height 0.3s ease",
        background: "#1D1B16",
      }} className="lg:hidden">
        <nav style={{ padding: "8px 0" }}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              style={{
                display: "block", padding: "12px 20px",
                fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 500,
                color: isActive(link.href) ? "#fff" : "rgba(244,240,231,0.75)",
                textDecoration: "none", letterSpacing: "0.03em",
                borderBottom: "1px solid rgba(244,240,231,0.06)",
              }}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* También el panel "Secciones" desktop (drawer lateral) */}
      {menuOpen && (
        <div className="hidden lg:block" style={{ position: "fixed", inset: 0, zIndex: 400 }}
          onClick={() => setMenuOpen(false)}>
          <div style={{
            position: "absolute", top: 0, left: 0, width: 280, height: "100%",
            background: "#15140F", boxShadow: "4px 0 32px rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column",
          }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "22px 24px", borderBottom: "1px solid rgba(244,240,231,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#F4F0E7" }}>Secciones</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: "#F4F0E7", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block", padding: "13px 24px",
                    fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 500,
                    color: isActive(link.href) ? "#fff" : "rgba(244,240,231,0.75)",
                    textDecoration: "none", borderBottom: "1px solid rgba(244,240,231,0.06)",
                  }}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ══ TICKER ══════════════════════════════════════════════ */}
      {tickerItems.length > 0 && (
        <div style={{
          background: "#7A1F1F", display: "flex", alignItems: "center",
          overflow: "hidden", height: 38,
        }}>
          <div className="epm-mono" style={{
            background: "#3D1010", color: "#fff",
            padding: "0 18px", height: "100%",
            display: "flex", alignItems: "center", gap: 7,
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", flexShrink: 0,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", boxShadow: "0 0 6px #fff", animation: "blink 1.5s ease-in-out infinite" }} />
            Última hora
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div className="epm-ticker-inner epm-mono" style={{
              display: "flex", gap: 48, whiteSpace: "nowrap",
              padding: "0 24px", fontSize: 11, letterSpacing: "0.05em", color: "#fff",
            }}>
              {tickerItems.map((t: string, i: number) => <span key={i}>● {t}</span>)}
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
}: { query: string; articles: any[]; isLoading: boolean; onClose: () => void; mobile?: boolean }) {
  return (
    <div style={{
      position: "absolute",
      top: mobile ? "calc(100% + 4px)" : "calc(100% + 8px)",
      left: 0, right: mobile ? 0 : "auto",
      minWidth: mobile ? undefined : "360px",
      background: "#fff", boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      zIndex: 300, borderTop: "3px solid #7A1F1F",
    }}>
      {isLoading ? (
        <div style={{ padding: "14px 16px", fontSize: 13, color: "#888", fontFamily: "var(--app-font-sans)" }}>Buscando…</div>
      ) : articles.length === 0 ? (
        <div style={{ padding: "14px 16px", fontSize: 13, color: "#888", fontFamily: "var(--app-font-sans)" }}>
          Sin resultados para "<strong>{query}</strong>"
        </div>
      ) : (
        <>
          {articles.map((a: any) => {
            const date = a.publishedAt ? new Date(a.publishedAt) : new Date(a.createdAt);
            return (
              <Link key={a.id} href={`/articulo/${a.slug}`} onClick={onClose}
                style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", textDecoration: "none", borderBottom: "1px solid #f0ece0" }}
                className="hover:bg-stone-50">
                {a.coverImageUrl && (
                  <img src={a.coverImageUrl} alt={a.title} style={{ width: 52, height: 39, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--app-font-mono)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: a.category?.color ?? "#7A1F1F" }}>
                    {a.category?.name}
                  </span>
                  <p style={{ margin: "2px 0", fontSize: 13, fontFamily: "var(--app-font-sans)", fontWeight: 600, color: "#15140F", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {a.title}
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
