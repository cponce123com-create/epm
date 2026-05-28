import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface AuditLog {
  id: number;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  targetType: string;
  targetId: number | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface PageData {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  APPROVE: "bg-teal-100 text-teal-700",
  REJECT: "bg-orange-100 text-orange-700",
  PUBLISH: "bg-green-100 text-green-700",
  ARCHIVE: "bg-gray-100 text-gray-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  ROLE_CHANGE: "bg-yellow-100 text-yellow-700",
};

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

export default function AuditLogs() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (actionFilter) params.set("action", actionFilter);
      if (targetFilter) params.set("targetType", targetFilter);

      const res = await fetch(`${API_BASE}/api/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLogs();
    // fetch available actions once
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/admin/audit-logs/actions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAvailableActions(await res.json());
      } catch { /* */ }
    })();
  }, [page, actionFilter, targetFilter]);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Registro de auditoría</h1>
            <p className="text-sm font-sans-ui text-muted-foreground mt-1">
              {data ? `${data.total} eventos registrados` : "Cargando..."}
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 text-sm font-sans-ui border border-input rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              className="text-sm font-sans-ui border border-input rounded-md px-3 py-1.5 bg-background"
            >
              <option value="">Todas las acciones</option>
              {availableActions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <select
            value={targetFilter}
            onChange={e => { setTargetFilter(e.target.value); setPage(1); }}
            className="text-sm font-sans-ui border border-input rounded-md px-3 py-1.5 bg-background"
          >
            <option value="">Todos los tipos</option>
            <option value="article">Artículo</option>
            <option value="comment">Comentario</option>
            <option value="user">Usuario</option>
            <option value="setting">Configuración</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans-ui">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Acción</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Objetivo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">IP</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Cargando...</td></tr>
                ) : !data || data.logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Sin eventos registrados.</td></tr>
                ) : (
                  data.logs.map(log => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{log.userName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{log.userEmail ?? ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.targetType}#{log.targetId}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "d MMM yyyy HH:mm", { locale: es })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans-ui border border-input rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="text-sm font-sans-ui text-muted-foreground">
              Página {page} de {data.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-sans-ui border border-input rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
