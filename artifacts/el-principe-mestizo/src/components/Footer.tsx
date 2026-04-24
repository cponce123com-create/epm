import { Link } from "wouter";
import { MapPin } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 mt-10">
      {/* Banda roja superior */}
      <div className="h-1 bg-red-700" />

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

          {/* Marca */}
          <div className="md:col-span-1">
            <Link href="/">
              <span className="font-display text-xl font-bold text-white block mb-2 hover:text-red-400 transition-colors">
                El Príncipe Mestizo
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-3 text-gray-500">
              Periodismo ciudadano, opinión y denuncia desde la selva central peruana.
            </p>
            <div className="flex items-center gap-1.5 text-xs font-sans-ui text-gray-600">
              <MapPin size={11} className="text-red-500 shrink-0" />
              <span>San Ramón, Chanchamayo — Junín, Perú</span>
            </div>
          </div>

          {/* Secciones */}
          <div>
            <h3 className="text-xs font-sans-ui font-700 uppercase tracking-widest text-gray-500 mb-4">Secciones</h3>
            <nav className="space-y-2">
              {[
                { label: "Denuncia",       href: "/categoria/denuncia" },
                { label: "Opinión",        href: "/categoria/opinion" },
                { label: "Investigación",  href: "/categoria/investigacion" },
                { label: "Ciudad",         href: "/categoria/ciudad" },
                { label: "Política",       href: "/categoria/politica" },
              ].map(l => (
                <Link key={l.href} href={l.href} className="block text-sm hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* El blog */}
          <div>
            <h3 className="text-xs font-sans-ui font-700 uppercase tracking-widest text-gray-500 mb-4">El blog</h3>
            <nav className="space-y-2">
              {[
                { label: "Inicio",           href: "/" },
                { label: "Acerca de",        href: "/acerca-de" },
                { label: "Buscar artículos", href: "/buscar" },
                { label: "Administración",   href: "/admin/login" },
              ].map(l => (
                <Link key={l.href} href={l.href} className="block text-sm hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Publicidad local */}
          <div>
            <h3 className="text-xs font-sans-ui font-700 uppercase tracking-widest text-gray-500 mb-4">Publicidad</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              ¿Tienes un negocio en Chanchamayo? Anúnciate aquí y llega a tu comunidad.
            </p>
            <a
              href="mailto:contacto@elprincinemestizo.com"
              className="inline-block mt-3 text-xs font-sans-ui text-red-400 hover:text-red-300 underline underline-offset-3 transition-colors"
            >
              Contáctanos →
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans-ui text-gray-600">
          <span>&copy; {year} El Príncipe Mestizo. Todos los derechos reservados.</span>
          <span>Periodismo libre e independiente desde Chanchamayo, Perú.</span>
        </div>
      </div>
    </footer>
  );
}
