import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Settings, Trash2, UserCheck, UserX, Copy, Shield, ShieldCheck } from "lucide-react";

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  author: "Author",
};
const roleBadge: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  author: "bg-green-100 text-green-800",
};

interface Editor {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  bio: string;
  twitterHandle: string;
  articleCount: number;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function Editors() {
  const { token, user: me } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL ?? "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("author");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editTw, setEditTw] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEditors = async () => {
    const res = await fetch(`${apiUrl}/api/admin/editors`, { headers });
    if (res.ok) setEditors(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchEditors(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch(`${apiUrl}/api/admin/editors`, {
      method: "POST", headers,
      body: JSON.stringify({ email: newEmail, displayName: newName, role: newRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setTempPassword(data.temporaryPassword);
      fetchEditors();
      setNewEmail(""); setNewName(""); setNewRole("author");
    } else {
      const err = await res.json();
      alert(err.error ?? "Error al crear editor");
    }
    setCreating(false);
  };

  const handleToggleActive = async (editor: Editor) => {
    if (!confirm(`¿${editor.isActive ? "Desactivar" : "Activar"} a ${editor.displayName}?`)) return;
    await fetch(`${apiUrl}/api/admin/editors/${editor.id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ isActive: !editor.isActive }),
    });
    fetchEditors();
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    await fetch(`${apiUrl}/api/admin/editors/${editId}`, {
      method: "PUT", headers,
      body: JSON.stringify({
        displayName: editName,
        role: editRole,
        bio: editBio,
        twitterHandle: editTw,
        isActive: editActive,
      }),
    });
    setSaving(false);
    setEditId(null);
    fetchEditors();
  };

  const openEdit = (e: Editor) => {
    setEditId(e.id);
    setEditName(e.displayName);
    setEditRole(e.role);
    setEditBio(e.bio ?? "");
    setEditTw(e.twitterHandle ?? "");
    setEditActive(e.isActive);
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Editores</h1>
            <p className="text-sm text-gray-500 mt-1">Gestiona el equipo editorial de EPM</p>
          </div>
          <button onClick={() => {
            setTempPassword(null);
            setShowCreate(true);
          }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-sans-ui font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={15} /> Nuevo editor
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-sm text-gray-400">Cargando...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-sans-ui text-xs font-semibold text-gray-500 uppercase">Editor</th>
                  <th className="text-left px-4 py-3 font-sans-ui text-xs font-semibold text-gray-500 uppercase">Rol</th>
                  <th className="text-left px-4 py-3 font-sans-ui text-xs font-semibold text-gray-500 uppercase">Artículos</th>
                  <th className="text-left px-4 py-3 font-sans-ui text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Último acceso</th>
                  <th className="text-left px-4 py-3 font-sans-ui text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-right px-4 py-3 font-sans-ui text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editors.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-500 font-sans-ui">
                          {e.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-sans-ui font-medium text-gray-800">{e.displayName}</p>
                          <p className="text-xs text-gray-400">{e.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-sans-ui font-semibold uppercase ${roleBadge[e.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {roleLabels[e.role] ?? e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans-ui text-gray-600">{e.articleCount}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {e.lastLoginAt ? new Date(e.lastLoginAt).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-sans-ui font-semibold uppercase ${e.isActive ? "text-green-600" : "text-red-500"}`}>
                        {e.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                        {e.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(e)} title="Editar"
                          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
                        >
                          <Settings size={14} />
                        </button>
                        <button onClick={() => handleToggleActive(e)} title={e.isActive ? "Desactivar" : "Activar"}
                          className={`p-1.5 transition-colors rounded-md hover:bg-gray-100 ${e.isActive ? "text-red-400 hover:text-red-600" : "text-green-400 hover:text-green-600"}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {editors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No hay editores registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {tempPassword ? (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold text-gray-900">¡Editor creado!</h3>
                <p className="text-sm text-gray-500">
                  Esta contraseña temporal se muestra <strong>solo una vez</strong>. Cópiala ahora:
                </p>
                <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm text-gray-800 break-all flex items-center justify-between gap-2">
                  <code>{tempPassword}</code>
                  <button onClick={() => { navigator.clipboard.writeText(tempPassword); alert("¡Copiada!"); }}
                    className="p-1 text-gray-400 hover:text-gray-600 shrink-0" title="Copiar"
                  ><Copy size={15} /></button>
                </div>
                <button onClick={() => setShowCreate(false)}
                  className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-sans-ui font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <h3 className="font-display text-lg font-bold text-gray-900">Nuevo editor</h3>
                <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                >
                  <option value="author">Author (escritor)</option>
                  {me?.role === "superadmin" && <option value="admin">Admin (editor jefe)</option>}
                  {me?.role === "superadmin" && <option value="superadmin">Superadmin</option>}
                </select>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
                  <button type="submit" disabled={creating}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                    {creating ? "Creando..." : "Crear editor"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editId && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40" onClick={() => setEditId(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Editar editor</h3>
            <div className="space-y-3">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              {me?.role === "superadmin" && (
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                  <option value="author">Author</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              )}
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)}
                placeholder="Bio" rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
              <input type="text" value={editTw} onChange={(e) => setEditTw(e.target.value)}
                placeholder="Twitter (@handle)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-600">Cuenta activa</span>
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setEditId(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
