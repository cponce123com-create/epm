import { Link } from "wouter";
import { Facebook, Twitter, Youtube, Instagram } from "lucide-react";
import { useGetPublicSettings } from "@workspace/api-client-react";
import SubscribeButton from "@/components/SubscribeButton";

function Crest({ size = 36, color = "#7A1F1F" }: { size?: number; color?: string }) {
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

export default function Footer() {
  const year = new Date().getFullYear();
  const { data: settings } = useGetPublicSettings();
  const s = settings as any;

  const siteName        = s?.siteName         ?? "El Príncipe Mestizo";
  const footerText      = s?.footerText       ?? "Periodismo ciudadano independiente desde San Ramón, Chanchamayo. Sin financiamiento estatal ni partidario. Lectores, no anunciantes.";
  const footerCopyright = s?.footerCopyright  ?? `© ${year} El Príncipe Mestizo · San Ramón, Chanchamayo, Junín, Perú`;
  const contactEmail    = s?.footerContactEmail || s?.contactEmail || "contacto@elprincipemestizo.com";
  const showSections    = s?.footerShowSections !== "false";

  const twitterUrl   = s?.twitterUrl   ?? "";
  const facebookUrl  = s?.facebookUrl  ?? "";
  const youtubeUrl   = s?.youtubeUrl   ?? "";
  const instagramUrl = s?.instagramUrl ?? "";

  const INK     = "#15140F";
  const PAPER   = "#F4F0E7";
  const GRANATE = "#7A1F1F";

  return (
    <footer style={{ background: INK, color: PAPER, marginTop: 48 }}>
      {/* Banda granate superior */}
      <div style={{ height: 4, background: GRANATE }} />

      <div className="max-w-7xl mx-auto" style={{ padding: "48px 24px 28px" }}>

        {/* Grid: 1 col móvil → 2 col tablet → 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{
          gap: 36,
          paddingBottom: 32,
          borderBottom: "1px solid rgba(244,240,231,0.1)",
        }}>

          {/* Marca — span completo en móvil, normal en tablet+ */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <Crest size={38} color={GRANATE} />
              <Link href="/" style={{ textDecoration: "none" }}>
                <span style={{
                  fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
                  fontWeight: 400, fontSize: "1.35rem",
                  color: PAPER,
                }}>
                  {siteName}
                </span>
              </Link>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "rgba(244,240,231,0.6)", margin: "0 0 14px", maxWidth: 380 }}>
              {footerText}
            </p>

            {/* Redes sociales */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
                  aria-label="Facebook"
                  style={{ width: 32, height: 32, border: "1px solid rgba(244,240,231,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(244,240,231,0.55)", transition: "color 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = PAPER; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,231,0.5)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,231,0.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,231,0.2)"; }}>
                  <Facebook size={15} />
                </a>
              )}
              {twitterUrl && (
                <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  style={{ width: 32, height: 32, border: "1px solid rgba(244,240,231,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(244,240,231,0.55)", transition: "color 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = PAPER; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,231,0.5)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,231,0.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,231,0.2)"; }}>
                  <Twitter size={15} />
                </a>
              )}
              {youtubeUrl && (
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                  aria-label="YouTube"
                  style={{ width: 32, height: 32, border: "1px solid rgba(244,240,231,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(244,240,231,0.55)", transition: "color 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = PAPER; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,231,0.5)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,231,0.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,231,0.2)"; }}>
                  <Youtube size={15} />
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                  aria-label="Instagram"
                  style={{ width: 32, height: 32, border: "1px solid rgba(244,240,231,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(244,240,231,0.55)", transition: "color 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = PAPER; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,231,0.5)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,231,0.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,231,0.2)"; }}>
                  <Instagram size={15} />
                </a>
              )}
            </div>
          </div>

          {/* Secciones */}
          {showSections && (
            <div>
              <div className="epm-mono" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14, color: "rgba(244,240,231,0.4)" }}>
                Secciones
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {[
                  { label: "Denuncia",      href: "/categoria/denuncia" },
                  { label: "Investigación", href: "/categoria/investigacion" },
                  { label: "Opinión",       href: "/categoria/opinion" },
                  { label: "Ciudad",        href: "/categoria/ciudad" },
                  { label: "Política",      href: "/categoria/politica" },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    style={{ fontSize: 13, color: "rgba(244,240,231,0.72)", textDecoration: "none", transition: "color 0.15s" }}
                    className="hover:text-white">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* La redacción */}
          <div>
            <div className="epm-mono" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14, color: "rgba(244,240,231,0.4)" }}>
              La redacción
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {[
                { label: "Inicio",           href: "/" },
                { label: "Acerca de",        href: "/acerca-de" },
                { label: "Buscar artículos", href: "/buscar" },
                { label: "Administración",   href: "/admin/login" },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  style={{ fontSize: 13, color: "rgba(244,240,231,0.72)", textDecoration: "none", transition: "color 0.15s" }}
                  className="hover:text-white">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Publicidad / Apoyo */}
          <div>
            <div className="epm-mono" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14, color: "rgba(244,240,231,0.4)" }}>
              Suscríbete
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(244,240,231,0.55)", marginBottom: 14 }}>
              Recibí las noticias en tu correo. Sin spam, solo comunicación ciudadana.
            </p>
            <SubscribeButton />
            <div style={{ marginTop: 18 }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(244,240,231,0.55)", marginBottom: 8 }}>
                ¿Tienes un negocio en Chanchamayo? Anúnciate aquí.
              </p>
              {contactEmail && (
                <a href={`mailto:${contactEmail}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "var(--app-font-mono)", color: GRANATE, textDecoration: "none", letterSpacing: "0.1em", transition: "opacity 0.15s" }}
                  className="hover:opacity-75">
                  Contáctanos →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Separador decorativo */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
          <div style={{ width: 40, height: 2, background: GRANATE }} />
        </div>

        {/* Copyright + frase */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ paddingTop: 16, gap: 10 }}>
          <span className="epm-mono" style={{ fontSize: 11, color: "rgba(244,240,231,0.38)", letterSpacing: "0.06em" }}>
            {footerCopyright}
          </span>
          <span className="epm-italic" style={{ fontSize: 15, color: "rgba(244,240,231,0.55)", fontStyle: "italic", fontFamily: "'Libre Baskerville', Georgia, serif" }}>
            "La verdad no necesita permiso para existir."
          </span>
        </div>
      </div>
    </footer>
  );
}
