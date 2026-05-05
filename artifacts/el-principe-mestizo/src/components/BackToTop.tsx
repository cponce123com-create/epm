import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Volver al inicio"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
      style={{
        background: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        boxShadow: "0 4px 16px hsl(0 60% 30% / 0.35)",
      }}
    >
      <ChevronUp size={20} />
    </button>
  );
}
