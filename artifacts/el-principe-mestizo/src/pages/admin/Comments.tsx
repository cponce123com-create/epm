import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Trash2, Flag, CheckSquare, Square, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type FilterType = "pending" | "approved" | "reported" | "all";

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("epm-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.token ?? null;
    }
  } catch { /* */ }
  return null;
}

interface CommentItem {
  id: number;
  articleId: number;
  articleTitle: string | null;
  authorName: string;
  authorEmail: string | null;
  content: string;
  approved: boolean;
  reported: boolean;
  reportReason: string | null;
  createdAt: string;
}

export default function Comments() {
  const [filter, setFilter] = useState<FilterType>("pending");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchComments = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const status = filter === "all" ? undefined : filter;
      const url = status
        ? `${API_BASE}/api/admin/comments?status=${status}`
        : `${API_BASE}/api/admin/comments`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setComments(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchComments();
  }, [filter]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
    fetchComments();
  };

  const handleApprove = async (id: number) => {
    try {
      const token = getToken();
      await fetch(`${API_BASE}/api/admin/comments/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      invalidate();
      toast({ description: "Comentario aprobado." });
    } catch {
      toast({ description: "Error al aprobar.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    try {
      const token = getToken();
      await fetch(`${API_BASE}/api/admin/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      invalidate();
      toast({ description: "Comentario eliminado." });
    } catch {
      toast({ description: "Error al eliminar.", variant: "destructive" });
    }
  };

  const handleBulkAction = async (action: "approve" | "delete" | "spam") => {
    if (selectedIds.size === 0) return;
    const labels = { approve: "aprobar", delete: "eliminar", spam: "marcar como spam" };
    if (!confirm(`¿${labels[action].charAt(0).toUpperCase() + labels[action].slice(1)} ${selectedIds.size} comentario(s)?`)) return;

    setBulkLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/admin/comments/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast({ description: data.message });
      setSelectedIds(new Set());
      invalidate();
    } catch {
      toast({ description: "Error en acción masiva.", variant: "destructive" });
    } finally { setBulkLoading(false); }
  };

  const totalPages = Math.ceil(comments.length / perPage);
  const paginated = comments.slice((page - 1) * perPage, page * perPage);

  const allIds = paginated.map(c => c.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Comentarios</h1>
          <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
            {comments.length} comentario{comments.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(["pending", "approved", "reported", "all"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelectedIds(new Set()); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-sans-ui font-medium rounded-md border transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f === "pending" ? "Pendientes" : f === "approved" ? "Aprobados" : f === "reported" ? "Reportados" : "Todos"}
            </button>
          ))}
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-muted/60 border border-border rounded-lg">
            <CheckSquare size={16} className="text-primary" />
            <span className="text-sm font-sans-ui font-medium">{selectedIds.size} seleccionado(s)</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => handleBulkAction("approve")} disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans-ui font-medium bg-green-100 text-green-800 rounded-md hover:bg-green-200 disabled:opacity-50">
                {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Aprobar
              </button>
              <button onClick={() => handleBulkAction("spam")} disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans-ui font-medium bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200 disabled:opacity-50">
                <Flag size={13} /> Spam
              </button>
              <button onClick={() => handleBulkAction("delete")} disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans-ui font-medium bg-red-100 text-red-800 rounded-md hover:bg-red-200 disabled:opacity-50">
                <Trash2 size={13} /> Eliminar
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs font-sans-ui text-muted-foreground hover:text-foreground">Cancelar</button>
            </div>
          </div>
        )}

        {/* Comment list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="bg-card border border-card-border rounded-lg p-8 text-center">
            <p className="font-sans-ui text-sm text-muted-foreground">No hay comentarios en esta categoría.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginated.map(comment => {
                const isSelected = selectedIds.has(comment.id);
                return (
                  <div key={comment.id} className={`bg-card border border-card-border rounded-lg p-5 transition-colors ${isSelected ? "ring-2 ring-primary/30" : ""}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => {
                        const next = new Set(selectedIds);
                        next.has(comment.id) ? next.delete(comment.id) : next.add(comment.id);
                        setSelectedIds(next);
                      }} className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0">
                        {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                      </button>
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
                          {comment.reported && (
                            <span className="inline-flex items-center gap-1 text-xs font-sans-ui px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                              <Flag size={10} /> Reportado{comment.reportReason ? `: ${comment.reportReason}` : ""}
                            </span>
                          )}
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
                          <button onClick={() => handleApprove(comment.id)}
                            className="p-1.5 rounded hover:bg-green-50 transition-colors text-muted-foreground hover:text-green-600" title="Aprobar">
                            <Check size={16} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(comment.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans-ui border border-input rounded-md hover:bg-muted disabled:opacity-40">
                  <ChevronLeft size={14} /> Anterior
                </button>
                <span className="text-sm font-sans-ui text-muted-foreground">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans-ui border border-input rounded-md hover:bg-muted disabled:opacity-40">
                  Siguiente <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
