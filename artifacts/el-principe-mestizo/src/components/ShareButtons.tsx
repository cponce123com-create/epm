import { useState } from "react";
import { Twitter, Facebook, Link as LinkIcon, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  title: string;
  url?: string;
}

export default function ShareButtons({ title, url }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = url ?? window.location.href;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ description: "Enlace copiado al portapapeles" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: "No se pudo copiar el enlace", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-sans-ui uppercase tracking-widest text-muted-foreground">Compartir</span>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs font-sans-ui font-medium px-3 py-1.5 rounded border border-border hover:bg-[#000] hover:text-white hover:border-[#000] transition-colors"
        aria-label="Compartir en X (Twitter)"
      >
        <Twitter size={13} />
        X
      </a>
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs font-sans-ui font-medium px-3 py-1.5 rounded border border-border hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-colors"
        aria-label="Compartir en Facebook"
      >
        <Facebook size={13} />
        Facebook
      </a>
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 text-xs font-sans-ui font-medium px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors"
        aria-label="Copiar enlace"
      >
        {copied ? <Check size={13} className="text-green-600" /> : <LinkIcon size={13} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
