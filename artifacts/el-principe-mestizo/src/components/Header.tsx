import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, Newspaper } from "lucide-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const navLinks = [
    { label: "Inicio",        href: "/" },
    { label: "Denuncia",      href: "/categoria/denuncia" },
    { label: "Opinión",       href: "/categoria/opinion" },
    { label: "Investigación", href: "/categoria/investigacion" },
    { label: "Ciudad",        href: "/categoria/ciudad" },
    { label: "Política",      href: "/categoria/politica" },
    { label: "Acerca de",     href: "/acerca-de" },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <header
      className={`header-sticky border-b border-[hsl(210_12%_20%)] ${scrolled ? "scrolled" : ""}`}
    >
      {/* Barra superior */}
      <div className="border-b border-[hsl(210_12%_16%)] py-2 px-4 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-sans-ui text-[hsl(35_20%_58%)]">
          <Newspaper size={11} className="text-[hsl(355_72%_55%)]" />
          <span>San Ramón, Chanchamayo — Periodismo ciudadano independiente</span>
        </div>
        <Link
          href="/buscar"
          className="flex items-center gap-1.5 text-xs font-sans-ui text-[hsl(35_20%_58%)] hover:text-white transition-colors py-0.5 px-2 rounded hover:bg-[hsl(210_12%_18%)]"
        >
          <Search size={12} />
          <span className="hidden sm:inline">Buscar</span>
        </Link>
      </div>

      {/* Cabecera principal */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex items-center justify-between gap-4">
        <Link href="/" className="group flex-shrink-0">
          <div className="font-display text-xl md:text-3xl font-bold tracking-tight text-white group-hover:text-[hsl(355_72%_68%)] transition-colors leading-tight">
            El Príncipe Mestizo
          </div>
          <div className="font-sans-ui text-[10px] md:text-xs text-[hsl(35_15%_50%)] tracking-widest uppercase mt-0.5 hidden sm:block">
            Denuncia · Opinión · Ciudad
          </div>
        </Link>

        {/* Nav escritorio */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-sans-ui text-sm px-3 py-1.5 rounded-md transition-all ${
                isActive(link.href)
                  ? "text-white bg-[hsl(355_72%_38%)] shadow-sm"
                  : "text-[hsl(35_20%_70%)] hover:text-white hover:bg-[hsl(210_12%_18%)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Botón menú móvil */}
        <button
          className="lg:hidden text-[hsl(35_20%_75%)] hover:text-white p-2 rounded-md hover:bg-[hsl(210_12%_18%)] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Nav móvil con animación */}
      <div
        className={`lg:hidden border-t border-[hsl(210_12%_18%)] bg-[hsl(210_15%_8%)] overflow-hidden transition-all duration-200 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-sans-ui text-sm px-3 py-2.5 rounded-md transition-colors ${
                isActive(link.href)
                  ? "text-white bg-[hsl(355_72%_38%)]"
                  : "text-[hsl(35_20%_70%)] hover:text-white hover:bg-[hsl(210_12%_18%)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
