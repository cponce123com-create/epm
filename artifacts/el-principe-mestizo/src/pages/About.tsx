import { Twitter, Facebook, MapPin, Pen, Eye, Shield, Quote } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import { useGetPublicSettings, useGetArticles } from "@workspace/api-client-react";

export default function About() {
  const { data: settings, isLoading } = useGetPublicSettings();
  const { data: articlesPage } = useGetArticles({ page: 1, limit: 3 });
  const recentArticles = articlesPage?.articles ?? [];

  const s = settings as any;

  // Datos dinámicos desde el admin (con fallbacks elegantes)
  const aboutTitle   = s?.aboutTitle?.trim() || "El Príncipe Mestizo";
  const aboutRole    = s?.aboutRole?.trim() || "Columnista independiente";
  const aboutText    = s?.aboutText?.trim() || "Soy columnista independiente desde San Ramón, Chanchamayo. Este blog es mi espacio de denuncia y reflexión sobre la gestión pública local — un ejercicio de comunicación ciudadana que nace de la convicción de que la verdad tiene que ser dicha, aunque incomode.";
  const aboutPhotoUrl = s?.aboutPhotoUrl?.trim() || "";
  const aboutLandscapeUrl = s?.aboutLandscapeUrl?.trim() || "";
  const siteDescription = s?.siteDescription?.trim() || "El Príncipe Mestizo es un espacio de comunicación ciudadana, opinión y denuncia desde la selva central peruana.";
  const twitterUrl  = s?.twitterUrl || "";
  const facebookUrl = s?.facebookUrl || "";

  // Partir el texto en párrafos para la bio
  const bioParagraphs = aboutText.split("\n").filter((p: string) => p.trim());

  const values = [
    {
      icon: Pen,
      title: "Denuncia",
      text: "La corrupción prospera en el silencio. Cada artículo es un acto de resistencia contra la impunidad local.",
    },
    {
      icon: Eye,
      title: "Transparencia",
      text: "Los recursos públicos son del pueblo. Fiscalizar su uso no es opción — es obligación ciudadana.",
    },
    {
      icon: Shield,
      title: "Independencia",
      text: "Sin partido, sin padrino, sin agenda oculta. Solo la verdad como guía y la comunidad como norte.",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-24 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64 mx-auto" />
            <div className="h-4 bg-muted rounded w-96 mx-auto" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Hero ── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-start">

            {/* Texto */}
            <div>
              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-5">
                <span className="block w-8 h-0.5 bg-red-700" />
                <span className="font-sans-ui text-[11px] uppercase tracking-[0.2em] text-red-700 font-bold">
                  {aboutRole}
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-4">
                {aboutTitle}
              </h1>

              <div className="flex items-center gap-1.5 mb-6">
                <MapPin size={13} className="text-gray-400 shrink-0" />
                <span className="font-sans-ui text-sm text-gray-500">
                  San Ramón, Chanchamayo — Junín, Perú
                </span>
              </div>

              {/* Cita principal */}
              <div className="relative pl-5 border-l-4 border-red-700 mb-8">
                <Quote size={18} className="text-red-200 absolute -top-1 -left-1" />
                <p className="font-serif-body text-lg md:text-xl text-gray-700 leading-relaxed italic">
                  Creo en el poder del pueblo informado como herramienta de cambio social.
                </p>
              </div>

              {/* Bio desde el admin */}
              {bioParagraphs.length > 0 ? (
                bioParagraphs.map((p: string, i: number) => (
                  <p key={i} className="font-serif-body text-base text-gray-600 leading-relaxed mb-3">
                    {p}
                  </p>
                ))
              ) : (
                <p className="font-serif-body text-base text-gray-600 leading-relaxed mb-3">
                  Soy columnista independiente desde San Ramón, Chanchamayo. Este blog es mi espacio
                  de denuncia y reflexión sobre la gestión pública local.
                </p>
              )}

              {/* Redes */}
              <div className="flex flex-wrap items-center gap-3 mt-8">
                {twitterUrl && (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-sans-ui font-medium hover:bg-black transition-colors">
                    <Twitter size={14} /> X / Twitter
                  </a>
                )}
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white text-sm font-sans-ui font-medium hover:bg-blue-700 transition-colors">
                    <Facebook size={14} /> Facebook
                  </a>
                )}
                <Link href="/buscar"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-border text-sm font-sans-ui font-medium hover:bg-muted transition-colors">
                  Ver artículos →
                </Link>
              </div>

              {/* Paisaje de San Ramón */}
              {aboutLandscapeUrl && (
                <div className="mt-10">
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={aboutLandscapeUrl}
                      alt="San Ramón, Chanchamayo — Selva central del Perú"
                      className="w-full h-auto max-h-80 object-cover"
                      style={{ objectPosition: "center 30%" }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                    <p className="absolute bottom-3 left-4 text-xs text-white/80 font-sans-ui tracking-wide">
                      San Ramón, Chanchamayo — Selva central del Perú
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar — usa la foto del admin si existe */}
            <div className="md:pt-4 flex flex-col items-center gap-3">
              {aboutPhotoUrl ? (
                <div className="relative">
                  <div className="absolute -inset-2 border-2 border-red-700 translate-x-2 translate-y-2" />
                  <div className="relative w-44 h-44 overflow-hidden">
                    <img
                      src={aboutPhotoUrl}
                      alt={aboutTitle}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: "center top" }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-700" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute -inset-2 border-2 border-red-700 translate-x-2 translate-y-2" />
                  <div className="relative w-44 h-44 bg-gray-900 flex items-center justify-center overflow-hidden">
                    <span className="font-display text-6xl font-bold text-white select-none">
                      {aboutTitle.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-700" />
                  </div>
                </div>
              )}
              <div className="text-center mt-4">
                <p className="font-sans-ui text-[10px] uppercase tracking-widest text-gray-400">{aboutRole}</p>
                <p className="font-sans-ui text-sm font-semibold text-gray-700">{aboutTitle}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Valores ── */}
      <section className="border-b border-border bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="section-heading mb-8">Principios editoriales</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {values.map((v, i) => (
              <div key={i} className={`p-6 ${i < 2 ? "md:border-r border-border" : ""} ${i > 0 ? "border-t md:border-t-0 border-border" : ""}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-red-700 flex items-center justify-center shrink-0">
                    <v.icon size={15} className="text-white" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-gray-900">{v.title}</h3>
                </div>
                <p className="font-serif-body text-sm text-gray-600 leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Últimos artículos ── */}
      {recentArticles.length > 0 && (
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <div className="section-heading section-heading--colored mb-0">Últimas columnas</div>
              <Link href="/" className="text-xs font-sans-ui text-red-700 hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentArticles.map(article => (
                <div key={article.id} className="py-4 grid grid-cols-[1fr_auto] gap-4 items-start">
                  <div>
                    {article.category && (
                      <span className="inline-block text-[10px] font-sans-ui font-bold uppercase tracking-widest text-white px-2 py-0.5 mb-2"
                        style={{ backgroundColor: article.category.color ?? "#C0392B" }}>
                        {article.category.name}
                      </span>
                    )}
                    <Link href={`/articulo/${article.slug}`}>
                      <h3 className="font-display text-base font-bold text-gray-900 hover:text-red-700 transition-colors leading-snug">
                        {article.title}
                      </h3>
                    </Link>
                    <p className="font-serif-body text-sm text-gray-500 mt-1 line-clamp-1">{article.summary}</p>
                  </div>
                  {article.coverImageUrl && (
                    <Link href={`/articulo/${article.slug}`} className="shrink-0">
                      <OptimizedImage
                        src={article.coverImageUrl}
                        alt={article.title}
                        className="w-20 h-16 object-cover"
                        optimizeWidth={240}
                      />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contacto ── */}
      <section>
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="section-heading mb-4">Contacto</div>
              <p className="font-serif-body text-sm text-gray-600 leading-relaxed mb-4">
                ¿Tienes información sobre irregularidades en la gestión pública de Chanchamayo?
                ¿Quieres anunciarte o colaborar? Escríbeme.
              </p>
              <p className="font-sans-ui text-sm font-semibold text-gray-800">
                📍 San Ramón, Chanchamayo — Junín, Perú
              </p>
            </div>
            <div>
              <div className="section-heading mb-4">Sobre este blog</div>
              <p className="font-serif-body text-sm text-gray-600 leading-relaxed">
                {siteDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
