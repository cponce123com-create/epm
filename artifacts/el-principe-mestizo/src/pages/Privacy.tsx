import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useGetPublicSettings } from "@workspace/api-client-react";

export default function Privacy() {
  const { data: settings } = useGetPublicSettings();
  const siteName = (settings as any)?.siteName ?? "El Príncipe Mestizo";
  const email = (settings as any)?.contactEmail ?? "elprincipemestizosr@gmail.com";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Política de Privacidad · {siteName}</title>
        <meta name="description" content="Política de privacidad y tratamiento de datos personales." />
      </Helmet>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 font-serif-body text-sm leading-relaxed">
        <h1 className="font-display text-3xl font-bold mb-6">Política de Privacidad</h1>

        <p className="text-muted-foreground mb-6">Última actualización: mayo 2025</p>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold mb-3">1. Datos que recopilamos</h2>
          <p>Cuando visitas {siteName}, podemos recopilar:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Datos de navegación:</strong> dirección IP, tipo de navegador, páginas visitadas, tiempo de visita.</li>
            <li><strong>Cookies:</strong> utilizamos cookies propias y de terceros para analytics y publicidad.</li>
            <li><strong>Datos que nos proporcionas:</strong> nombre y email al comentar o suscribirte.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold mb-3">2. Finalidad del tratamiento</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Publicar y gestionar comentarios en los artículos.</li>
            <li>Enviar newsletters si te suscribiste.</li>
            <li>Analizar el tráfico del sitio para mejorar el contenido.</li>
            <li>Mostrar publicidad relevante (con tu consentimiento).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold mb-3">3. Cookies</h2>
          <p>Usamos estos tipos de cookies:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Necesarias:</strong> para el funcionamiento básico del sitio.</li>
            <li><strong>De analytics:</strong> para entender cómo usas el sitio (solo con consentimiento).</li>
            <li><strong>Publicitarias:</strong> para mostrar anuncios relevantes (solo con consentimiento).</li>
          </ul>
          <p className="mt-2">Podés gestionar tus preferencias en cualquier momento desde el banner de cookies.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold mb-3">4. Tus derechos</h2>
          <p>Podés solicitar en cualquier momento:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Acceder a tus datos personales.</li>
            <li>Rectificar o eliminar tus datos.</li>
            <li>Limitar u oponerte al tratamiento.</li>
            <li>Retirar tu consentimiento.</li>
          </ul>
          <p className="mt-2">Para ejercer tus derechos, escribinos a <a href={`mailto:${email}`} className="text-primary underline">{email}</a>.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold mb-3">5. Contacto</h2>
          <p>
            Si tenés preguntas sobre esta política, contactanos a:
            <br />
            <a href={`mailto:${email}`} className="text-primary underline">{email}</a>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
