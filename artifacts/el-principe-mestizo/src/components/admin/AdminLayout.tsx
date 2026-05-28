import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Upload,
  Flag,
  Bell,
  Users,
  Eye,
  User,
  PenSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useInactivity } from "@/hooks/useInactivity";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { logout, user, token } = useAuth();
  const { showWarning, dismissWarning } = useInactivity(() => {
    logout();
    window.location.href = "/admin/login";
  }, 30 * 60 * 1000);

  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread notifications every 60s
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? "";
        const res = await fetch(`${apiUrl}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch { /* quiet */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  const role = user?.role;
  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperAdmin = role === "superadmin";

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "Artículos", icon: FileText, href: "/admin/articles", show: true },
    { label: "Nuevo artículo", icon: PenSquare, href: "/admin/articles/new", show: true },
    { label: "Nacional", icon: Flag, href: "/admin/nacional", show: isSuperAdmin },
    { label: "Categorías", icon: FolderOpen, href: "/admin/categories", show: isAdmin },
    { label: "Cola de revisión", icon: Eye, href: "/admin/review", show: isAdmin },
    { label: "Comentarios", icon: MessageSquare, href: "/admin/comments", show: isAdmin },
    { label: "Editores", icon: Users, href: "/admin/editors", show: isAdmin },
    { label: "Importar Medium", icon: Upload, href: "/admin/import-medium", show: isSuperAdmin },
    { label: "Usuarios", icon: Users, href: "/admin/users", show: isSuperAdmin },
    { label: "Configuración", icon: Settings, href: "/admin/settings", show: isSuperAdmin },
  ].filter((x) => x.show);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? "" : "h-screen"}`}>
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="font-display text-lg font-bold text-sidebar-foreground">El Príncipe Mestizo</div>
        <div className="font-sans-ui text-xs text-[hsl(35_15%_50%)] mt-0.5">Panel de administración</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans-ui transition-colors ${
                active ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                       : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon size={16} /> {item.label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans-ui text-sidebar-foreground relative">
          <Bell size={16} /> Notificaciones
          {unreadCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <Link href="/admin/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans-ui text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <User size={16} /> Mi perfil
        </Link>
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans-ui text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <ExternalLink size={16} /> Ver sitio
        </a>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans-ui text-[hsl(355_72%_65%)] hover:bg-sidebar-accent transition-colors"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar shrink-0 border-r border-sidebar-border">
        <Sidebar />
      </aside>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-60 bg-sidebar flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <span className="font-display text-base font-bold text-sidebar-foreground">Admin</span>
              <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground"><X size={20} /></button>
            </div>
            <Sidebar mobile />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <button onClick={() => setSidebarOpen(true)} className="text-sidebar-foreground"><Menu size={20} /></button>
          <span className="font-display text-base font-bold text-sidebar-foreground">Admin</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      {/* Inactivity warning modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl text-center">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">!</span>
            </div>
            <h3 className="font-sans-ui text-sm font-semibold mb-1">Sesión por expirar</h3>
            <p className="font-sans-ui text-xs text-muted-foreground mb-4">
              Por inactividad, tu sesión se cerrará en menos de 1 minuto.
            </p>
            <button
              onClick={dismissWarning}
              className="w-full px-4 py-2 text-sm font-sans-ui bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Seguir navegando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
