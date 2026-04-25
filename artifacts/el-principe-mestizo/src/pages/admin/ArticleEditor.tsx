import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Globe, EyeOff, Upload, X } from "lucide-react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import RichEditor from "@/components/admin/RichEditor";
import {
  useGetArticleBySlug,
  useGetCategories,
  useAdminCreateArticle,
  useAdminUpdateArticle,
  useAdminGetArticles,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface FormState {
  title: string;
  summary: string;
  content: string;
  categoryId: number;
  status: "draft" | "published";
  featured: boolean;
  coverImageUrl: string;
  coverImageAlt: string;
}

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<FormState>({
    title: "",
    summary: "",
    content: "",
    categoryId: 0,
    status: "draft",
    featured: false,
    coverImageUrl: "",
    coverImageAlt: "",
  });

  // For editing: find the article in admin list (returns Article[] not paginated)
  const { data: adminArticles } = useAdminGetArticles({ limit: 200 }, {
    query: { enabled: isEdit },
  });
  const articleFromList = adminArticles?.find((a: any) => String(a.id) === id);

  const { data: categories } = useGetCategories();
  const createArticle = useAdminCreateArticle();
  const updateArticle = useAdminUpdateArticle();

  // Populate form when editing
  useEffect(() => {
    if (isEdit && articleFromList) {
      setForm({
        title: articleFromList.title,
        summary: articleFromList.summary,
        content: articleFromList.content,
        categoryId: articleFromList.categoryId,
        status: articleFromList.status as "draft" | "published",
        featured: articleFromList.isFeatured,
        coverImageUrl: articleFromList.coverImageUrl ?? "",
        coverImageAlt: articleFromList.coverImageAlt ?? "",
      });
    }
  }, [articleFromList, isEdit]);

  // Set default category once categories load
  useEffect(() => {
    if (categories && categories.length > 0 && form.categoryId === 0 && !isEdit) {
      setForm(f => ({ ...f, categoryId: categories[0].id }));
    }
  }, [categories, isEdit]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setForm(f => ({ ...f, coverImageUrl: data.url }));
        toast({ description: "Imagen de portada cargada." });
      }
    } catch {
      toast({ description: "Error al cargar la imagen.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (publishStatus?: "draft" | "published") => {
    const status = publishStatus ?? form.status;
    if (!form.title.trim()) {
      toast({ description: "El título es obligatorio.", variant: "destructive" });
      return;
    }
    if (!form.summary.trim()) {
      toast({ description: "El resumen es obligatorio.", variant: "destructive" });
      return;
    }
    if (!form.content || form.content === "<p></p>") {
      toast({ description: "El contenido es obligatorio.", variant: "destructive" });
      return;
    }
    if (!form.categoryId) {
      toast({ description: "Selecciona una categoría.", variant: "destructive" });
      return;
    }

    const payload = {
      title: form.title,
      summary: form.summary,
      content: form.content,
      categoryId: form.categoryId,
      status,
      featured: form.featured,
      coverImageUrl: form.coverImageUrl || null,
      coverImageAlt: form.coverImageAlt || null,
    };

    try {
      if (isEdit && id) {
        await updateArticle.mutateAsync({ id: Number(id), data: payload });
        toast({ description: status === "published" ? "Artículo publicado." : "Borrador guardado." });
        queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
        setLocation("/admin/articles");
      } else {
        const created = await createArticle.mutateAsync({ data: payload });
        toast({ description: status === "published" ? "Artículo publicado." : "Borrador guardado." });
        queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
        setLocation("/admin/articles");
      }
    } catch (err: any) {
      toast({ description: "Error al guardar el artículo.", variant: "destructive" });
    }
  };

  const isSaving = createArticle.isPending || updateArticle.isPending;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/articles" className="p-1.5 rounded hover:bg-muted transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-display text-xl font-bold">
              {isEdit ? "Editar artículo" : "Nuevo artículo"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui font-medium border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-60"
            >
              <Save size={15} />
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={() => handleSave("published")}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-sans-ui font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {form.status === "published" ? <Globe size={15} /> : <Globe size={15} />}
              {isSaving ? "Guardando..." : "Publicar"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main editor area */}
          <div className="space-y-5">
            {/* Title */}
            <div>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Título del artículo"
                className="w-full px-4 py-3 font-display text-xl font-bold border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:font-serif placeholder:font-normal placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Resumen / bajada
              </label>
              <textarea
                value={form.summary}
                onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                rows={3}
                placeholder="Breve descripción que aparece en la tarjeta del artículo..."
                className="w-full px-3 py-2.5 text-sm font-serif border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-sans-ui font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Contenido
              </label>
              <RichEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
            </div>
          </div>

          {/* Sidebar panel */}
          <div className="space-y-4">
            {/* Publish status */}
            <div className="bg-card border border-card-border rounded-lg p-4">
              <h3 className="font-sans-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Estado
              </h3>
              <div className="flex gap-2">
                {(["draft", "published"] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={`flex-1 py-1.5 text-xs font-sans-ui font-medium rounded border transition-colors ${
                      form.status === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {s === "draft" ? "Borrador" : "Publicado"}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="bg-card border border-card-border rounded-lg p-4">
              <h3 className="font-sans-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Categoría
              </h3>
              <select
                value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Featured */}
            <div className="bg-card border border-card-border rounded-lg p-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span className="font-sans-ui text-sm font-medium">Artículo destacado</span>
              </label>
              <p className="text-xs font-sans-ui text-muted-foreground mt-1.5 ml-6.5">
                Aparece en la portada del sitio
              </p>
            </div>

            {/* Cover image */}
            <div className="bg-card border border-card-border rounded-lg p-4">
              <h3 className="font-sans-ui text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Imagen de portada
              </h3>
              {form.coverImageUrl ? (
                <div className="relative">
                  <img
                    src={form.coverImageUrl}
                    alt="Portada"
                    className="w-full aspect-video object-cover rounded-md mb-2"
                  />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, coverImageUrl: "", coverImageAlt: "" }))}
                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <input
                    type="text"
                    value={form.coverImageAlt}
                    onChange={e => setForm(f => ({ ...f, coverImageAlt: e.target.value }))}
                    placeholder="Texto alternativo (alt)..."
                    className="w-full px-2.5 py-1.5 text-xs font-sans-ui border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-6 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-md hover:bg-muted/50 transition-colors disabled:opacity-60"
                >
                  <Upload size={20} className="text-muted-foreground" />
                  <span className="text-xs font-sans-ui text-muted-foreground">
                    {uploading ? "Cargando..." : "Subir imagen"}
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
