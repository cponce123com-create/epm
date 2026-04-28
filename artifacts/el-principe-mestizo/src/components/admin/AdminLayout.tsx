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
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const isSuperAdmin = (user as any)?.role === "superadmin";

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    { label: "Artículos", icon: FileText, href: "/admin/articles" },
    { label: "Categorías", icon: FolderOpen, href: "/admin/categories" },
    { label: "Comentarios", icon: MessageSquare, href: "/admin/comments" },
    { label: "Importar Medium", icon: Upload, href: "/admin/import-medium" },
    ...(isSuperAdmin ? [{ label: "Configuración", icon: Settings, href: "/admin/settings" }] : []),
  ];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? "" : "h-screen"}`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="font-display text-lg font-bold text-sidebar-foreground">
          El Príncipe Mestizo
        </div>
        <div className="font-sans-ui text-xs text-[hsl(35_15%_50%)] mt-0.5">Panel de administración</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans-ui transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon size={16} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans-ui text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <ExternalLink size={16} />
          Ver sitio
        </a>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-sans-ui text-[hsl(355_72%_65%)] hover:bg-sidebar-accent transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar shrink-0 border-r border-sidebar-border">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-60 bg-sidebar flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <span className="font-display text-base font-bold text-sidebar-foreground">Admin</span>
              <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground">
                <X size={20} />
              </button>
            </div>
            <Sidebar mobile />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <button onClick={() => setSidebarOpen(true)} className="text-sidebar-foreground">
            <Menu size={20} />
          </button>
          <span className="font-display text-base font-bold text-sidebar-foreground">Admin</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
