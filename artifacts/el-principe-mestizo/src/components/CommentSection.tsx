import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Flag } from "lucide-react";
import { useGetApprovedComments, useCreateComment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

const REPORT_REASONS = [
  { value: "spam", label: "Spam o publicidad" },
  { value: "offensive", label: "Lenguaje ofensivo o acoso" },
  { value: "misinformation", label: "Información falsa" },
  { value: "hate_speech", label: "Discurso de odio" },
  { value: "other", label: "Otro motivo" },
];

interface Props {
  articleId: number;
}

function ReportDialog({ commentId, onClose }: { commentId: number; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast({ description: "Selecciona un motivo.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/comments/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId,
          reason,
          details: details || undefined,
          reporterEmail: email || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSent(true);
      toast({ description: "Comentario reportado. Gracias por ayudar." });
    } catch {
      toast({ description: "Error al reportar. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl text-center" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={20} />
          </div>
          <p className="font-sans-ui text-sm font-semibold mb-1">Reporte enviado</p>
          <p className="font-sans-ui text-xs text-muted-foreground mb-4">El equipo de moderación revisará el comentario.</p>
          <button onClick={onClose} className="px-4 py-2 text-sm font-sans-ui bg-primary text-white rounded-md hover:bg-primary/90">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-sans-ui text-sm font-semibold mb-4">Reportar comentario</h3>

        <label className="block text-xs font-sans-ui font-medium text-muted-foreground mb-1.5">Motivo *</label>
        <select
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full mb-3 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          required
        >
          <option value="">Seleccionar motivo...</option>
          {REPORT_REASONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <label className="block text-xs font-sans-ui font-medium text-muted-foreground mb-1.5">Detalles (opcional)</label>
        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          rows={3}
          className="w-full mb-3 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          placeholder="Describe por qué reportas este comentario..."
        />

        <label className="block text-xs font-sans-ui font-medium text-muted-foreground mb-1.5">Tu email (opcional, para seguimiento)</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="email@ejemplo.com"
        />

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-sans-ui border border-input rounded-md hover:bg-muted">Cancelar</button>
          <button type="submit" disabled={sending} className="px-4 py-2 text-sm font-sans-ui bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60">
            {sending ? "Enviando..." : "Reportar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CommentSection({ articleId }: Props) {
  const { data: comments, refetch } = useGetApprovedComments(articleId);
  const createComment = useCreateComment();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null);
  const [form, setForm] = useState({ authorName: "", authorEmail: "", content: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.authorName || !form.authorEmail || !form.content) {
      toast({ description: "Por favor, completa todos los campos.", variant: "destructive" });
      return;
    }
    try {
      await createComment.mutateAsync({ data: { articleId, ...form } });
      setSubmitted(true);
      setForm({ authorName: "", authorEmail: "", content: "" });
    } catch {
      toast({ description: "Error al enviar el comentario. Inténtalo de nuevo.", variant: "destructive" });
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-border">
      <div className="flex items-center gap-2 mb-8">
        <MessageSquare size={20} className="text-primary" />
        <h2 className="font-display text-xl font-semibold">
          Comentarios {comments?.length ? `(${comments.length})` : ""}
        </h2>
      </div>

      {/* Report dialog */}
      {reportingCommentId != null && (
        <ReportDialog
          commentId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
        />
      )}

      {/* Comment list */}
      {comments && comments.length > 0 ? (
        <div className="space-y-6 mb-10">
          {comments.map(comment => (
            <div key={comment.id} className="bg-card border border-card-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-sans-ui font-semibold text-sm">{comment.authorName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans-ui text-muted-foreground">
                    {format(new Date(comment.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </span>
                  <button
                    onClick={() => setReportingCommentId(comment.id)}
                    className="text-muted-foreground/50 hover:text-red-500 transition-colors p-1"
                    title="Reportar comentario"
                    aria-label="Reportar comentario"
                  >
                    <Flag size={13} />
                  </button>
                </div>
              </div>
              <p className="text-sm font-serif leading-relaxed text-foreground">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-sans-ui text-muted-foreground mb-10">
          Aún no hay comentarios. Sé el primero en opinar.
        </p>
      )}

      {/* Comment form */}
      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="font-sans-ui text-sm text-green-700 font-medium">
            Tu comentario ha sido enviado y está pendiente de moderación.
          </p>
          <p className="font-sans-ui text-xs text-green-600 mt-1">
            Aparecerá en esta página una vez que sea aprobado.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-lg p-6">
          <h3 className="font-display font-semibold text-base mb-5">Dejar un comentario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="comment-name" className="block text-xs font-sans-ui font-medium mb-1.5 uppercase tracking-wide text-muted-foreground">
                Nombre *
              </label>
              <input
                id="comment-name"
                type="text"
                value={form.authorName}
                onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tu nombre"
                required
              />
            </div>
            <div>
              <label htmlFor="comment-email" className="block text-xs font-sans-ui font-medium mb-1.5 uppercase tracking-wide text-muted-foreground">
                Email * (no se publicará)
              </label>
              <input
                id="comment-email"
                type="email"
                value={form.authorEmail}
                onChange={e => setForm(f => ({ ...f, authorEmail: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>
          <div className="mb-5">
            <label htmlFor="comment-content" className="block text-xs font-sans-ui font-medium mb-1.5 uppercase tracking-wide text-muted-foreground">
              Comentario *
            </label>
            <textarea
              id="comment-content"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={5}
              className="w-full px-3 py-2.5 text-sm font-serif border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder="Escribe tu comentario..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={createComment.isPending}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {createComment.isPending ? "Enviando..." : "Enviar comentario"}
          </button>
        </form>
      )}
    </section>
  );
}
