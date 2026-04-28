import { useState, useEffect, useRef } from "react";
import { Save, Upload, Globe, Palette, FileText, Share2, Mail, Shield, User, Megaphone, ChevronRight, Eye } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FormState {
  // General
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  siteUrl: string;
  contactEmail: string;
  // Identidad visual
  logoUrl: string;
  faviconUrl: string;
  ogImage: string;
  // Header
  headerTopText: string;
  // Redes sociales
  twitterUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  // Pie de página
  footerText: string;
  footerCopyright: string;
  footerLocation: string;
  footerContactEmail: string;
  footerShowSections: string;
  // Acerca de
  aboutTitle: string;
  aboutText: string;
  aboutPhotoUrl: string;
  aboutRole: string;
  // Publicidad manual
  adBanner1Url: string;
  adBanner1Link: string;
  adBanner1Alt: string;
  adBanner2Url: string;
  adBanner2Link: string;
  adBanner2Alt: string;
  adBanner3Url: string;
  adBanner3Link: string;
  adBanner3Alt: string;
  // SEO
  metaKeywords: string;
  adsenseClient: string;
}

const KEY_MAP: Record<keyof FormState, string> = {
  siteName: "site_name",
  siteTagline: "site_tagline",
  siteDescription: "site_description",
  siteUrl: "site_url",
  contactEmail: "contact_email",
  logoUrl: "logo_url",
  faviconUrl: "favicon_url",
  ogImage: "og_image",
  headerTopText: "header_top_text",
  twitterUrl: "twitter_url",
  facebookUrl: "facebook_url",
  youtubeUrl: "youtube_url",
  instagramUrl: "instagram_url",
  tiktokUrl: "tiktok_url",
  footerText: "footer_text",
  footerCopyright: "footer_copyright",
  footerLocation: "footer_location",
  footerContactEmail: "footer_contact_email",
  footerShowSections: "footer_show_sections",
  aboutTitle: "about_title",
  aboutText: "about_text",
  aboutPhotoUrl: "about_photo_url",
  aboutRole: "about_role",
  adBanner1Url: "ad_banner_1_url",
  adBanner1Link: "ad_banner_1_link",
  adBanner1Alt: "ad_banner_1_alt",
  adBanner2Url: "ad_banner_2_url",
  adBanner2Link: "ad_banner_2_link",
  adBanner2Alt: "ad_banner_2_alt",
  adBanner3Url: "ad_banner_3_url",
  adBanner3Link: "ad_banner_3_link",
  adBanner3Alt: "ad_banner_3_alt",
  metaKeywords: "meta_keywords",
  adsenseClient: "adsense_client",
};

