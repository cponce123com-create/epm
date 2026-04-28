import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, ChevronDown } from "lucide-react";
import { useGetArticles, useGetPublicSettings, useGetCategories } from "@workspace/api-client-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [location, navigate] = useLocation();
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: latest } = useGetArticles({ page: 1, limit: 3 });
  const { data: siteSettings } = useGetPublicSettings();
  const { data: allCategories } = useGetCategories();

  const rawLogoUrl = ((siteSettings as any)?.logoUrl ?? "").trim();
  const siteName = ((siteSettings as any)?.siteName || "").trim() || "El Príncipe Mestizo";
  const logoUrl = rawLogoUrl.startsWith("https://") && !rawLogoUrl.includes("picsum.photos") ? rawLogoUrl : "";
  const [logoError, setLogoError] = useState(false);
  useEffect(() => { setLogoError(false); }, [logoUrl]);
  const showLogo = !!logoUrl && !logoError;

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
    return allCategories?.filter(c => c.parentId === parent.id) ?? [];
  };

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchOpen(false);
      setSearchQ("");
    }
  };

  const openDrop = (href: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setOpenDropdown(href);
  };

  const closeDrop = () => {
    dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 180);
  };

  const keepDrop = (href: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setOpenDropdown(href);
  };

  const latestArticles = latest?.articles ?? [];

  return (
    <>
      {/* ── Top utility bar ─────────────────────────────────── */}
      <div style={{ background: "#1a0a0a", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between h-8">
          <span style={{ fontSize: "11px", color: "rgba(255,200,200,0.6)", fontFamily: "sans-serif", letterSpacing: "0.04em" }}>
            {((siteSettings as any)?.headerTopText || "San Ramón, Chanchamayo · Comunicador ciudadano independiente")}
          </span>
          <div className="flex items-center gap-4">
            <Link href="/buscar" style={{ fontSize: "11px", color: "rgba(255,200,200,0.6)", fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: "4px" }} className="hover:text-white transition-colors">
              <Search size={11} /> Buscar
            </Link>
            <Link href="/admin/login" style={{ fontSize: "11px", color: "rgba(255,200,200,0.6)", fontFamily: "sans-serif" }} className="hover:text-white transition-colors hidden sm:block">
              Admin
            </Link>
          </div>
        </div>
      </div>

      {/* ── Brand bar ───────────────────────────────────────── */}
      <div style={{ background: "hsl(355,82%,28%)", padding: "18px 0 14px", borderBottom: "3px solid hsl(355,82%,18%)" }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
          {/* Hamburger mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-white p-1.5 -ml-1.5"
            aria-label="Menú"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo / Name */}
          <Link href="/" className="flex flex-col items-center lg:items-start mx-auto lg:mx-0 group">
            {showLogo ? (
              <img src={logoUrl} alt={siteName} className="h-12 lg:h-14 w-auto object-contain" onError={() => setLogoError(true)} />
            ) : (
              <div className="text-center lg:text-left">
                <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {siteName}
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,200,200,0.7)", letterSpacing: "0.28em", textTransform: "uppercase", marginTop: "4px", fontFamily: "sans-serif" }}>
                  Denuncia · Opinión · Ciudad
                </div>
              </div>
            )}
          </Link>

          {/* Right: search expanded on desktop */}
          <div className="hidden lg:flex items-center gap-3">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white/10 rounded px-3 py-1.5">
                <Search size={14} className="text-red-200" />
                <input
                  autoFocus
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Buscar artículos…"
                  style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "13px", width: "180px", fontFamily: "sans-serif" }}
                  className="placeholder:text-red-300"
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="text-red-300 hover:text-white">
                  <X size={13} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 text-red-200 hover:text-white transition-colors"
                style={{ fontSize: "13px", fontFamily: "sans-serif" }}
              >
                <Search size={15} />
                <span>Buscar</span>
              </button>
            )}
          </div>

          {/* Mobile search */}
          <button onClick={() => setSearchOpen(!searchOpen)} className="lg:hidden text-white p-1.5 -mr-1.5">
            <Search size={20} />
          </button>
        </div>

        {/* Mobile search expanded */}
        {searchOpen && (
          <div className="lg:hidden px-4 pt-2 pb-1">
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white/10 rounded px-3 py-2">
              <Search size={14} className="text-red-200" />
              <input
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Buscar artículos…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "14px", fontFamily: "sans-serif" }}
                className="placeholder:text-red-300"
              />
            </form>
          </div>
        )}
      </div>

      {/* ── Nav bar ─────────────────────────────────────────── */}
      <div
        style={{
          background: "#c0392b",
          borderBottom: "1px solid rgba(0,0,0,0.2)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: scrolled ? "0 2px 16px rgba(0,0,0,0.35)" : "none",
          transition: "box-shadow 0.2s",
        }}
      >
        {/* Desktop nav */}
        <nav className="max-w-7xl mx-auto px-4 lg:px-8 hidden lg:block">
          <ul style={{ display: "flex", alignItems: "stretch", margin: 0, padding: 0, listStyle: "none" }}>
            {navLinks.map(link => {
              const slug = link.href.replace("/categoria/", "");
              const children = getChildren(slug);
              const hasChildren = children.length > 0;
              const active = isActive(link.href);
              const isOpen = openDropdown === link.href;

              return (
                <li
                  key={link.href}
                  style={{ position: "relative" }}
                  onMouseEnter={() => hasChildren && openDrop(link.href)}
                  onMouseLeave={() => hasChildren && closeDrop()}
                >
                  <Link
                    href={link.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "12px 14px",
                      fontSize: "13px",
                      fontWeight: 600,
                      fontFamily: "sans-serif",
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      color: active ? "#fff" : "rgba(255,255,255,0.88)",
                      borderBottom: active ? "3px solid #fff" : "3px solid transparent",
                      textDecoration: "none",
                      transition: "color 0.15s, border-color 0.15s, background 0.15s",
                      background: isOpen ? "rgba(0,0,0,0.15)" : "transparent",
                    }}
                    className="hover:text-white hover:bg-black/10"
                  >
                    {link.label}
                    {hasChildren && (
                      <ChevronDown
                        size={12}
                        style={{
                          transition: "transform 0.2s",
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          opacity: 0.8,
                        }}
                      />
                    )}
                  </Link>

                  {/* Dropdown */}
                  {hasChildren && isOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        background: "#fff",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                        borderRadius: "0 0 8px 8px",
                        minWidth: "200px",
                        zIndex: 200,
                        overflow: "hidden",
                        borderTop: "3px solid #c0392b",
                      }}
                      onMouseEnter={() => keepDrop(link.href)}
                      onMouseLeave={() => closeDrop()}
                    >
                      {children.map((child, i) => (
                        <Link
                          key={child.id}
                          href={`/categoria/${child.slug}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "11px 16px",
                            fontSize: "13px",
                            fontFamily: "sans-serif",
                            fontWeight: 500,
                            color: "#1a1a1a",
                            textDecoration: "none",
                            borderBottom: i < children.length - 1 ? "1px solid #f0f0f0" : "none",
                            transition: "background 0.12s, color 0.12s",
                          }}
                          className="hover:bg-red-50 hover:text-red-700"
                        >
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: child.color ?? "#c0392b",
                              flexShrink: 0,
                            }}
                          />
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

        {/* Mobile menu */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: menuOpen ? "600px" : "0",
            transition: "max-height 0.3s ease",
          }}
          className="lg:hidden"
        >
          <nav style={{ background: "hsl(355,82%,22%)", padding: "8px 0" }}>
            {navLinks.map(link => {
              const slug = link.href.replace("/categoria/", "");
              const children = getChildren(slug);
              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    style={{
                      display: "block",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily: "sans-serif",
                      color: isActive(link.href) ? "#fff" : "rgba(255,255,255,0.8)",
                      textDecoration: "none",
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    {link.label}
                  </Link>
                  {children.length > 0 && (
                    <div style={{ paddingLeft: "32px" }}>
                      {children.map(child => (
                        <Link
                          key={child.id}
                          href={`/categoria/${child.slug}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "7px 0",
                            fontSize: "13px",
                            fontFamily: "sans-serif",
                            color: "rgba(255,220,220,0.8)",
                            textDecoration: "none",
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: child.color ?? "#e74c3c", flexShrink: 0 }} />
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
      </div>

      {/* ── Breaking news ticker ─────────────────────────────── */}
      {latestArticles.length > 0 && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", overflow: "hidden" }}>
          <div className="max-w-7xl mx-auto flex items-center" style={{ height: "36px" }}>
            <div style={{
              background: "#c0392b",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              fontFamily: "sans-serif",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "0 14px",
              height: "100%",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite" }} />
              Lo último
            </div>
            <div style={{ flex: 1, overflow: "hidden", padding: "0 16px" }}>
              <Link
                href={`/articulo/${latestArticles[0].slug}`}
                style={{ fontSize: "12px", fontFamily: "sans-serif", fontWeight: 500, color: "#222", textDecoration: "none" }}
                className="hover:text-red-700 transition-colors line-clamp-1 block"
              >
                {latestArticles[0].title}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
