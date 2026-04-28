import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, Zap, ChevronDown } from "lucide-react";
import { useGetArticles, useGetPublicSettings, useGetCategories } from "@workspace/api-client-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [location, navigate] = useLocation();
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const { data: latest } = useGetArticles({ page: 1, limit: 1 });
  const latestArticle = latest?.articles?.[0];
  const { data: siteSettings } = useGetPublicSettings();
  const { data: allCategories } = useGetCategories();

  const rawLogoUrl = ((siteSettings as any)?.logoUrl ?? "").trim();
  const siteName   = ((siteSettings as any)?.siteName || "").trim() || "El Príncipe Mestizo";
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

  const handleMouseEnter = (href: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setOpenDropdown(href);
  };

  const handleMouseLeave = () => {
    dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  return (
    <>
      <header className="site-header">
        {/* Franja superior */}
        <div className="site-header-top">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
            <span className="text-[11px] font-sans-ui text-red-200 hidden sm:block">
              San Ramón, Chanchamayo — Periodismo ciudadano independiente
            </span>
            <div className="flex items-center gap-3 ml-auto">
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

        {/* Logo */}
        <div className="site-header-brand">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden text-white p-1.5 -ml-1.5"
              aria-label="Menú"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

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

            <div className="hidden lg:block w-40" />

            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="lg:hidden text-white p-1.5 -mr-1.5"
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Nav desktop */}
        <div className="site-header-nav">
          <nav className="max-w-7xl mx-auto px-4">
            <ul className="hidden lg:flex items-center">
              {navLinks.map(link => {
                const slug = link.href.replace("/categoria/", "");
                const children = getChildren(slug);
                const hasChildren = children.length > 0;
                const isOpen = openDropdown === link.href;

                return (
                  <li
                    key={link.href}
                    className="relative"
                    onMouseEnter={() => hasChildren && handleMouseEnter(link.href)}
                    onMouseLeave={() => hasChildren && handleMouseLeave()}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center gap-1 text-[13px] font-sans-ui font-medium px-3.5 py-2.5 whitespace-nowrap transition-colors border-b-2 ${
                        isActive(link.href)
                          ? "text-white border-white"
                          : "text-red-200 border-transparent hover:text-white hover:border-red-300"
                      }`}
                    >
                      {link.label}
                      {hasChildren && <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />}
                    </Link>

                    {hasChildren && isOpen && (
                      <div
                        className="absolute top-full left-0 bg-white shadow-xl rounded-b-md z-50 py-1 min-w-[180px] border border-gray-100"
                        onMouseEnter={() => handleMouseEnter(link.href)}
                        onMouseLeave={() => handleMouseLeave()}
                      >
                        {children.map(child => (
                          <Link
                            key={child.id}
                            href={`/categoria/${child.slug}`}
                            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-sans-ui text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: child.color ?? "#C0392B" }}
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
        </div>

        {/* Menú móvil */}
        <div className={`lg:hidden overflow-hidden transition-all duration-200 bg-[hsl(355_80%_28%)] ${menuOpen ? "max-h-screen" : "max-h-0"}`}>
          <nav className="max-w-7xl mx-auto px-4 py-2">
            {navLinks.map(link => {
              const slug = link.href.replace("/categoria/", "");
              const children = getChildren(slug);
              const hasChildren = children.length > 0;
              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    className={`block text-sm font-sans-ui px-3 py-2.5 rounded transition-colors ${
                      isActive(link.href)
                        ? "text-white bg-[hsl(355_80%_22%)]"
                        : "text-red-200 hover:text-white hover:bg-[hsl(355_80%_22%)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                  {hasChildren && (
                    <div className="ml-4 mb-1">
                      {children.map(child => (
                        <Link
                          key={child.id}
                          href={`/categoria/${child.slug}`}
                          className="flex items-center gap-2 text-xs font-sans-ui px-3 py-2 text-red-300 hover:text-white transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
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
      </header>

      {/* Breaking news */}
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
