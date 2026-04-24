import { Link } from "wouter";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[hsl(210_15%_10%)] text-[hsl(35_15%_60%)] mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="font-display text-xl font-bold text-white mb-2">El Príncipe Mestizo</div>
            <p className="text-sm leading-relaxed">
              Blog personal de periodismo ciudadano, opinión y denuncia desde San Ramón, Chanchamayo (Perú).
            </p>
          </div>
          <div>
            <h3 className="font-sans-ui text-xs uppercase tracking-widest text-[hsl(35_15%_50%)] mb-3">Secciones</h3>
            <nav className="flex flex-col gap-1.5">
              {["denuncia", "opinion", "investigacion", "ciudad", "politica"].map(cat => (
                <Link
                  key={cat}
                  href={`/categoria/${cat}`}
                  className="text-sm capitalize hover:text-white transition-colors"
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace("ion", "ión")}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h3 className="font-sans-ui text-xs uppercase tracking-widest text-[hsl(35_15%_50%)] mb-3">El blog</h3>
            <nav className="flex flex-col gap-1.5">
              <Link href="/acerca-de" className="text-sm hover:text-white transition-colors">Acerca de</Link>
              <Link href="/buscar" className="text-sm hover:text-white transition-colors">Buscar artículos</Link>
              <Link href="/admin/login" className="text-sm hover:text-white transition-colors">Administración</Link>
            </nav>
          </div>
        </div>
        <div className="border-t border-[hsl(210_12%_18%)] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs font-sans-ui">
            &copy; {year} El Príncipe Mestizo. Todos los derechos reservados.
          </p>
          <p className="text-xs font-sans-ui text-[hsl(35_15%_45%)]">
            Periodismo ciudadano, independiente y libre.
          </p>
        </div>
      </div>
    </footer>
  );
}
