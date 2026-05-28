import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Mail, Send, Loader2, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useGetPublicSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export default function ContactPage() {
  const { data: settings } = useGetPublicSettings();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const siteName = (settings as any)?.siteName ?? "El Príncipe Mestizo";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ description: "Completa todos los campos.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      toast({ description: "Mensaje enviado. Te responderemos pronto." });
    } catch {
      toast({ description: "Error al enviar. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Contacto · {siteName}</title>
        <meta name="description" content="Formulario de contacto con el equipo de El Príncipe Mestizo." />
      </Helmet>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-md bg-primary/10">
            <Mail size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Contacto</h1>
            <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
              Escribinos, tu opinión nos importa
            </p>
          </div>
        </div>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
            <h2 className="font-display text-lg font-semibold mb-1">Mensaje enviado</h2>
            <p className="text-sm font-sans-ui text-muted-foreground">Gracias por escribirnos. Te responderemos pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-lg p-6 space-y-5">
            <div>
              <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Nombre *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tu nombre"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-sans-ui font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Mensaje *
              </label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                placeholder="Escribe tu mensaje aquí..."
                required
                minLength={10}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? "Enviando..." : "Enviar mensaje"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
