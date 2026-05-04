import { Link } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md animate-fade-in-up">
          <div className="font-display text-[9rem] font-bold text-gray-100 leading-none select-none">404</div>
          <div className="w-12 h-1 bg-red-700 mx-auto -mt-4 mb-6" />
          <h1 className="font-display text-2xl font-bold mb-3 text-gray-900">Página no encontrada</h1>
          <p className="font-serif-body text-base text-gray-500 leading-relaxed mb-8">
            El artículo o sección que buscas no existe o fue eliminado.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-700 text-white text-sm font-sans-ui font-semibold hover:bg-red-800 transition-colors">
              <ArrowLeft size={14} /> Ir al inicio
            </Link>
            <Link href="/buscar"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border text-sm font-sans-ui font-medium hover:bg-muted transition-colors">
              <Search size={14} /> Buscar artículos
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
