import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu } from "lucide-react";
import { useGetPublicSettings } from "@workspace/api-client-react";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { data: settings } = useGetPublicSettings();

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button className="p-2 -ml-2 text-muted-foreground hover:text-foreground lg:hidden">
                <Menu className="w-5 h-5" />
              </button>
              <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-primary">
                El Príncipe Mestizo
              </Link>
            </div>
            
            <nav className="hidden lg:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Inicio</Link>
              <Link href="/acerca-de" className="text-sm font-medium hover:text-primary transition-colors">Acerca de</Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/buscar" className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
                <Search className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border bg-card mt-16 py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-serif text-xl font-bold text-primary mb-4">El Príncipe Mestizo</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {settings?.siteDescription || "Periodismo ciudadano, opinión y denuncias desde San Ramón, Chanchamayo."}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Enlaces</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="text-muted-foreground hover:text-primary">Inicio</Link></li>
                <li><Link href="/acerca-de" className="text-muted-foreground hover:text-primary">Acerca de</Link></li>
                <li><Link href="/admin/login" className="text-muted-foreground hover:text-primary">Administración</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Redes Sociales</h4>
              <ul className="space-y-2 text-sm">
                {settings?.twitterUrl && (
                  <li><a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">Twitter</a></li>
                )}
                {settings?.facebookUrl && (
                  <li><a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">Facebook</a></li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} El Príncipe Mestizo. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
