import { Link } from "wouter";
import { Home, Search, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md animate-fade-in-up">
          {/* Número 404 decorativo */}
          <div className="relative mb-6">
            <span className="font-display text-[8rem] md:text-[10rem] font-bold text-muted/60 leading-none select-none block">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">📰</span>
            </div>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
            Página no encontrada
          </h1>
          <p className="text-muted-foreground font-serif text-base leading-relaxed mb-8">
            El artículo o página que buscas no existe, fue movido o eliminado.
            Pero hay muchas otras historias esperándote.
          </p>

          {/* Línea carmesí decorativa */}
          <div className="w-12 h-1 bg-primary rounded mx-auto mb-8" />

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-sans-ui font-semibold hover:bg-primary/90 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow"
            >
              <Home size={15} />
              Ir al inicio
            </Link>
            <Link
              href="/buscar"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border rounded-lg text-sm font-sans-ui font-medium hover:bg-muted transition-all"
            >
              <Search size={15} />
              Buscar artículos
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
