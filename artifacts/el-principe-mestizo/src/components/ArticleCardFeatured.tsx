import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import type { Article } from "@workspace/api-client-react";
import OptimizedImage from "@/components/OptimizedImage";

interface Props {
  article: Article;
  large?: boolean;
}

function ImgWithFallback({ src, alt, className, style }: {
  src: string; alt: string; className?: string; style?: React.CSSProperties;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return <div className={`bg-stone-800 ${className ?? ""}`} style={style} />;
  return (
    <img src={src} alt={alt} className={className} style={style}
      loading="eager" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  );
}

export default function ArticleCardFeatured({ article, large = false }: Props) {
  const date     = article.publishedAt ? new Date(article.publishedAt) : new Date(article.createdAt);
  const catColor = article.category?.color ?? "#7A1F1F";

  /* ── Hero principal: foto full-height con overlay y contenido abajo ── */
  if (large) {
    return (
      <div style={{ position: "relative", overflow: "hidden", background: "#111", height: "100%" }}
        className="animate-fade-in">

        {/* Foto */}
        {article.coverImageUrl ? (
          <OptimizedImage
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? article.title}
            className="w-full h-full object-cover block"
            style={{ height: "100%", position: "absolute", inset: 0 }}
            optimizeWidth={1400}
            priority
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, #1a1714, #3d1010)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "6rem", color: "rgba(255,255,255,0.08)", fontWeight: 400 }}>EPM</span>
          </div>
        )}

        {/* Overlay gradiente */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.14) 28%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.92) 100%)",
        }} />

        {/* Líneas decorativas */}
        <div style={{ position: "absolute", left: 28, top: 32, bottom: 32, width: 1, background: "rgba(255,255,255,0.16)" }} />
        <div style={{ position: "absolute", right: 20, top: 32, bottom: 32, width: 1, background: "rgba(255,255,255,0.12)" }} />

        {/* Contenido en la base */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "36px 44px 40px", color: "#fff" }}>

          {/* Categoría + tag */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Link href={`/categoria/${article.category?.slug ?? ""}`}>
              <span style={{
                background: catColor, color: "#fff",
                fontFamily: "var(--app-font-mono)",
                fontSize: 10, letterSpacing: "0.22em", fontWeight: 600,
                padding: "6px 11px", textTransform: "uppercase",
              }}>
                {article.featured ? "EXCLUSIVO" : (article.category?.name ?? "PORTADA")}
              </span>
            </Link>
            <span className="epm-mono" style={{
              fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.8)",
              paddingLeft: 12, borderLeft: "1px solid rgba(255,255,255,0.35)",
            }}>
              {article.category?.name} · Portada
            </span>
          </div>

          {/* Título */}
          <Link href={`/articulo/${article.slug}`} style={{ textDecoration: "none" }}>
            <h1 style={{
              fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
              fontWeight: 400,
              fontSize: "clamp(1.6rem, 3.5vw + 0.5rem, 3rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              margin: "0 0 16px",
              color: "#fff",
              textShadow: "0 2px 20px rgba(0,0,0,0.4)",
            }}>
              {article.title}
            </h1>
          </Link>

          {/* Regla decorativa */}
          <div style={{ width: 64, height: 3, background: "#7A1F1F", marginBottom: 16 }} />

          {/* Resumen en itálica */}
          {article.summary && (
            <p className="epm-italic" style={{
              fontSize: "clamp(0.9rem, 1.2vw + 0.4rem, 1.1rem)",
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.88)",
              margin: "0 0 20px",
              maxWidth: 680,
            }}>
              {article.summary}
            </p>
          )}

          {/* Meta */}
          <div className="epm-mono" style={{
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em",
          }}>
            {article.authorName && <span style={{ color: "#fff", fontWeight: 600 }}>POR {article.authorName.toUpperCase()}</span>}
            <span>·</span>
            <span>{format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
            <span>·</span>
            <span>{article.readingTime} min de lectura</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Card secundaria (panel oscuro de recomendados) ── */
  return (
    <div className="animate-fade-in-up stagger-2" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 24px" }}>
      {/* Miniatura */}
      {article.coverImageUrl && (
        <Link href={`/articulo/${article.slug}`} style={{ flexShrink: 0, width: 88, height: 66, overflow: "hidden", display: "block" }}>
          <OptimizedImage
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? article.title}
            className="w-full h-full object-cover"
            style={{ transition: "transform 0.3s ease" }}
            optimizeWidth={300}
          />
        </Link>
      )}
      <div style={{ minWidth: 0 }}>
        <div className="epm-mono" style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: catColor, marginBottom: 6, fontWeight: 600 }}>
          {article.category?.name}
        </div>
        <Link href={`/articulo/${article.slug}`} style={{ textDecoration: "none" }}>
          <h3 style={{
            fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
            fontWeight: 400, fontSize: "1rem",
            lineHeight: 1.22, margin: "0 0 8px",
            color: "#F4F0E7",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {article.title}
          </h3>
        </Link>
        <div className="epm-mono" style={{ fontSize: 9, color: "rgba(244,240,231,0.45)", letterSpacing: "0.08em" }}>
          {format(date, "d MMM yyyy", { locale: es })} · {article.readingTime} min
        </div>
      </div>
    </div>
  );
}
