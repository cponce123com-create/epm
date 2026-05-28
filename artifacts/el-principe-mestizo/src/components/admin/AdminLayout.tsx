import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  PenSquare,
  FolderOpen,
  Tags,
  MessageSquare,
  Flag,
  Users,
  UserPlus,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Bell,
  User,
  Image,
  Globe,
  HelpCircle,
  PlusCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useInactivity } from "@/hooks/useInactivity";

type NavGroup = {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  children: { label: string; href: string; badge?: number; show?: boolean }[];
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Contenido": true,
    "Comentarios": true,
  });
  const { logout, user, token } = useAuth();
  const { showWarning, dismissWarning } = useInactivity(() => {
    logout();
    window.location.href = "/admin/login";
  }, 30 * 60 * 1000);

  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingComments, setPendingComments] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? "";
        const headers = { Authorization: `Bearer ${token}` };

        const [notifRes, statsRes] = await Promise.all([
          fetch(`${apiUrl}/api/notifications/unread-count`, { headers }),
          fetch(`${apiUrl}/api/admin/stats`, { headers }),
        ]);

        if (notifRes.ok) {
          const data = await notifRes.json();
          setUnreadCount(data.count ?? 0);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setPendingComments(data.pendingComments ?? 0);
        }
      } catch { /* quiet */ }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  const role = user?.role;
  const isSuperAdmin = role === "superadmin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isEditor = role === "editor" || isAdmin;

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const navGroups: NavGroup[] = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      children: [
        { label: "Resumen", href: "/admin/dashboard" },
      ],
    },
    {
      label: "Contenido",
      icon: FileText,
      children: [
        { label: "Artículos", href: "/admin/articles" },
        { label: "Nuevo artículo", href: "/admin/articles/new" },
        { label: "Categorías", href: "/admin/categories", show: isAdmin },
      ],
    },
    {
      label: "Comentarios",
      icon: MessageSquare,
      children: [
        { label: "Pendientes", href: "/admin/comments", badge: pendingComments },
        { label: "Reportados", href: "/admin/comments?status=reported", show: isAdmin },
      ],
    },
    {
      label: "Usuarios",
      icon: Users,
      children: [
        { label: "Lista de usuarios", href: "/admin/users", show: isSuperAdmin },
        { label: "Editores", href: "/admin/editors", show: isAdmin },
      ],
    },
    {
      label: "Configuración",
      icon: Settings,
      children: [
        { label: "General", href: "/admin/settings", show: isSuperAdmin },
        { label: "Importar Medium", href: "/admin/import-medium", show: isSuperAdmin },
      ],
    },
    {
      label: "Auditoría",
      icon: ScrollText,
      children: [
        { label: "Registro de actividad", href: "/admin/audit-logs", show: isAdmin },
      ],
    },
  ];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? "" : "h-screen"}`}>
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="font-display text-lg font-bold text-sidebar-foreground">El Príncipe Mestizo</div>
        <div className="font-sans-ui text-xs text-[hsl(35_15%_50%)] mt-0.5">Panel de administración</div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navGroups.map((group) => {
          const visibleChildren = group.children.filter(c => c.show !== false);
          if (visibleChildren.length === 0) return null;

          const GroupIcon = group.icon;
          const isExpanded = expandedGroups[group.label] ?? false;

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-sans-ui font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                <GroupIcon size={14} />
                <span className="flex-1 text-left">{group.label}</span>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isExpanded && (
                <div className="ml-2 space-y-0.5 mt-0.5">
                  {visibleChildren.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-sans-ui transition-colors ${
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <span className="flex-1">{item.label}</span>
                        {item.badge != null && item.badge > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                        {active && <ChevronRight size={14} />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
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

      {/* Inactivity warning */}
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

      {/* Floating "Nueva noticia" button */}
      <Link
        href="/admin/articles/new"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-full shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all"
      >
        <PlusCircle size={18} />
        Nueva noticia
      </Link>
    </div>
  );
}
