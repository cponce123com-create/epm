import { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ROLE_LABELS, type UserRole } from "@/hooks/useRole";

interface UserData {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  articleCount: number;
  createdAt: string;
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  superadmin: <ShieldAlert size={14} />,
  admin: <ShieldCheck size={14} />,
  editor: <Shield size={14} />,
  writer: <Shield size={14} />,
  reader: <Shield size={14} />,
};

const ALL_ROLES: UserRole[] = ["superadmin", "admin", "editor", "writer", "reader"];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("writer");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err?.message ?? "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar
  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (id: number, newRole: string) => {
    try {
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      toast({ description: `Rol actualizado a ${ROLE_LABELS[newRole as UserRole] ?? newRole}.` });
    } catch (err: any) {
      toast({ description: err?.message ?? "Error al cambiar rol", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    try {
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast({ description: "Usuario eliminado." });
    } catch (err: any) {
      toast({ description: err?.message ?? "Error al eliminar", variant: "destructive" });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast({ description: "Email y contraseña son obligatorios.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const token = localStorage.getItem("epm_token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          displayName: newName.trim() || newEmail.split("@")[0],
          role: newRole,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ description: "Usuario creado exitosamente." });
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("author");
      setShowCreate(false);
      fetchUsers();
    } catch (err: any) {
      toast({ description: err?.message ?? "Error al crear usuario", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-100">
              <Users size={18} className="text-purple-700" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Usuarios</h1>
              <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
                Gestioná quién tiene acceso al panel
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); fetchUsers(); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            <UserPlus size={16} />
            Nuevo usuario
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive font-sans-ui">
            {error}
            <button onClick={fetchUsers} className="ml-2 underline">Reintentar</button>
          </div>
        )}

        {/* Formulario de creación */}
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 bg-card border border-card-border rounded-lg p-4 space-y-3">
            <h3 className="font-sans-ui font-semibold text-sm">Crear nuevo usuario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Email"
                required
                className="px-3 py-2 text-sm font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="px-3 py-2 text-sm font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre visible (opcional)"
                className="px-3 py-2 text-sm font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="px-3 py-2 text-sm font-sans-ui border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="author">Autor</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-sans-ui border border-border rounded-md hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={creating}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-sans-ui font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
                {creating ? "Creando…" : "Crear usuario"}
              </button>
            </div>
          </form>
        )}

        {/* Tabla de usuarios */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground font-sans-ui">Cargando…</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground font-sans-ui">
              No hay usuarios todavía.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Rol</th>
                  <th className="text-right px-4 py-3 font-sans-ui font-medium text-xs text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-sans-ui text-sm font-medium">{user.displayName || "Sin nombre"}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground font-sans-ui">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        className="text-xs font-sans-ui font-medium border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="author">Autor</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
