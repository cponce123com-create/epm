import { useEditor, EditorContent, Node, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Quote, Undo, Redo,
  Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight,
  Heading2, Heading3, Minus, LayoutGrid,
  Captions,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

// ── Extensión Figure con caption ──────────────────────────────────────────
const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "image figcaption",
  draggable: true,
  parseHTML() { return [{ tag: "figure" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { class: "article-figure" }), 0];
  },
});

const Figcaption = Node.create({
  name: "figcaption",
  content: "inline*",
  parseHTML() { return [{ tag: "figcaption" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["figcaption", mergeAttributes(HTMLAttributes), 0];
  },
});

// ── Extensión ImageGrid (2 columnas) ────────────────────────────────────
const ImageGrid = Node.create({
  name: "imageGrid",
  group: "block",
  content: "image+",
  parseHTML() { return [{ tag: "div[data-image-grid]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, {
      "data-image-grid": "",
      class: "article-image-grid",
    }), 0];
  },
});

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export default function RichEditor({ value, onChange }: Props) {
  const { token } = useAuth();
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const gridFileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Escribe el contenido del artículo aquí..." }),
      Figure,
      Figcaption,
      ImageGrid,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "article-body focus:outline-none min-h-[400px] p-4" },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value]);

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      return data.url ?? null;
    } catch {
      return null;
    }
  };

  // Insertar imagen simple con caption opcional
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    e.target.value = "";
    const url = await uploadImage(file);
    if (url) {
      const caption = window.prompt("Agregar descripción/pie de foto (opcional):", "");
      if (caption !== null && caption.trim() !== "") {
        // Insertar como <figure><img/><figcaption>
        editor.chain().focus().insertContent([
          {
            type: "figure",
            content: [
              { type: "image", attrs: { src: url, alt: caption } },
              { type: "figcaption", content: [{ type: "text", text: caption }] },
            ],
          },
        ]).run();
      } else {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  };

  // Insertar 2 imágenes en grid (2 columnas)
  const handleGridUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 2);
    if (!files.length || !editor) return;
    e.target.value = "";
    const urls = await Promise.all(files.map(uploadImage));
    const validUrls = urls.filter(Boolean) as string[];
    if (validUrls.length > 0) {
      editor.chain().focus().insertContent([
        {
          type: "imageGrid",
          content: validUrls.map(src => ({ type: "image", attrs: { src } })),
        },
      ]).run();
    }
  };

  const addLink = () => {
    if (!editor) return;
    const url = window.prompt("URL del enlace:", editor.getAttributes("link").href ?? "");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  };

  if (!editor) return null;

  const TB = ({
    active, onClick, children, title,
  }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground/70 hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-input rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30">
        <TB title="Deshacer" onClick={() => editor.chain().focus().undo().run()}><Undo size={15} /></TB>
        <TB title="Rehacer" onClick={() => editor.chain().focus().redo().run()}><Redo size={15} /></TB>
        <div className="w-px h-5 bg-border mx-1" />
        <TB title="Negrita"   active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></TB>
        <TB title="Cursiva"   active={editor.isActive("italic")}    onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></TB>
        <TB title="Subrayado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></TB>
        <div className="w-px h-5 bg-border mx-1" />
        <TB title="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></TB>
        <TB title="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></TB>
        <div className="w-px h-5 bg-border mx-1" />
        <TB title="Lista"          active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></TB>
        <TB title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></TB>
        <TB title="Cita" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></TB>
        <TB title="Línea" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></TB>
        <div className="w-px h-5 bg-border mx-1" />
        <TB title="Alinear izq."  active={editor.isActive({ textAlign: "left" })}   onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={15} /></TB>
        <TB title="Centrar"       active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={15} /></TB>
        <TB title="Alinear der."  active={editor.isActive({ textAlign: "right" })}  onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={15} /></TB>
        <div className="w-px h-5 bg-border mx-1" />
        <TB title="Insertar enlace" active={editor.isActive("link")} onClick={addLink}><LinkIcon size={15} /></TB>
        {/* Imagen con caption opcional */}
        <TB title="Insertar imagen (con pie de foto)" onClick={() => fileInputRef.current?.click()}><ImageIcon size={15} /></TB>
        {/* 2 imágenes en columna */}
        <TB title="Insertar 2 imágenes en columna (selecciona hasta 2 archivos)" onClick={() => gridFileInputRef.current?.click()}>
          <LayoutGrid size={15} />
        </TB>

        <input ref={fileInputRef}     type="file" accept="image/*"           className="hidden" onChange={handleImageUpload} />
        <input ref={gridFileInputRef} type="file" accept="image/*" multiple   className="hidden" onChange={handleGridUpload} />
      </div>

      <EditorContent editor={editor} />

      {/* Leyenda de botones nuevos */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/20 flex gap-4 text-[10px] font-sans-ui text-muted-foreground">
        <span className="flex items-center gap-1"><ImageIcon size={10} /> Imagen + pie de foto opcional</span>
        <span className="flex items-center gap-1"><LayoutGrid size={10} /> 2 imágenes en columna (selecciona 2 archivos)</span>
      </div>
    </div>
  );
}
