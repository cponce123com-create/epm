import { useAuth } from "@/lib/auth";

export type UserRole = "superadmin" | "admin" | "editor" | "writer" | "reader";

export function useRole() {
  const { user } = useAuth();
  const role = (user?.role ?? "reader") as UserRole;

  return {
    role,

    /** Superadmin y Admin */
    isAdmin: role === "admin" || role === "superadmin",

    /** Solo Superadmin */
    isSuperAdmin: role === "superadmin",

    /** Editor y superiores: pueden publicar y moderar */
    isEditor: role === "editor" || role === "admin" || role === "superadmin",

    /** Writer: puede crear/editar sus propios borradores */
    isWriter: role === "writer" || role === "editor" || role === "admin" || role === "superadmin",

    /** Puede publicar artículos directamente (sin revisión) */
    canPublish: role === "admin" || role === "superadmin" || role === "editor",

    /** Puede moderar comentarios */
    canModerate: role === "admin" || role === "superadmin" || role === "editor",

    /** Puede gestionar usuarios */
    canManageUsers: role === "superadmin",

    /** Puede cambiar configuraciones del sitio */
    canManageSettings: role === "superadmin" || role === "admin",

    /** Puede ver registros de auditoría */
    canViewAudit: role === "superadmin" || role === "admin",
  };
}

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  editor: "Editor",
  writer: "Redactor",
  reader: "Lector",
};

export const ROLE_ICONS: Record<UserRole, string> = {
  superadmin: "🛡️",
  admin: "🔒",
  editor: "✏️",
  writer: "📝",
  reader: "👁️",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superadmin: "Acceso total al sistema",
  admin: "Gestiona contenido, moderación y configuración",
  editor: "Publica y modera comentarios",
  writer: "Crea y edita sus propios borradores",
  reader: "Solo lectura y comentarios en el sitio",
};
