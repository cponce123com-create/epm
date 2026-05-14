import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import { User, Lock, Save, Camera } from "lucide-react";

export default function MyProfile() {
  const { token, user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL ?? "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [tw, setTw] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Stats
  const [stats, setStats] = useState<{ total: number; published: number; inReview: number; draft: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.email.split("@")[0]);

    // Fetch own stats
    fetch(`${apiUrl}/api/admin/editors/${user.userId}/articles`, { headers })
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch(`${apiUrl}/api/admin/editors/${user?.userId}`, {
      method: "PUT", headers,
      body: JSON.stringify({ displayName, bio, twitterHandle: tw }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { alert("Las contraseñas no coinciden"); return; }
    if (newPw.length < 6) { alert("La nueva contraseña debe tener al menos 6 caracteres"); return; }
    setPwSaving(true);
    // Password change would require a dedicated endpoint; for now alert
    alert("Función de cambio de contraseña próximamente.");
    setPwSaving(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  };

  return (
    <AdminLayout>
      <div className="max-w-xl mx-auto space-y-8">
        <h1 className="font-display text-2xl font-bold text-gray-900">Mi perfil</h1>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-display text-xl font-bold">
            {(displayName || user?.email || "U").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-sans-ui font-semibold text-gray-800">{user?.email}</p>
            <p className="text-xs text-gray-400 font-sans-ui uppercase">{user?.role}</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, color: "bg-gray-100 text-gray-700" },
              { label: "Publicados", value: stats.published, color: "bg-green-100 text-green-700" },
              { label: "En revisión", value: stats.inReview, color: "bg-yellow-100 text-yellow-700" },
              { label: "Borradores", value: stats.draft, color: "bg-gray-100 text-gray-500" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 text-center ${s.color}`}>
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-[10px] font-sans-ui font-semibold uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Info form */}
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-gray-800">Información personal</h3>
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-400 uppercase mb-1">Nombre</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-400 uppercase mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-gray-400"
              placeholder="Cuéntanos sobre ti..." />
          </div>
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-400 uppercase mb-1">Twitter</label>
            <input type="text" value={tw} onChange={(e) => setTw(e.target.value)} placeholder="@usuario"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-sans-ui font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar"}
          </button>
        </form>

        {/* Password form */}
        <form onSubmit={handlePassword} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-gray-800">Cambiar contraseña</h3>
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-400 uppercase mb-1">Actual</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-400 uppercase mb-1">Nueva</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-400 uppercase mb-1">Confirmar nueva</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={6}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400" />
          </div>
          <button type="submit" disabled={pwSaving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-sans-ui font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Lock size={14} />
            {pwSaving ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
