import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Check, X, AlertTriangle, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface ReviewArticle {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  status: string;
  authorId: number;
  authorName: string;
  authorEmail: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReviewQueue() {
  const { token, user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL ?? "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [queue, setQueue] = useState<ReviewArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actioning, setActioning] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const fetchQueue = async () => {
    const res = await fetch(`${apiUrl}/api/admin/review/queue`, { headers });
    if (res.ok) setQueue(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleApprove = async (id: number) => {
    setActioning(true);
    await fetch(`${apiUrl}/api/admin/review/${id}/approve`, { method: "POST", headers });
    setActioning(false);
    fetchQueue();
  };

  const handleReject = async () => {
    if (!rejectId || !rejectNote.trim()) return;
    setActioning(true);
    await fetch(`${apiUrl}/api/admin/review/${rejectId}/reject`, {
      method: "POST", headers,
      body: JSON.stringify({ editorialNote: rejectNote }),
    });
    setActioning(false);
    setRejectId(null);
    setRejectNote("");
    fetchQueue();
  };

  const handlePublish = async (id: number) => {
    if (!confirm("¿Publicar este artículo inmediatamente?")) return;
    setActioning(true);
    await fetch(`${apiUrl}/api/admin/review/${id}/publish`, { method: "POST", headers });
    setActioning(false);
    fetchQueue();
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 36e5);
    if (hours < 1) return "Hace menos de 1 hora";
    if (hours === 1) return "1 hora";
    if (hours < 24) return `${hours} horas`;
    const days = Math.floor(hours / 24);
    return `${days} día${days > 1 ? "s" : ""}`;
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Cola de revisión</h1>
          <p className="text-sm text-gray-500 mt-1">
            {queue.length} artículo{queue.length !== 1 ? "s" : ""} {queue.length === 1 ? "pendiente" : "pendientes"} de revisión
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Cargando...</div>
        ) : queue.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <BookOpen size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-sans-ui text-sm">No hay artículos en cola de revisión.</p>
            <p className="text-gray-400 text-xs mt-1">Cuando un autor envíe un artículo, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((article) => {
              const expanded = expandedId === article.id;
              return (
                <div key={article.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => setExpandedId(expanded ? null : article.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base font-semibold text-gray-900 leading-snug truncate">{article.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 font-sans-ui">
                        <span>{article.authorName}</span>
                        <span className="text-gray-300">·</span>
                        <span>{article.categoryName}</span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle size={11} className="text-yellow-500" />
                          Pendiente {timeSince(article.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded preview */}
                  {expanded && (
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      <div className="article-body text-sm max-w-none border border-gray-100 rounded-lg p-4 bg-gray-50/30 max-h-[400px] overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                      />
                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        <button onClick={(e) => { e.stopPropagation(); handlePublish(article.id); }} disabled={actioning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-sans-ui font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          <Check size={13} /> Publicar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleApprove(article.id); }} disabled={actioning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-sans-ui font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Check size={13} /> Aprobar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setRejectId(article.id); setRejectNote(""); }} disabled={actioning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-sans-ui font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          <X size={13} /> Rechazar
                        </button>
                        <Link href={`/admin/articles/${article.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-sans-ui font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Editar
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40" onClick={() => setRejectId(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-gray-900 mb-3">Rechazar artículo</h3>
            <p className="text-sm text-gray-500 mb-3">Escribe una nota editorial para el autor explicando por qué se rechaza y qué cambios necesita.</p>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3}
              placeholder="Nota editorial..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-gray-400"
              autoFocus />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setRejectId(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleReject} disabled={actioning || !rejectNote.trim()}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                {actioning ? "Rechazando..." : "Rechazar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
