import { Link } from "wouter";
import { MapPin, Facebook, Twitter, Youtube, Instagram, Mail } from "lucide-react";
import { useGetPublicSettings } from "@workspace/api-client-react";

export default function Footer() {
  const year = new Date().getFullYear();
  const { data: settings } = useGetPublicSettings();

  const siteName         = (settings as any)?.siteName         ?? "El Príncipe Mestizo";
  const footerText       = (settings as any)?.footerText        ?? "Periodismo ciudadano, opinión y denuncia desde la selva central peruana.";
  const footerLocation   = (settings as any)?.footerLocation    ?? "San Ramón, Chanchamayo — Junín, Perú";
  const footerCopyright  = (settings as any)?.footerCopyright   ?? `© ${year} El Príncipe Mestizo. Todos los derechos reservados.`;
  const contactEmail     = (settings as any)?.footerContactEmail || (settings as any)?.contactEmail || "contacto@elprincinemestizo.com";
  const showSections     = (settings as any)?.footerShowSections !== "false";

  const twitterUrl   = (settings as any)?.twitterUrl   ?? "";
  const facebookUrl  = (settings as any)?.facebookUrl  ?? "";
  const youtubeUrl   = (settings as any)?.youtubeUrl   ?? "";
  const instagramUrl = (settings as any)?.instagramUrl ?? "";

  const hasSocial = twitterUrl || facebookUrl || youtubeUrl || instagramUrl;

  return (
    <footer className="bg-gray-900 text-gray-400 mt-12">
      {/* Banda roja superior */}
      <div className="h-[3px] bg-red-700" />

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

          {/* Marca */}
          <div className="md:col-span-1">
            <Link href="/">
              <span className="font-display text-xl font-bold text-white block mb-2 hover:text-red-400 transition-colors">
                {siteName}
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-3 text-gray-500">
              {footerText}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-sans-ui text-gray-600">
              <MapPin size={11} className="text-red-500 shrink-0" />
              <span>{footerLocation}</span>
            </div>

            {/* Iconos de redes sociales */}
            {hasSocial && (
              <div className="flex items-center gap-3 mt-4">
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-blue-400 transition-colors"
                    aria-label="Facebook">
                    <Facebook size={17} />
                  </a>
                )}
                {twitterUrl && (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-sky-400 transition-colors"
                    aria-label="Twitter / X">
                    <Twitter size={17} />
                  </a>
                )}
                {youtubeUrl && (
                  <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    aria-label="YouTube">
                    <Youtube size={17} />
                  </a>
                )}
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-pink-400 transition-colors"
                    aria-label="Instagram">
                    <Instagram size={17} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Secciones (se puede ocultar desde el admin) */}
          {showSections && (
            <div>
              <h3 className="text-xs font-sans-ui font-700 uppercase tracking-widest text-gray-500 mb-4">Secciones</h3>
              <nav className="space-y-2">
                {[
                  { label: "Denuncia",      href: "/categoria/denuncia" },
                  { label: "Opinión",       href: "/categoria/opinion" },
                  { label: "Investigación", href: "/categoria/investigacion" },
                  { label: "Ciudad",        href: "/categoria/ciudad" },
                  { label: "Política",      href: "/categoria/politica" },
                ].map(l => (
                  <Link key={l.href} href={l.href} className="block text-sm hover:text-white transition-colors">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}

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
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-sans-ui text-red-400 hover:text-red-300 underline underline-offset-3 transition-colors"
              >
                <Mail size={11} />
                Contáctanos →
              </a>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans-ui text-gray-600">
          <span>
            {footerCopyright ||
              `© ${year} ${siteName}. Todos los derechos reservados.`}
          </span>
          <span>Periodismo libre e independiente desde Chanchamayo, Perú.</span>
        </div>
      </div>
    </footer>
  );
}
