import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Quote, Undo, Redo,
  Link as LinkIcon, Image as ImageIcon, Images,
  AlignLeft, AlignCenter, AlignRight,
  Heading2, Heading3, Minus,
  ZoomIn, ZoomOut, RotateCcw, X,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

// ── Lightbox minimalista para el editor ──────────────────────────────────────
function EditorLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const posAtDrag = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoom(0.4);
      if (e.key === "-") zoom(-0.4);
      if (e.key === "0") reset();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = useCallback((delta: number) => {
    setScale(s => {
      const next = Math.min(5, Math.max(1, s + delta));
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }); }, []);

  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    zoom(e.deltaY < 0 ? 0.35 : -0.35);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    posAtDrag.current = { ...pos };
    e.preventDefault();
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPos({
      x: posAtDrag.current.x + (e.clientX - dragOrigin.current.x),
      y: posAtDrag.current.y + (e.clientY - dragOrigin.current.y),
    });
  };
  const onMouseUp = () => { isDragging.current = false; };

  const btn = "flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors backdrop-blur-sm";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center select-none"
      onClick={onClose}
    >
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm"
        onClick={e => e.stopPropagation()}
      >
        <button className={btn} onClick={() => zoom(-0.4)} aria-label="Alejar"><ZoomOut size={15} /></button>
        <span className="text-white/60 text-[11px] font-mono w-10 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button className={btn} onClick={() => zoom(0.4)} aria-label="Acercar"><ZoomIn size={15} /></button>
        {scale > 1 && (
          <button className={btn} onClick={reset} aria-label="Restablecer"><RotateCcw size={14} /></button>
        )}
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button className={btn} onClick={onClose} aria-label="Cerrar"><X size={15} /></button>
      </div>
      <div
        style={{ cursor: scale > 1 ? (isDragging.current ? "grabbing" : "grab") : "zoom-out" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={e => { if (scale === 1) onClose(); else e.stopPropagation(); }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            maxWidth: "92vw",
            maxHeight: "88vh",
            objectFit: "contain",
            transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`,
            transition: isDragging.current ? "none" : "transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94)",
            transformOrigin: "center center",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        />
      </div>
      {alt && (
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <span className="inline-block bg-black/60 text-white/70 text-[11px] px-4 py-1.5 rounded-full max-w-md">
            {alt}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Editor principal ─────────────────────────────────────────────────────────
export default function RichEditor({ value, onChange }: Props) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadingGrid, setUploadingGrid] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Escribe el contenido del artículo aquí..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "article-body focus:outline-none min-h-[400px] p-4",
      },
      handleClickOn(_view, _pos, node, _nodePos, event) {
        if (node.type.name === "image") {
          event.preventDefault();
          setLightbox({ src: node.attrs.src as string, alt: (node.attrs.alt as string | null) ?? "" });
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.url as string;
    } catch {
      return null;
    }
  };

  // ── Insertar imagen simple ───────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    } else {
      alert("No se pudo subir la imagen. Inténtalo de nuevo.");
    }
  };

  // ── Insertar fila de hasta 2 imágenes ───────────────────────────────────
  const handleGridUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 2);
    e.target.value = "";
    if (files.length === 0 || !editor) return;

    setUploadingGrid(true);
    const urls = await Promise.all(files.map(uploadFile));
    setUploadingGrid(false);

    const valid = urls.filter(Boolean) as string[];
    if (valid.length === 0) {
      alert("No se pudieron subir las imágenes. Inténtalo de nuevo.");
      return;
    }

    if (valid.length === 1) {
      editor.chain().focus().setImage({ src: valid[0], alt: "" }).run();
      return;
    }

    // Dos imágenes consecutivas: la vista pública las agrupa en cuadrícula de 2 columnas
    editor.chain()
      .focus()
      .setImage({ src: valid[0], alt: "" })
      .setImage({ src: valid[1], alt: "" })
      .run();
  };

  const addLink = () => {
    if (!editor) return;
    const url = window.prompt("URL del enlace:", editor.getAttributes("link").href ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) return null;

  const ToolbarButton = ({
    active,
    onClick,
    children,
    title,
    disabled,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground/70 hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
      {lightbox && (
        <EditorLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="border border-input rounded-lg overflow-hidden bg-background">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30">
          <ToolbarButton title="Deshacer" onClick={() => editor.chain().focus().undo().run()}>
            <Undo size={15} />
          </ToolbarButton>
          <ToolbarButton title="Rehacer" onClick={() => editor.chain().focus().redo().run()}>
            <Redo size={15} />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton title="Negrita" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton title="Cursiva" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={15} />
          </ToolbarButton>
          <ToolbarButton title="Subrayado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={15} />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton title="Encabezado 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 size={15} />
          </ToolbarButton>
          <ToolbarButton title="Encabezado 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 size={15} />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={15} />
          </ToolbarButton>
          <ToolbarButton title="Cita" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote size={15} />
          </ToolbarButton>
          <ToolbarButton title="Línea horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={15} />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton title="Alinear izquierda" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft size={15} />
          </ToolbarButton>
          <ToolbarButton title="Centrar" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter size={15} />
          </ToolbarButton>
          <ToolbarButton title="Alinear derecha" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight size={15} />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton title="Insertar enlace" active={editor.isActive("link")} onClick={addLink}>
            <LinkIcon size={15} />
          </ToolbarButton>

          {/* Imagen simple */}
          <ToolbarButton
            title={uploading ? "Subiendo imagen…" : "Insertar imagen"}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading
              ? <span className="w-[15px] h-[15px] border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
              : <ImageIcon size={15} />
            }
          </ToolbarButton>

          {/* Fila de 2 imágenes */}
          <ToolbarButton
            title={uploadingGrid ? "Subiendo imágenes…" : "Insertar fila de 2 imágenes"}
            disabled={uploadingGrid}
            onClick={() => gridInputRef.current?.click()}
          >
            {uploadingGrid
              ? <span className="w-[15px] h-[15px] border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
              : <Images size={15} />
            }
          </ToolbarButton>

          {/* Inputs ocultos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <input
            ref={gridInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGridUpload}
          />
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />

        {/* Hint para imágenes en el editor */}
        <div className="px-4 pb-2 pt-0">
          <p className="text-[11px] text-muted-foreground/60">
            Haz clic en cualquier imagen del editor para ampliarla · Usa <Images size={10} className="inline mb-0.5" /> para insertar 2 imágenes en fila (selecciona ambas a la vez)
          </p>
        </div>
      </div>
    </>
  );
}
