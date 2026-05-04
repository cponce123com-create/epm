import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight, FolderOpen, Folder } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useGetCategories } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  parentId: number | null;
  order: number;
  articleCount: number;
}

interface CategoryFormData {
  name: string;
  slug: string;
  color: string;
  description: string;
  parentId: number | null;
  order: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const PRESET_COLORS = [
  "#e53e3e", "#dd6b20", "#d69e2e", "#38a169",
  "#3182ce", "#805ad5", "#d53f8c", "#2d3748",
  "#718096", "#319795",
];

const emptyForm = (): CategoryFormData => ({
  name: "",
  slug: "",
  color: "#3182ce",
  description: "",
  parentId: null,
  order: 0,
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function Categories() {
  const { data: categoriesRaw, isLoading } = useGetCategories();
  const categories = (categoriesRaw ?? []) as Category[];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { token } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const topLevel = categories.filter((c) => c.parentId === null);
  const getChildren = (parentId: number) =>
    categories.filter((c) => c.parentId === parentId);

  const openNew = (parentId: number | null = null) => {
    setEditingId(null);
    setForm({ ...emptyForm(), parentId });
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      color: cat.color,
      description: cat.description ?? "",
      parentId: cat.parentId,
      order: cat.order,
    });
    setShowForm(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      // Solo auto-genera slug cuando es categoría nueva
      slug: editingId ? f.slug : slugify(name),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `${API_BASE}/api/admin/categories/${editingId}`
        : `${API_BASE}/api/admin/categories`;
      const method = editingId ? "PUT" : "POST";

      const payload = {
        ...form,
        parentId: form.parentId ?? null,
        description: form.description || null,
      };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        description: editingId ? "Categoría actualizada." : "Categoría creada correctamente.",
      });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    } catch (err: any) {
      toast({ description: err.message ?? "Error al guardar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (
      !confirm(
        `¿Eliminar la categoría "${cat.name}"?\n\nEsta acción no se puede deshacer.`
      )
    )
      return;

    setDeletingId(cat.id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/categories/${cat.id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al eliminar");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ description: "Categoría eliminada." });
    } catch (err: any) {
      toast({ description: err.message ?? "Error al eliminar.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const CategoryRow = ({
    cat,
    depth = 0,
  }: {
    cat: Category;
    depth?: number;
  }) => {
    const children = getChildren(cat.id);
    return (
      <>
        <tr className="border-b border-border hover:bg-muted/30 transition-colors">
          <td className="py-3 px-4">
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: depth * 20 }}
            >
              {children.length > 0 ? (
                <FolderOpen size={15} className="text-muted-foreground shrink-0" />
              ) : depth > 0 ? (
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              ) : (
                <Folder size={15} className="text-muted-foreground shrink-0" />
              )}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-sans-ui text-sm font-medium">{cat.name}</span>
            </div>
          </td>
          <td className="py-3 px-4 text-sm font-sans-ui text-muted-foreground font-mono">
            {cat.slug}
          </td>
          <td className="py-3 px-4 text-sm font-sans-ui text-center">
            {cat.articleCount}
          </td>
          <td className="py-3 px-4">
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => openNew(cat.id)}
                title="Agregar subcategoría"
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => openEdit(cat)}
                title="Editar"
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(cat)}
                disabled={deletingId === cat.id}
                title="Eliminar"
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        </tr>
        {children.map((child) => (
          <CategoryRow key={child.id} cat={child} depth={depth + 1} />
        ))}
      </>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Categorías</h1>
            <p className="text-sm font-sans-ui text-muted-foreground mt-0.5">
              Gestiona las categorías y subcategorías del sitio
            </p>
          </div>
          <button
            onClick={() => openNew(null)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            Nueva categoría
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="bg-card border border-card-border rounded-lg p-6 mb-6 space-y-4">
            <h2 className="font-display font-semibold text-base">
              {editingId
                ? "Editar categoría"
                : form.parentId
                ? "Nueva subcategoría"
                : "Nueva categoría"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: Política local"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 text-sm font-sans-ui font-mono border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="politica-local"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Descripción (opcional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Descripción breve de la categoría"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Color */}
              <div>
                <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor:
                          form.color === c ? "#000" : "transparent",
                        transform:
                          form.color === c ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="w-7 h-7 rounded cursor-pointer border border-input"
                    title="Color personalizado"
                  />
                </div>
              </div>

              {/* Categoría padre */}
              <div>
                <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                  Categoría padre
                </label>
                <select
                  value={form.parentId ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      parentId: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    }))
                  }
                  className="w-full px-3 py-2.5 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Sin padre (categoría raíz) —</option>
                  {topLevel
                    .filter((c) => c.id !== editingId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm());
                }}
                className="px-4 py-2 text-sm font-sans-ui border border-input rounded-md hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-sans-ui font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving
                  ? "Guardando..."
                  : editingId
                  ? "Guardar cambios"
                  : "Crear categoría"}
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-10 text-center text-sm font-sans-ui text-muted-foreground">
              No hay categorías todavía. Crea la primera con el botón de arriba.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="py-2.5 px-4 text-left text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground">
                    Nombre
                  </th>
                  <th className="py-2.5 px-4 text-left text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground">
                    Slug
                  </th>
                  <th className="py-2.5 px-4 text-center text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground">
                    Artículos
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {topLevel.map((cat) => (
                  <CategoryRow key={cat.id} cat={cat} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
