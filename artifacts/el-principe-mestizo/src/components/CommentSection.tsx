import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { useGetApprovedComments, useCreateComment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  articleId: number;
}

export default function CommentSection({ articleId }: Props) {
  const { data: comments, refetch } = useGetApprovedComments(articleId);
  const createComment = useCreateComment();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
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

      {/* Comment list */}
      {comments && comments.length > 0 ? (
        <div className="space-y-6 mb-10">
          {comments.map(comment => (
            <div key={comment.id} className="bg-card border border-card-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-sans-ui font-semibold text-sm">{comment.authorName}</span>
                <span className="text-xs font-sans-ui text-muted-foreground">
                  {format(new Date(comment.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
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
              <label className="block text-xs font-sans-ui font-medium mb-1.5 uppercase tracking-wide text-muted-foreground">
                Nombre *
              </label>
              <input
                type="text"
                value={form.authorName}
                onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tu nombre"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-sans-ui font-medium mb-1.5 uppercase tracking-wide text-muted-foreground">
                Email * (no se publicará)
              </label>
              <input
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
            <label className="block text-xs font-sans-ui font-medium mb-1.5 uppercase tracking-wide text-muted-foreground">
              Comentario *
            </label>
            <textarea
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