// ── ImageUpload ────────────────────────────────────────────────────────────
function ImageUpload({ label, value, hint, onChange }: {
  label: string; value: string; hint?: string; onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al subir");
      const data = await res.json();
      onChange(data.url);
      toast({ description: "Imagen subida correctamente." });
    } catch (err: any) {
      toast({ description: err?.message ?? "Error al subir", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... o sube una imagen →"
          className="flex-1 px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-muted hover:bg-accent transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <Upload size={13} />
          {uploading ? "Subiendo…" : "Subir"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {value && (
        <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-md border border-border">
          <img src={value} alt={label} className="h-12 w-auto rounded object-contain bg-white" onError={e => (e.currentTarget.style.display = "none")} />
          <span className="text-xs text-muted-foreground font-sans-ui truncate">{value}</span>
        </div>
      )}
      {hint && <p className="text-xs font-sans-ui text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── AdBannerCard ─────────────────────────────────────────────────────────
function AdBannerCard({ num, urlKey, linkKey, altKey, form, set }: {
  num: number;
  urlKey: keyof FormState;
  linkKey: keyof FormState;
  altKey: keyof FormState;
  form: FormState;
  set: (key: keyof FormState) => (val: string) => void;
}) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-sans-ui font-semibold">Banner {num}</span>
        {form[urlKey] && (
          <a href={form[urlKey]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            <Eye size={12} /> Vista previa
          </a>
        )}
      </div>
      <ImageUpload
        label="Imagen del banner"
        value={form[urlKey]}
        hint="Tamaño recomendado: 300×250 px (cuadrado) o 300×600 px (vertical)"
        onChange={set(urlKey)}
      />
      <div>
        <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Enlace al hacer clic
        </label>
        <input
          type="url"
          value={form[linkKey]}
          onChange={e => set(linkKey)(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Texto alternativo (accesibilidad)
        </label>
        <input
          type="text"
          value={form[altKey]}
          onChange={e => set(altKey)(e.target.value)}
          placeholder="Descripción breve del anuncio"
          className="w-full px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}

// ── Settings principal ────────────────────────────────────────────────────
export default function Settings() {
  const { data: settings, isLoading } = useAdminGetSettings();
  const update = useAdminUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  type TabId = "general" | "header" | "visual" | "about" | "ads" | "social" | "footer" | "seo";
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [saving, setSaving] = useState(false);

  const INITIAL: FormState = {
    siteName: "", siteTagline: "", siteDescription: "", siteUrl: "", contactEmail: "",
    logoUrl: "", faviconUrl: "", ogImage: "", headerTopText: "",
    twitterUrl: "", facebookUrl: "", youtubeUrl: "", instagramUrl: "", tiktokUrl: "",
    footerText: "", footerCopyright: "", footerLocation: "", footerContactEmail: "", footerShowSections: "true",
    aboutTitle: "", aboutText: "", aboutPhotoUrl: "", aboutRole: "",
    adBanner1Url: "", adBanner1Link: "", adBanner1Alt: "",
    adBanner2Url: "", adBanner2Link: "", adBanner2Alt: "",
    adBanner3Url: "", adBanner3Link: "", adBanner3Alt: "",
    metaKeywords: "", adsenseClient: "",
  };

  const [form, setForm] = useState<FormState>(INITIAL);

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setForm(f => ({
        ...f,
        siteName: s.siteName ?? "",
        siteTagline: s.siteTagline ?? "",
        siteDescription: s.siteDescription ?? "",
        siteUrl: s.siteUrl ?? "",
        contactEmail: s.contactEmail ?? "",
        logoUrl: s.logoUrl ?? "",
        faviconUrl: s.faviconUrl ?? "",
        ogImage: s.ogImage ?? "",
        headerTopText: s.headerTopText ?? "",
        twitterUrl: s.twitterUrl ?? "",
        facebookUrl: s.facebookUrl ?? "",
        youtubeUrl: s.youtubeUrl ?? "",
        instagramUrl: s.instagramUrl ?? "",
        tiktokUrl: s.tiktokUrl ?? "",
        footerText: s.footerText ?? "",
        footerCopyright: s.footerCopyright ?? "",
        footerLocation: s.footerLocation ?? "",
        footerContactEmail: s.footerContactEmail ?? "",
        footerShowSections: s.footerShowSections ?? "true",
        aboutTitle: s.aboutTitle ?? "",
        aboutText: s.aboutText ?? "",
        aboutPhotoUrl: s.aboutPhotoUrl ?? "",
        aboutRole: s.aboutRole ?? "",
        adBanner1Url: s.adBanner1Url ?? "",
        adBanner1Link: s.adBanner1Link ?? "",
        adBanner1Alt: s.adBanner1Alt ?? "",
        adBanner2Url: s.adBanner2Url ?? "",
        adBanner2Link: s.adBanner2Link ?? "",
        adBanner2Alt: s.adBanner2Alt ?? "",
        adBanner3Url: s.adBanner3Url ?? "",
        adBanner3Link: s.adBanner3Link ?? "",
        adBanner3Alt: s.adBanner3Alt ?? "",
        metaKeywords: s.metaKeywords ?? "",
        adsenseClient: s.adsenseClient ?? "",
      }));
    }
  }, [settings]);

  const set = (key: keyof FormState) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      for (const [formKey, apiKey] of Object.entries(KEY_MAP)) {
        const value = form[formKey as keyof FormState];
        if (value !== undefined) {
          await update.mutateAsync({ data: { key: apiKey, value } });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/public"] });
      toast({ description: "✅ Configuración guardada correctamente." });
    } catch {
      toast({ description: "Error al guardar la configuración.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof FormState, label: string, opts?: { placeholder?: string; hint?: string; type?: string }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input
        type={opts?.type ?? "text"}
        value={form[key]}
        onChange={e => set(key)(e.target.value)}
        placeholder={opts?.placeholder}
        className="w-full px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {opts?.hint && <p className="text-xs font-sans-ui text-muted-foreground">{opts.hint}</p>}
    </div>
  );

  const textarea = (key: keyof FormState, label: string, rows = 4, hint?: string) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <textarea
        value={form[key]}
        onChange={e => set(key)(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
      />
      {hint && <p className="text-xs font-sans-ui text-muted-foreground">{hint}</p>}
    </div>
  );

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "general",  label: "General",      icon: <Globe size={14} /> },
    { id: "header",   label: "Cabecera",     icon: <ChevronRight size={14} /> },
    { id: "visual",   label: "Identidad",    icon: <Palette size={14} /> },
    { id: "about",    label: "Acerca de",    icon: <User size={14} /> },
    { id: "ads",      label: "Publicidad",   icon: <Megaphone size={14} /> },
    { id: "social",   label: "Redes",        icon: <Share2 size={14} /> },
    { id: "footer",   label: "Footer",       icon: <FileText size={14} /> },
    { id: "seo",      label: "SEO",          icon: <Shield size={14} /> },
  ];

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Superadministración</h1>
          <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
            Controla todos los aspectos de tu portal
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-3">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans-ui font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* GENERAL */}
            {activeTab === "general" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Información general
                </h2>
                {field("siteName", "Nombre del sitio", { placeholder: "El Príncipe Mestizo" })}
                {field("siteTagline", "Eslogan / tagline", {
                  placeholder: "Comunicador ciudadano independiente desde Chanchamayo",
                  hint: "Aparece debajo del nombre en el encabezado.",
                })}
                {textarea("siteDescription", "Descripción del sitio", 3,
                  "Aparece en Google y al compartir en redes sociales."
                )}
                {field("siteUrl", "URL principal", { placeholder: "https://elprincipemestizo.eu.cc", type: "url" })}
                {field("contactEmail", "Correo de contacto", { type: "email", placeholder: "correo@ejemplo.com" })}
              </div>
            )}

            {/* CABECERA */}
            {activeTab === "header" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Textos de la cabecera
                </h2>
                {field("headerTopText", "Texto barra superior", {
                  placeholder: "San Ramón, Chanchamayo · Comunicador ciudadano independiente",
                  hint: "Aparece en la franja oscura superior del encabezado. Si lo dejas vacío se usa el texto por defecto.",
                })}
                <div className="rounded-md bg-muted/50 border border-border p-3 text-xs font-sans-ui text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Ejemplo actual:</p>
                  <p className="italic">San Ramón, Chanchamayo · Periodismo ciudadano independiente</p>
                  <p className="font-semibold text-foreground mt-2">Puedes cambiarlo a:</p>
                  <p className="italic">San Ramón, Chanchamayo · Comunicador y columnista ciudadano</p>
                  <p className="italic">San Ramón, Chanchamayo · Opinión y denuncia ciudadana</p>
                  <p className="italic">San Ramón, Chanchamayo · Crítico y comunicador ciudadano</p>
                </div>
              </div>
            )}

            {/* IDENTIDAD VISUAL */}
            {activeTab === "visual" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Logotipo y favicon
                </h2>
                <ImageUpload
                  label="Logotipo del sitio"
                  value={form.logoUrl}
                  hint="PNG o SVG con fondo transparente. Recomendado: 200×60 px."
                  onChange={set("logoUrl")}
                />
                <ImageUpload
                  label="Favicon (ícono de la pestaña)"
                  value={form.faviconUrl}
                  hint="PNG cuadrado. Recomendado: 512×512 px."
                  onChange={set("faviconUrl")}
                />
              </div>
            )}

            {/* ACERCA DE */}
            {activeTab === "about" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Página «Acerca de»
                </h2>
                {field("aboutTitle", "Tu nombre o alias", { placeholder: "Carlos Ponce" })}
                {field("aboutRole", "Tu rol / descripción corta", {
                  placeholder: "Comunicador ciudadano · Columnista · Crítico social",
                  hint: "Aparece debajo de tu nombre como subtítulo.",
                })}
                <ImageUpload
                  label="Tu foto de perfil"
                  value={form.aboutPhotoUrl}
                  hint="Foto tuya o imagen representativa. Recomendado: cuadrada, mínimo 400×400 px."
                  onChange={set("aboutPhotoUrl")}
                />
                {textarea("aboutText", "Texto de presentación", 12,
                  "Cuéntale a tus lectores quién eres, por qué escribes y qué encuentran en este espacio. Puedes usar saltos de línea."
                )}
                {form.aboutPhotoUrl && (
                  <div className="rounded-md bg-muted/40 border border-border p-4">
                    <p className="text-xs font-sans-ui text-muted-foreground mb-3 font-semibold">Vista previa:</p>
                    <div className="flex items-start gap-4">
                      <img src={form.aboutPhotoUrl} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border-2 border-border" onError={e => (e.currentTarget.style.display = "none")} />
                      <div>
                        <p className="font-display font-bold text-lg">{form.aboutTitle || "Tu nombre"}</p>
                        <p className="text-sm text-muted-foreground font-sans-ui">{form.aboutRole || "Tu rol"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PUBLICIDAD */}
            {activeTab === "ads" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2 mb-1">
                    Banners publicitarios manuales
                  </h2>
                  <p className="text-xs font-sans-ui text-muted-foreground">
                    Sube imágenes de tus anunciantes y agrega el enlace a su negocio. Estos banners aparecen en la barra lateral del sitio.
                  </p>
                </div>
                <AdBannerCard num={1} urlKey="adBanner1Url" linkKey="adBanner1Link" altKey="adBanner1Alt" form={form} set={set} />
                <AdBannerCard num={2} urlKey="adBanner2Url" linkKey="adBanner2Link" altKey="adBanner2Alt" form={form} set={set} />
                <AdBannerCard num={3} urlKey="adBanner3Url" linkKey="adBanner3Link" altKey="adBanner3Alt" form={form} set={set} />

                <div className="border-t border-border pt-5 space-y-3">
                  <h3 className="text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground">Google AdSense (opcional)</h3>
                  {field("adsenseClient", "ID de cliente AdSense", {
                    placeholder: "ca-pub-xxxxxxxxxxxxxxxxx",
                    hint: "Si tienes cuenta de AdSense, ingresa tu ID para habilitar anuncios automáticos.",
                  })}
                </div>
              </div>
            )}

            {/* REDES SOCIALES */}
            {activeTab === "social" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Redes sociales
                </h2>
                {field("facebookUrl", "Facebook", { type: "url", placeholder: "https://facebook.com/..." })}
                {field("twitterUrl", "Twitter / X", { type: "url", placeholder: "https://twitter.com/..." })}
                {field("instagramUrl", "Instagram", { type: "url", placeholder: "https://instagram.com/..." })}
                {field("youtubeUrl", "YouTube", { type: "url", placeholder: "https://youtube.com/..." })}
                {field("tiktokUrl", "TikTok", { type: "url", placeholder: "https://tiktok.com/@..." })}
              </div>
            )}

            {/* FOOTER */}
            {activeTab === "footer" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Pie de página
                </h2>
                {textarea("footerText", "Descripción breve en el footer", 3, "Aparece debajo del nombre del sitio en el pie de página.")}
                {field("footerCopyright", "Texto de derechos de autor", { placeholder: "© 2025 El Príncipe Mestizo. Todos los derechos reservados." })}
                {field("footerLocation", "Ubicación", { placeholder: "San Ramón, Chanchamayo — Junín, Perú" })}
                {field("footerContactEmail", "Correo en el footer", { type: "email", placeholder: "contacto@ejemplo.com" })}
              </div>
            )}

            {/* SEO */}
            {activeTab === "seo" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  SEO y Open Graph
                </h2>
                <ImageUpload
                  label="Imagen por defecto al compartir"
                  value={form.ogImage}
                  hint="Aparece cuando alguien comparte la portada del sitio en redes. Recomendado: 1200×630 px."
                  onChange={set("ogImage")}
                />
                {textarea("metaKeywords", "Palabras clave SEO", 2, "Separadas por comas. Ejemplo: Chanchamayo, San Ramón, denuncia, Perú, opinión")}
              </div>
            )}

            {/* Guardar */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-xs font-sans-ui text-muted-foreground">Los cambios se aplican al recargar la página del sitio.</p>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
