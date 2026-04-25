import { useState, useEffect, useRef } from "react";
import { Save, Upload, Image as ImageIcon, Globe, Palette, FileText, Share2, Mail, Shield } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FormState {
  // General
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  // Identidad visual
  logoUrl: string;
  faviconUrl: string;
  // SEO & Open Graph
  ogImage: string;
  metaKeywords: string;
  // Redes sociales
  twitterUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  // Pie de página
  footerText: string;
  footerCopyright: string;
  footerLocation: string;
  footerContactEmail: string;
  footerShowSections: string;
  // Acerca de
  aboutText: string;
  // Publicidad
  adsenseClient: string;
  // Contacto
  contactEmail: string;
}

const KEY_MAP: Record<keyof FormState, string> = {
  siteName: "site_name",
  siteDescription: "site_description",
  siteUrl: "site_url",
  logoUrl: "logo_url",
  faviconUrl: "favicon_url",
  ogImage: "og_image",
  metaKeywords: "meta_keywords",
  twitterUrl: "twitter_url",
  facebookUrl: "facebook_url",
  youtubeUrl: "youtube_url",
  instagramUrl: "instagram_url",
  footerText: "footer_text",
  footerCopyright: "footer_copyright",
  footerLocation: "footer_location",
  footerContactEmail: "footer_contact_email",
  footerShowSections: "footer_show_sections",
  aboutText: "about_text",
  adsenseClient: "adsense_client",
  contactEmail: "contact_email",
};

