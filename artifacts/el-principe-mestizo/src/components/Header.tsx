import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search } from "lucide-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  const navLinks = [
    { label: "Inicio", href: "/" },
    { label: "Denuncia", href: "/categoria/denuncia" },
    { label: "Opinión", href: "/categoria/opinion" },
    { label: "Investigación", href: "/categoria/investigacion" },
    { label: "Ciudad", href: "/categoria/ciudad" },
    { label: "Política", href: "/categoria/politica" },
    { label: "Acerca de", href: "/acerca-de" },
  ];

  return (
    <header className="bg-[hsl(210_15%_10%)] text-white border-b border-[hsl(210_12%_20%)]">
      {/* Top bar */}
      <div className="border-b border-[hsl(210_12%_18%)] py-2 px-4 text-xs font-sans-ui text-[hsl(35_20%_70%)] flex items-center justify-between max-w-7xl mx-auto">
        <span>San Ramón, Chanchamayo — Periodismo ciudadano independiente</span>
        <Link href="/buscar" className="flex items-center gap-1 hover:text-white transition-colors">
          <Search size={12} />
          <span>Buscar</span>
        </Link>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
        <Link href="/" className="group">
          <div className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white group-hover:text-[hsl(355_72%_65%)] transition-colors">
            El Príncipe Mestizo
          </div>
          <div className="font-sans-ui text-xs text-[hsl(35_15%_55%)] tracking-widest uppercase mt-0.5">
            Denuncia · Opinión · Ciudad
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-sans-ui text-sm px-3 py-1.5 rounded transition-colors ${
                location === link.href
                  ? "text-white bg-[hsl(355_72%_38%)]"
                  : "text-[hsl(35_20%_75%)] hover:text-white hover:bg-[hsl(210_12%_18%)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="lg:hidden border-t border-[hsl(210_12%_18%)] bg-[hsl(210_15%_8%)]">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans-ui text-sm px-3 py-2 rounded text-[hsl(35_20%_75%)] hover:text-white hover:bg-[hsl(210_12%_18%)] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
