import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGetComments, useAdminApproveComment, useAdminDeleteComment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type FilterType = "pending" | "approved" | "all";

export default function Comments() {
  const [filter, setFilter] = useState<FilterType>("pending");
  const queryStatus = filter === "all" ? undefined : filter === "pending" ? "pending" : "approved";

  const { data: comments, isLoading } = useAdminGetComments({ status: queryStatus as any });
  const approve = useAdminApproveComment();
  const deleteComment = useAdminDeleteComment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });

  const handleApprove = async (id: number) => {
    try {
      await approve.mutateAsync({ id });
      invalidate();
      toast({ description: "Comentario aprobado." });
    } catch {
      toast({ description: "Error al aprobar el comentario.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    try {
      await deleteComment.mutateAsync({ id });
      invalidate();
      toast({ description: "Comentario eliminado." });
    } catch {
      toast({ description: "Error al eliminar el comentario.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Comentarios</h1>
          <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">Modera los comentarios del sitio</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(["pending", "approved", "all"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-sans-ui font-medium rounded-md border transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f === "pending" ? "Pendientes" : f === "approved" ? "Aprobados" : "Todos"}
            </button>
          ))}
        </div>

        {/* Comment list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : !comments || comments.length === 0 ? (
          <div className="bg-card border border-card-border rounded-lg p-8 text-center">
            <p className="font-sans-ui text-sm text-muted-foreground">No hay comentarios en esta categoría.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className="bg-card border border-card-border rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-sans-ui font-semibold text-sm">{comment.authorName}</span>
                      <span className="text-xs font-sans-ui text-muted-foreground">{comment.authorEmail}</span>
                      <span className="text-xs font-sans-ui text-muted-foreground">
                        {format(new Date(comment.createdAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                      </span>
                      <span className={`inline-flex text-xs font-sans-ui px-2 py-0.5 rounded font-medium ${
                        comment.approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {comment.approved ? "Aprobado" : "Pendiente"}
                      </span>
                    </div>
                    {comment.articleTitle && (
                      <p className="mb-2 text-xs font-sans-ui text-primary truncate">
                        En: {comment.articleTitle}
                      </p>
                    )}
                    <p className="text-sm font-serif text-foreground leading-relaxed">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!comment.approved && (
                      <button
                        onClick={() => handleApprove(comment.id)}
                        className="p-1.5 rounded hover:bg-green-50 transition-colors text-muted-foreground hover:text-green-600"
                        title="Aprobar"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