// ── Subcomponente: campo de imagen con preview y upload ────────────────────
function ImageUploadField({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  hint?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        onChange(json.url);
        toast({ description: "Imagen subida correctamente." });
      } else {
        throw new Error("No URL returned");
      }
    } catch {
      toast({ description: "Error al subir la imagen.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </label>
      <div className="flex gap-2 items-start">
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... o sube una imagen →"
          className="flex-1 px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-muted hover:bg-accent transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <Upload size={14} />
          {uploading ? "Subiendo..." : "Subir"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {value && (
        <div className="mt-2 flex items-center gap-3">
          <img
            src={value}
            alt={label}
            className="h-10 w-auto rounded border border-border object-contain bg-muted"
            onError={e => (e.currentTarget.style.display = "none")}
          />
          <span className="text-xs text-muted-foreground font-sans-ui truncate max-w-xs">{value}</span>
        </div>
      )}
      {hint && <p className="mt-1 text-xs font-sans-ui text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function Settings() {
  const { data: settings, isLoading } = useAdminGetSettings();
  const update = useAdminUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "general" | "visual" | "footer" | "seo" | "social" | "about" | "ads"
  >("general");

  const [form, setForm] = useState<FormState>({
    siteName: "",
    siteDescription: "",
    siteUrl: "",
    logoUrl: "",
    faviconUrl: "",
    ogImage: "",
    metaKeywords: "",
    twitterUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    instagramUrl: "",
    footerText: "",
    footerCopyright: "",
    footerLocation: "",
    footerContactEmail: "",
    footerShowSections: "true",
    aboutText: "",
    adsenseClient: "",
    contactEmail: "",
  });

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setForm(f => ({
        ...f,
        siteName: s.siteName ?? "",
        siteDescription: s.siteDescription ?? "",
        siteUrl: s.siteUrl ?? "",
        logoUrl: s.logoUrl ?? "",
        faviconUrl: s.faviconUrl ?? "",
        ogImage: s.ogImage ?? "",
        metaKeywords: s.metaKeywords ?? "",
        twitterUrl: s.twitterUrl ?? "",
        facebookUrl: s.facebookUrl ?? "",
        youtubeUrl: s.youtubeUrl ?? "",
        instagramUrl: s.instagramUrl ?? "",
        footerText: s.footerText ?? "",
        footerCopyright: s.footerCopyright ?? "",
        footerLocation: s.footerLocation ?? "",
        footerContactEmail: s.footerContactEmail ?? "",
        footerShowSections: s.footerShowSections ?? "true",
        aboutText: s.aboutText ?? "",
        adsenseClient: s.adsenseClient ?? "",
        contactEmail: s.contactEmail ?? "",
      }));
    }
  }, [settings]);

  const set = (key: keyof FormState) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  const textField = (key: keyof FormState, label: string, placeholder = "", hint?: string) => (
    <div>
      <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {hint && <p className="mt-1 text-xs font-sans-ui text-muted-foreground">{hint}</p>}
    </div>
  );

  const emailField = (key: keyof FormState, label: string, hint?: string) => (
    <div>
      <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </label>
      <input
        type="email"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder="correo@ejemplo.com"
        className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {hint && <p className="mt-1 text-xs font-sans-ui text-muted-foreground">{hint}</p>}
    </div>
  );

  const urlField = (key: keyof FormState, label: string, placeholder = "https://...") => (
    <div>
      <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </label>
      <input
        type="url"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );

  const textareaField = (key: keyof FormState, label: string, rows = 4, hint?: string) => (
    <div>
      <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </label>
      <textarea
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        rows={rows}
        className="w-full px-3 py-2.5 text-sm font-serif border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
      />
      {hint && <p className="mt-1 text-xs font-sans-ui text-muted-foreground">{hint}</p>}
    </div>
  );

  const TABS = [
    { id: "general",  label: "General",       icon: <Globe size={14} /> },
    { id: "visual",   label: "Identidad",      icon: <Palette size={14} /> },
    { id: "footer",   label: "Pie de página",  icon: <FileText size={14} /> },
    { id: "seo",      label: "SEO",            icon: <Shield size={14} /> },
    { id: "social",   label: "Redes sociales", icon: <Share2 size={14} /> },
    { id: "about",    label: "Acerca de",      icon: <ImageIcon size={14} /> },
    { id: "ads",      label: "Publicidad",     icon: <Mail size={14} /> },
  ] as const;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Título */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Configuración del sitio</h1>
          <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
            Super administración — controla todos los aspectos de tu portal
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* Tabs de navegación */}
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

            {/* ── TAB: GENERAL ── */}
            {activeTab === "general" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Información general del sitio
                </h2>
                {textField("siteName", "Nombre del sitio", "El Príncipe Mestizo")}
                {textareaField(
                  "siteDescription",
                  "Descripción corta del sitio",
                  3,
                  "Aparece en el encabezado, en Google y en las vistas previas al compartir."
                )}
                {urlField(
                  "siteUrl",
                  "URL principal del sitio",
                  "https://epm-1.onrender.com"
                )}
                {emailField(
                  "contactEmail",
                  "Correo de contacto principal",
                  "Se muestra en la sección de publicidad del pie de página."
                )}
              </div>
            )}

            {/* ── TAB: IDENTIDAD VISUAL ── */}
            {activeTab === "visual" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Logotipo y favicon
                </h2>
                <ImageUploadField
                  label="Logotipo del sitio"
                  value={form.logoUrl}
                  hint="Imagen PNG o SVG con fondo transparente. Se muestra en el encabezado. Recomendado: 200×60 px."
                  onChange={set("logoUrl")}
                />
                <ImageUploadField
                  label="Favicon (ícono de la pestaña)"
                  value={form.faviconUrl}
                  hint="Imagen PNG cuadrada. Se muestra en la pestaña del navegador. Recomendado: 512×512 px o 32×32 px."
                  onChange={set("faviconUrl")}
                />
                <div className="rounded-md bg-muted/50 border border-border p-3 text-xs font-sans-ui text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">¿Cómo se aplican?</p>
                  <p>• El <strong>logotipo</strong> reemplaza el texto "El Príncipe Mestizo" en la cabecera.</p>
                  <p>• El <strong>favicon</strong> se actualiza automáticamente en todas las pestañas.</p>
                  <p>• Los cambios se ven después de recargar la página (Ctrl + F5).</p>
                </div>
              </div>
            )}

            {/* ── TAB: PIE DE PÁGINA ── */}
            {activeTab === "footer" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Pie de página (footer)
                </h2>
                {textareaField(
                  "footerText",
                  "Descripción del pie de página",
                  3,
                  "Texto corto que aparece debajo del nombre del sitio en el footer."
                )}
                {textField(
                  "footerCopyright",
                  "Texto de derechos de autor",
                  "© 2025 El Príncipe Mestizo. Todos los derechos reservados.",
                  "Aparece en la franja inferior del footer."
                )}
                {textField(
                  "footerLocation",
                  "Ubicación mostrada en el footer",
                  "San Ramón, Chanchamayo — Junín, Perú"
                )}
                {emailField(
                  "footerContactEmail",
                  "Correo de contacto del footer",
                  "Se muestra en la sección «Publicidad» del footer."
                )}
                <div>
                  <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                    Mostrar columna de secciones
                  </label>
                  <select
                    value={form.footerShowSections}
                    onChange={e => setForm(f => ({ ...f, footerShowSections: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="true">Sí — mostrar columna de secciones</option>
                    <option value="false">No — ocultar columna de secciones</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── TAB: SEO ── */}
            {activeTab === "seo" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-6">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  SEO y Open Graph (miniatura al compartir)
                </h2>
                <ImageUploadField
                  label="Imagen por defecto al compartir (Open Graph)"
                  value={form.ogImage}
                  hint="Esta imagen aparece cuando alguien comparte la portada del sitio en Facebook, WhatsApp, Twitter, etc. Recomendado: 1200×630 px."
                  onChange={set("ogImage")}
                />
                {textareaField(
                  "metaKeywords",
                  "Palabras clave SEO (meta keywords)",
                  2,
                  'Separa las palabras con comas. Ejemplo: periodismo, Chanchamayo, San Ramón, Perú, denuncia'
                )}
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs font-sans-ui text-blue-800 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">¿Por qué la miniatura de un artículo no aparece?</p>
                  <p>Cada artículo usa su <strong>portada</strong> como miniatura al compartir. Asegúrate de que el artículo tenga una imagen de portada cargada. Si no tiene, usará la imagen por defecto que configures aquí.</p>
                </div>
              </div>
            )}

            {/* ── TAB: REDES SOCIALES ── */}
            {activeTab === "social" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Redes sociales
                </h2>
                {urlField("facebookUrl", "URL de Facebook")}
                {urlField("twitterUrl", "URL de Twitter / X")}
                {urlField("youtubeUrl", "URL de YouTube")}
                {urlField("instagramUrl", "URL de Instagram")}
              </div>
            )}

            {/* ── TAB: ACERCA DE ── */}
            {activeTab === "about" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Página "Acerca de"
                </h2>
                {textareaField(
                  "aboutText",
                  "Texto de presentación",
                  10,
                  "Este texto aparece en la página /acerca-de. Puedes usar saltos de línea."
                )}
              </div>
            )}

            {/* ── TAB: PUBLICIDAD ── */}
            {activeTab === "ads" && (
              <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  Google AdSense
                </h2>
                {textField(
                  "adsenseClient",
                  "ID de cliente AdSense",
                  "ca-pub-xxxxxxxxxxxxxxxxx",
                  "Ingresa tu ID de cliente de AdSense para habilitar anuncios en el sitio."
                )}
              </div>
            )}

            {/* Botón guardar */}
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={update.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Save size={16} />
                {update.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
