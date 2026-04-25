import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, Zap } from "lucide-react";
import { useGetArticles, useGetPublicSettings } from "@workspace/api-client-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [location, navigate] = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location]);

  // Último artículo para el breaking bar
  const { data: latest } = useGetArticles({ page: 1, limit: 1 });
  const latestArticle = latest?.articles?.[0];

  // Configuración del sitio (logo, nombre)
  const { data: siteSettings } = useGetPublicSettings();
  const logoUrl  = ((siteSettings as any)?.logoUrl ?? "").trim();
  const siteName = (siteSettings as any)?.siteName ?? "El Príncipe Mestizo";
  // Estado para saber si el logo cargó correctamente
  const [logoError, setLogoError] = useState(false);
  // Resetear el error cuando cambia la URL
  useEffect(() => { setLogoError(false); }, [logoUrl]);
  const showLogo = !!logoUrl && !logoError;

  const navLinks = [
    { label: "Inicio",        href: "/" },
    { label: "Denuncia",      href: "/categoria/denuncia",      color: "#C0392B" },
    { label: "Opinión",       href: "/categoria/opinion",       color: "#2980B9" },
    { label: "Investigación", href: "/categoria/investigacion", color: "#27AE60" },
    { label: "Ciudad",        href: "/categoria/ciudad",        color: "#E67E22" },
    { label: "Política",      href: "/categoria/politica",      color: "#8E44AD" },
    { label: "Acerca de",     href: "/acerca-de" },
  ];

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

  return (
    <>
      {/* ── Header principal ── */}
      <header className="site-header">

        {/* Franja superior: fecha + búsqueda */}
        <div className="site-header-top">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
            <span className="text-[11px] font-sans-ui text-red-200 hidden sm:block">
              San Ramón, Chanchamayo — Periodismo ciudadano independiente
            </span>
            <div className="flex items-center gap-3 ml-auto">
              {/* Búsqueda */}
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Buscar…"
                    className="bg-transparent border-b border-red-300 text-white placeholder-red-300 text-xs outline-none py-0.5 w-32 font-sans-ui"
                  />
                  <button type="button" onClick={() => setSearchOpen(false)} className="text-red-200 hover:text-white">
                    <X size={13} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-sans-ui text-red-200 hover:text-white transition-colors"
                >
                  <Search size={12} />
                  <span className="hidden sm:inline">Buscar</span>
                </button>
              )}
              <Link href="/admin/login" className="text-[11px] font-sans-ui text-red-200 hover:text-white transition-colors hidden sm:block">
                Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Logo centrado */}
        <div className="site-header-brand">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            {/* Menú hamburguesa móvil */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden text-white p-1.5 -ml-1.5"
              aria-label="Menú"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Logo — imagen si carga bien, texto como fallback */}
            <Link href="/" className="flex flex-col items-center mx-auto lg:mx-0">
              {showLogo ? (
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="h-10 md:h-12 lg:h-14 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <>
                  <span className="font-display text-white font-bold tracking-tight leading-none text-2xl md:text-3xl lg:text-4xl">
                    {siteName}
                  </span>
                  <span className="text-[10px] font-sans-ui text-red-300 tracking-[0.22em] uppercase mt-0.5 hidden sm:block">
                    Denuncia · Opinión · Ciudad
                  </span>
                </>
              )}
            </Link>

            {/* Espacio derecho balanceado en desktop */}
            <div className="hidden lg:block w-40" />

            {/* Ícono búsqueda móvil */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="lg:hidden text-white p-1.5 -mr-1.5"
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Nav de categorías */}
        <div className="site-header-nav">
          <nav className="max-w-7xl mx-auto px-4">
            <ul className="hidden lg:flex items-center">
              {navLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block text-[13px] font-sans-ui font-500 px-3.5 py-2.5 whitespace-nowrap transition-colors border-b-2 ${
                      isActive(link.href)
                        ? "text-white border-white"
                        : "text-red-200 border-transparent hover:text-white hover:border-red-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Menú móvil desplegable */}
        <div className={`lg:hidden overflow-hidden transition-all duration-200 bg-[hsl(355_80%_28%)] ${menuOpen ? "max-h-96" : "max-h-0"}`}>
          <nav className="max-w-7xl mx-auto px-4 py-2 grid grid-cols-2 gap-0.5">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-sans-ui px-3 py-2.5 rounded transition-colors ${
                  isActive(link.href)
                    ? "text-white bg-[hsl(355_80%_22%)]"
                    : "text-red-200 hover:text-white hover:bg-[hsl(355_80%_22%)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Breaking news bar ── */}
      {latestArticle && (
        <div className="breaking-bar">
          <div className="max-w-7xl mx-auto flex items-stretch overflow-hidden">
            <div className="breaking-label shrink-0">
              <Zap size={10} />
              <span>Lo último</span>
              <div className="breaking-dot" />
            </div>
            <div className="flex-1 overflow-hidden px-3 py-2">
              <Link
                href={`/articulo/${latestArticle.slug}`}
                className="font-sans-ui text-[12px] text-gray-700 hover:text-red-700 transition-colors line-clamp-1 font-medium"
              >
                {latestArticle.title}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
