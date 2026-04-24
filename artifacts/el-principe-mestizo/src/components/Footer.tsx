import { Link } from "wouter";
import { MapPin, Globe } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  const sections = [
    { label: "Denuncia",       href: "/categoria/denuncia" },
    { label: "Opinión",        href: "/categoria/opinion" },
    { label: "Investigación",  href: "/categoria/investigacion" },
    { label: "Ciudad",         href: "/categoria/ciudad" },
    { label: "Política",       href: "/categoria/politica" },
  ];

  const links = [
    { label: "Acerca de",         href: "/acerca-de" },
    { label: "Buscar artículos",  href: "/buscar" },
    { label: "Administración",    href: "/admin/login" },
  ];

  return (
    <footer className="bg-[hsl(210_15%_8%)] text-[hsl(35_15%_55%)] mt-16 border-t border-[hsl(210_12%_16%)]">

      {/* Banda carmesí decorativa */}
      <div className="h-1 bg-gradient-to-r from-[hsl(355_72%_38%)] via-[hsl(355_72%_50%)] to-[hsl(355_72%_38%)]" />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          {/* Sobre el blog */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-3">
              <div className="font-display text-xl font-bold text-white hover:text-[hsl(355_72%_68%)] transition-colors">
                El Príncipe Mestizo
              </div>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              Blog de periodismo ciudadano, opinión y denuncia desde el corazón
              de la selva central peruana. Voces libres, historias que importan.
            </p>
            <div className="flex items-center gap-2 text-xs font-sans-ui">
              <MapPin size={12} className="text-[hsl(355_72%_55%)] shrink-0" />
              <span>San Ramón, Chanchamayo — Junín, Perú</span>
            </div>
          </div>

          {/* Secciones */}
          <div>
            <h3 className="font-sans-ui text-xs uppercase tracking-widest text-[hsl(35_15%_45%)] mb-4 font-semibold">
              Secciones
            </h3>
            <nav className="flex flex-col gap-2">
              {sections.map(s => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="text-sm hover:text-white transition-colors hover:translate-x-1 inline-block"
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* El blog */}
          <div>
            <h3 className="font-sans-ui text-xs uppercase tracking-widest text-[hsl(35_15%_45%)] mb-4 font-semibold">
              El blog
            </h3>
            <nav className="flex flex-col gap-2 mb-6">
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm hover:text-white transition-colors hover:translate-x-1 inline-block"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 text-xs font-sans-ui text-[hsl(35_15%_42%)]">
              <Globe size={12} />
              <span>Periodismo libre e independiente</span>
            </div>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-[hsl(210_12%_15%)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-sans-ui">
            &copy; {year} El Príncipe Mestizo. Todos los derechos reservados.
          </p>
          <p className="text-xs font-sans-ui text-[hsl(35_15%_38%)] text-center">
            Hecho con convicción desde Chanchamayo, Perú.
          </p>
        </div>
      </div>
    </footer>
  );
}
