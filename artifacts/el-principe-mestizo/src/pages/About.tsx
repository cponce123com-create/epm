import { Twitter, Facebook } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useGetPublicSettings } from "@workspace/api-client-react";

export default function About() {
  const { data: settings } = useGetPublicSettings();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-start gap-10">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="w-32 h-32 rounded-full bg-[hsl(210_15%_12%)] flex items-center justify-center overflow-hidden border-4 border-[hsl(355_72%_38%)]">
              <span className="font-display text-3xl font-bold text-white">PM</span>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold mb-1">El Príncipe Mestizo</h1>
            <p className="font-sans-ui text-sm text-muted-foreground mb-6 tracking-widest uppercase">
              Columnista independiente · San Ramón, Chanchamayo (Perú)
            </p>

            <div className="font-serif text-base leading-relaxed whitespace-pre-wrap text-foreground mb-8">
              {settings?.aboutText ?? "Cargando..."}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3">
              {settings?.twitterUrl && (
                <a
                  href={settings.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-sans-ui px-4 py-2 border border-border rounded-lg hover:bg-[#000] hover:text-white hover:border-[#000] transition-colors"
                >
                  <Twitter size={15} />
                  X / Twitter
                </a>
              )}
              {settings?.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-sans-ui px-4 py-2 border border-border rounded-lg hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-colors"
                >
                  <Facebook size={15} />
                  Facebook
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="font-display text-xl font-semibold mb-4">Acerca de este blog</h2>
          <p className="font-serif text-base text-muted-foreground leading-relaxed">
            {settings?.siteDescription}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
