import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Globe, Upload, X, CloudOff, CheckCircle2, Loader2 } from "lucide-react";
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
import { uploadToCloudinary } from "@/lib/cloudinaryUpload";
import { useQueryClient } from "@tanstack/react-query";

interface FormState {
  title: string;
  summary: string;
  content: string;
  categoryId: number;
  secondaryCategoryId: number | null;
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
    secondaryCategoryId: null,
    status: "draft",
    featured: false,
    coverImageUrl: "",
    coverImageAlt: "",
  });

  // For editing: find the article in admin list (returns Article[] not paginated)
  const { data: adminArticles } = useAdminGetArticles(
    {},
    {
      // @ts-expect-error - enabled prop may not be in the hook types
      enabled: isEdit,
    },
  );
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
        secondaryCategoryId:
          (articleFromList as any).secondaryCategoryId ?? null,
        status: articleFromList.status as "draft" | "published",
        featured: articleFromList.featured,
        coverImageUrl: articleFromList.coverImageUrl ?? "",
        coverImageAlt: articleFromList.coverImageAlt ?? "",
      });
    }
  }, [articleFromList, isEdit]);

  // Set default category once categories load
  useEffect(() => {
    if (
      categories &&
      categories.length > 0 &&
      form.categoryId === 0 &&
      !isEdit
    ) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }));
    }
  }, [categories, isEdit]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const response = await fetch(`${apiUrl}/api/admin/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al subir la imagen");
      }

      const result = await response.json();
      setForm((f) => ({ ...f, coverImageUrl: result.url }));
      toast({ description: "Imagen de portada cargada correctamente." });
    } catch (err: any) {
      toast({
        description: err.message ?? "Error al cargar la imagen.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const isSaving = createArticle.isPending || updateArticle.isPending;

  // ── Autoguardado ────────────────────────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const articleIdRef = useRef<number | null>(isEdit ? Number(id) : null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const doAutoSave = useCallback(async (currentForm: FormState) => {
    const articleId = articleIdRef.current;
    if (!articleId) return;
    if (
      !currentForm.title.trim() ||
      !currentForm.summary.trim() ||
      !currentForm.content ||
      currentForm.content === "<p></p>" ||
      !currentForm.categoryId
    ) return;

    setAutoSaveStatus("saving");
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/articles/${articleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: currentForm.title,
          summary: currentForm.summary,
          content: currentForm.content,
          categoryId: currentForm.categoryId,
          secondaryCategoryId: currentForm.secondaryCategoryId || null,
          status: "draft" as const,
          featured: currentForm.featured,
          coverImageUrl: currentForm.coverImageUrl || null,
          coverImageAlt: currentForm.coverImageAlt || null,
        }),
      });
      if (!res.ok) throw new Error();
      setAutoSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
    } catch {
      setAutoSaveStatus("error");
    }
  }, [token, queryClient]);

  // Debounce cada cambio de formulario → autoguardar a los 2 segundos
  useEffect(() => {
    if (!articleIdRef.current) return;
    if (
      !form.title.trim() ||
      !form.summary.trim() ||
      !form.content ||
      form.content === "<p></p>" ||
      !form.categoryId
    ) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doAutoSave(form), 2000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [form, doAutoSave]);

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
      secondaryCategoryId: form.secondaryCategoryId || null,
      status,
      featured: form.featured,
      coverImageUrl: form.coverImageUrl || null,
      coverImageAlt: form.coverImageAlt || null,
    };

    try {
      if (isEdit && id) {
        await updateArticle.mutateAsync({ id: Number(id), data: payload });
      } else {
        const result = await createArticle.mutateAsync({ data: payload });
        const newId = (result as any)?.id;
        if (newId) {
          articleIdRef.current = newId;
          window.history.replaceState(null, "", `/admin/articles/${newId}/edit`);
        }
      }
      toast({
        description: status === "published" ? "Artículo publicado." : "Borrador guardado.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      if (status === "published") {
        setLocation("/admin/articles");
      }
    } catch {
      toast({ description: "Error al guardar el artículo.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* ═══════════════════════════════════════════════════════════════
            HEADER — minimalista, fijo arriba
           ═══════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="flex items-center justify-between h-14 px-5 max-w-[1200px] mx-auto">
            {/* Izquierda: volver */}
            <Link
              href="/admin/articles"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Volver</span>
            </Link>

            {/* Centro: nombre del blog + estado autoguardado */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-serif italic text-gray-400 select-none">
                El Príncipe Mestizo
              </span>
              {articleIdRef.current && (
                <span className="flex items-center gap-1 text-[10px] font-sans-ui text-gray-400">
                  {autoSaveStatus === "saving" && (
                    <>
                      <Loader2 size={10} className="animate-spin text-yellow-500" />
                      <span className="text-yellow-600">Guardando...</span>
                    </>
                  )}
                  {autoSaveStatus === "saved" && (
                    <>
                      <CheckCircle2 size={10} className="text-green-500" />
                      <span className="text-green-600">Guardado</span>
                    </>
                  )}
                  {autoSaveStatus === "error" && (
                    <>
                      <CloudOff size={10} className="text-red-500" />
                      <span className="text-red-500">Error al guardar</span>
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Derecha: acciones */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-gray-600 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Guardar borrador</span>
              </button>
              <button
                type="button"
                onClick={() => handleSave("published")}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-1.5 text-sm font-medium text-white rounded-full transition-colors disabled:opacity-40"
                style={{ backgroundColor: "#8B0000" }}
              >
                <Globe size={14} />
                <span>{isSaving ? "Guardando…" : "Publicar"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            CUERPO — layout escritura centrada + sidebar derecho
           ═══════════════════════════════════════════════════════════════ */}
        <div className="flex justify-center">
          {/* Columna principal de escritura */}
          <div className="w-full max-w-[720px] px-5 sm:px-8 md:px-12 pt-10 pb-32">
            {/* ── Portada (hero) ──────────────────────────────────── */}
            {form.coverImageUrl && (
              <div className="relative mb-12 -mx-5 sm:-mx-8 md:-mx-12">
                <img
                  src={form.coverImageUrl}
                  alt={form.coverImageAlt || "Imagen de portada"}
                  className="w-full aspect-[2/1] object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      coverImageUrl: "",
                      coverImageAlt: "",
                    }))
                  }
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  title="Quitar imagen de portada"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ── Título ──────────────────────────────────────────── */}
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Título"
              className="w-full text-[36px] sm:text-[42px] font-serif font-bold leading-tight text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none focus:outline-none"
              style={{ fontFamily: "'Playfair Display', serif" }}
            />

            {/* ── Resumen / bajada ────────────────────────────────── */}
            <textarea
              value={form.summary}
              onChange={(e) =>
                setForm((f) => ({ ...f, summary: e.target.value }))
              }
              rows={2}
              placeholder="Breve resumen del artículo…"
              className="w-full mt-4 text-[18px] font-serif italic leading-relaxed text-gray-500 placeholder-gray-300 bg-transparent border-none outline-none focus:outline-none resize-none"
            />

            {/* ── Separador ───────────────────────────────────────── */}
            <div className="mt-8 mb-8 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-sans">
                Contenido
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── Editor de contenido ─────────────────────────────── */}
            <RichEditor
              value={form.content}
              onChange={(v) => setForm((f) => ({ ...f, content: v }))}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════
              SIDEBAR — fijo a la derecha (desktop), refinado
             ═══════════════════════════════════════════════════════ */}
          <aside className="hidden lg:block w-[260px] flex-shrink-0 pt-10 pr-5">
            <div className="sticky top-20 space-y-5">
              {/* ── Estado (Borrador / Publicado) ────────────────── */}
              <SidebarSection title="Estado">
                <div className="flex rounded-lg bg-gray-100 p-0.5">
                  {(["draft", "published"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        form.status === s
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {s === "draft" ? "Borrador" : "Publicado"}
                    </button>
                  ))}
                </div>
              </SidebarSection>

              {/* ── Categoría principal ──────────────────────────── */}
              <SidebarSection title="Categoría principal">
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      categoryId: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-sans text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors"
                >
                  {categories
                    ?.filter((c) => !(c as any).parentId)
                    .flatMap((parent) => {
                      const subs = categories.filter(
                        (c) => (c as any).parentId === parent.id,
                      );
                      return [
                        <option key={parent.id} value={parent.id}>
                          {parent.name}
                        </option>,
                        ...subs.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            ↳ {sub.name}
                          </option>
                        )),
                      ];
                    })}
                </select>
              </SidebarSection>

              {/* ── Categoría secundaria ─────────────────────────── */}
              <SidebarSection title="Categoría secundaria">
                <select
                  value={form.secondaryCategoryId ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      secondaryCategoryId: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-sans text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors"
                >
                  <option value="">— Ninguna —</option>
                  {categories
                    ?.filter(
                      (c) => c.id !== form.categoryId && !(c as any).parentId,
                    )
                    .flatMap((parent) => {
                      const subs = categories.filter(
                        (c) =>
                          (c as any).parentId === parent.id &&
                          c.id !== form.categoryId,
                      );
                      return [
                        <option key={parent.id} value={parent.id}>
                          {parent.name}
                        </option>,
                        ...subs.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            ↳ {sub.name}
                          </option>
                        )),
                      ];
                    })}
                </select>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                  Etiqueta adicional visible en el artículo
                </p>
              </SidebarSection>

              {/* ── Destacado ─────────────────────────────────────── */}
              <SidebarSection title="">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          featured: e.target.checked,
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-9 h-5 rounded-full transition-colors ${
                        form.featured ? "bg-gray-900" : "bg-gray-300"
                      }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        form.featured ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Artículo destacado
                  </span>
                </label>
                <p className="text-[11px] text-gray-400 mt-1.5 ml-12">
                  Aparece en la portada del sitio
                </p>
              </SidebarSection>

              {/* ── Imagen de portada ────────────────────────────── */}
              <SidebarSection title="Imagen de portada">
                {form.coverImageUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden">
                      <img
                        src={form.coverImageUrl}
                        alt="Portada"
                        className="w-full aspect-video object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            coverImageUrl: "",
                            coverImageAlt: "",
                          }))
                        }
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                        title="Quitar imagen"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.coverImageAlt}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          coverImageAlt: e.target.value,
                        }))
                      }
                      placeholder="Texto alternativo (alt)..."
                      className="w-full px-3 py-2 text-xs font-sans text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-300"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-6 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50/50 transition-colors disabled:opacity-50"
                    >
                      <Upload size={18} className="text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">
                        {uploading ? "Subiendo…" : "Subir imagen"}
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] text-gray-400">
                        o pega una URL
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <input
                      type="url"
                      placeholder="https://..."
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v) setForm((f) => ({ ...f, coverImageUrl: v }));
                      }}
                      className="w-full px-3 py-2 text-xs font-sans text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-300"
                    />
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  Se muestra al compartir en WhatsApp, Facebook y Twitter
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
              </SidebarSection>
            </div>
          </aside>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SIDEBAR MOBILE — al final, debajo del editor (móvil/tablet)
           ═══════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden max-w-[720px] mx-auto px-5 sm:px-8 md:px-12 pb-20 space-y-5">
          {/* ── Estado ────────────────────────────────────────────── */}
          <SidebarSection title="Estado">
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {(["draft", "published"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    form.status === s
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {s === "draft" ? "Borrador" : "Publicado"}
                </button>
              ))}
            </div>
          </SidebarSection>

          {/* ── Categoría principal ──────────────────────────────── */}
          <SidebarSection title="Categoría principal">
            <select
              value={form.categoryId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  categoryId: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 text-sm font-sans text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors"
            >
              {categories
                ?.filter((c) => !(c as any).parentId)
                .flatMap((parent) => {
                  const subs = categories.filter(
                    (c) => (c as any).parentId === parent.id,
                  );
                  return [
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>,
                    ...subs.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        ↳ {sub.name}
                      </option>
                    )),
                  ];
                })}
            </select>
          </SidebarSection>

          {/* ── Categoría secundaria ─────────────────────────────── */}
          <SidebarSection title="Categoría secundaria">
            <select
              value={form.secondaryCategoryId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  secondaryCategoryId: e.target.value
                    ? Number(e.target.value)
                    : null,
                }))
              }
              className="w-full px-3 py-2 text-sm font-sans text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors"
            >
              <option value="">— Ninguna —</option>
              {categories
                ?.filter(
                  (c) => c.id !== form.categoryId && !(c as any).parentId,
                )
                .flatMap((parent) => {
                  const subs = categories.filter(
                    (c) =>
                      (c as any).parentId === parent.id &&
                      c.id !== form.categoryId,
                  );
                  return [
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>,
                    ...subs.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        ↳ {sub.name}
                      </option>
                    )),
                  ];
                })}
            </select>
          </SidebarSection>

          {/* ── Destacado ─────────────────────────────────────────── */}
          <SidebarSection title="">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      featured: e.target.checked,
                    }))
                  }
                  className="sr-only"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors ${
                    form.featured ? "bg-gray-900" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    form.featured ? "translate-x-4" : ""
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Artículo destacado
              </span>
            </label>
          </SidebarSection>

          {/* ── Imagen de portada ────────────────────────────────── */}
          <SidebarSection title="Imagen de portada">
            {form.coverImageUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={form.coverImageUrl}
                    alt="Portada"
                    className="w-full aspect-video object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        coverImageUrl: "",
                        coverImageAlt: "",
                      }))
                    }
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <input
                  type="text"
                  value={form.coverImageAlt}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      coverImageAlt: e.target.value,
                    }))
                  }
                  placeholder="Texto alternativo (alt)..."
                  className="w-full px-3 py-2 text-xs font-sans text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-300"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-6 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50/50 transition-colors disabled:opacity-50"
                >
                  <Upload size={18} className="text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">
                    {uploading ? "Subiendo…" : "Subir imagen"}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] text-gray-400">
                    o pega una URL
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <input
                  type="url"
                  placeholder="https://..."
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) setForm((f) => ({ ...f, coverImageUrl: v }));
                  }}
                  className="w-full px-3 py-2 text-xs font-sans text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-300"
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </SidebarSection>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Componente helper para secciones del sidebar ─────────────────────────────
function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      {title && (
        <h3 className="text-[11px] font-sans font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
