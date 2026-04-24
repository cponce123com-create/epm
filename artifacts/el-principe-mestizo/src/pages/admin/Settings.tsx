import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FormState {
  siteName: string;
  siteDescription: string;
  aboutText: string;
  twitterUrl: string;
  facebookUrl: string;
  adsenseClient: string;
}

const KEY_MAP: Record<keyof FormState, string> = {
  siteName: "site_name",
  siteDescription: "site_description",
  aboutText: "about_text",
  twitterUrl: "twitter_url",
  facebookUrl: "facebook_url",
  adsenseClient: "adsense_client",
};

export default function Settings() {
  const { data: settings, isLoading } = useAdminGetSettings();
  const update = useAdminUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>({
    siteName: "",
    siteDescription: "",
    aboutText: "",
    twitterUrl: "",
    facebookUrl: "",
    adsenseClient: "",
  });

  useEffect(() => {
    if (settings) {
      setForm(f => ({
        ...f,
        siteDescription: settings.siteDescription ?? "",
        aboutText: settings.aboutText ?? "",
        twitterUrl: settings.twitterUrl ?? "",
        facebookUrl: settings.facebookUrl ?? "",
        adsenseClient: settings.adsenseClient ?? "",
      }));
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Send one update per key-value pair sequentially
      for (const [formKey, apiKey] of Object.entries(KEY_MAP)) {
        const value = form[formKey as keyof FormState];
        if (value !== undefined) {
          await update.mutateAsync({ data: { key: apiKey, value } });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/public"] });
      toast({ description: "Configuración guardada correctamente." });
    } catch {
      toast({ description: "Error al guardar la configuración.", variant: "destructive" });
    }
  };

  const textField = (
    key: keyof FormState,
    label: string,
    placeholder = ""
  ) => (
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
    </div>
  );

  const urlField = (key: keyof FormState, label: string) => (
    <div>
      <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </label>
      <input
        type="url"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder="https://..."
        className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );

  const textareaField = (key: keyof FormState, label: string, rows = 4) => (
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
    </div>
  );

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Configuración</h1>
          <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">Ajustes generales del sitio</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                Información general
              </h2>
              {textareaField("siteDescription", "Descripción del sitio", 3)}
            </div>

            <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                Página "Acerca de"
              </h2>
              {textareaField("aboutText", "Texto de presentación", 8)}
            </div>

            <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                Redes sociales
              </h2>
              {urlField("twitterUrl", "URL de Twitter/X")}
              {urlField("facebookUrl", "URL de Facebook")}
            </div>

            <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                Publicidad (Google AdSense)
              </h2>
              {textField("adsenseClient", "ID de cliente AdSense", "ca-pub-xxxxxxxxxx")}
              <p className="text-xs font-sans-ui text-muted-foreground">
                Ingresa tu ID de cliente de AdSense para habilitar anuncios en el sitio.
              </p>
            </div>

            <div className="flex justify-end">
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
