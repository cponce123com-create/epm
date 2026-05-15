import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Images,
  Video,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading2,
  Heading3,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  ExternalLink,
  Pencil,
  Trash2,
  Expand,
  ImageUp,
  AlignStartVertical,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const ACCEPTED_IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ═══════════════════════════════════════════════════════════════════════════
// Link Popover
// ═══════════════════════════════════════════════════════════════════════════
function LinkPopover({
  initialUrl,
  onSave,
  onRemove,
  onClose,
  anchorEl,
}: {
  initialUrl: string;
  onSave: (url: string, openInNewTab: boolean) => void;
  onRemove: () => void;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [newTab, setNewTab] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed) {
      onSave(trimmed, newTab);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9998]"
      onClick={onClose}
    >
      <div
        className="absolute z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 p-3 min-w-[320px]"
        style={{
          top: anchorEl
            ? anchorEl.getBoundingClientRect().bottom + 8
            : "50%",
          left: anchorEl
            ? Math.min(
                anchorEl.getBoundingClientRect().left,
                window.innerWidth - 340,
              )
            : "50%",
          transform: anchorEl ? undefined : "translate(-50%, -50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <label className="block text-[11px] font-sans-ui font-semibold text-gray-500 uppercase tracking-wider">
            URL del enlace
          </label>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 text-sm font-sans-ui text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors placeholder-gray-300"
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newTab}
              onChange={(e) => setNewTab(e.target.checked)}
              className="rounded border-gray-300 text-gray-700 focus:ring-gray-400"
            />
            <span className="text-xs font-sans-ui text-gray-600">
              Abrir en nueva pestaña
            </span>
          </label>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-sans-ui text-red-500 hover:text-red-700 transition-colors"
            >
              Quitar enlace
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-sans-ui text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-sans-ui font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Lightbox
// ═══════════════════════════════════════════════════════════════════════════
function EditorLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
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
  }, []);

  const zoom = useCallback((delta: number) => {
    setScale((s) => {
      const next = Math.min(5, Math.max(1, s + delta));
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, []);

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
  const onMouseUp = () => {
    isDragging.current = false;
  };

  const btn =
    "flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors backdrop-blur-sm";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center select-none"
      onClick={onClose}
    >
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button className={btn} onClick={() => zoom(-0.4)} aria-label="Alejar">
          <ZoomOut size={15} />
        </button>
        <span className="text-white/60 text-[11px] font-mono w-10 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button className={btn} onClick={() => zoom(0.4)} aria-label="Acercar">
          <ZoomIn size={15} />
        </button>
        {scale > 1 && (
          <button className={btn} onClick={reset} aria-label="Restablecer">
            <RotateCcw size={14} />
          </button>
        )}
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button className={btn} onClick={onClose} aria-label="Cerrar">
          <X size={15} />
        </button>
      </div>
      <div
        style={{
          cursor:
            scale > 1 ? (isDragging.current ? "grabbing" : "grab") : "zoom-out",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={(e) => {
          if (scale === 1) onClose();
          else e.stopPropagation();
        }}
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
            transition: isDragging.current
              ? "none"
              : "transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94)",
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

// ═══════════════════════════════════════════════════════════════════════════
// Bubble button
// ═══════════════════════════════════════════════════════════════════════════
function BubbleBtn({
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
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? "bg-gray-200 text-gray-900"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Video Embed Modal
// ═══════════════════════════════════════════════════════════════════════════
function VideoEmbedModal({
  onClose,
  onEmbed,
}: {
  onClose: () => void;
  onEmbed: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    // Detect YouTube/Vimeo URLs
    const ytMatch = trimmed.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    );
    const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);

    if (ytMatch || vimeoMatch) {
      onEmbed(trimmed);
      onClose();
    } else {
      alert(
        "Por favor pega una URL válida de YouTube (youtube.com/watch?v=... o youtu.be/...) o Vimeo.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[340px]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-[11px] font-sans-ui font-semibold text-gray-500 uppercase tracking-wider">
            Insertar video
          </label>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
            className="w-full px-3 py-2 text-sm font-sans-ui text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors placeholder-gray-300"
          />
          <p className="text-[11px] text-gray-400 font-sans-ui">
            Compatible con YouTube y Vimeo
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-sans-ui text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-sans-ui font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Insertar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Image Options Popover (replaces simple lightbox)
// ═══════════════════════════════════════════════════════════════════════════
function ImageOptionsPopover({
  src,
  alt,
  width,
  align,
  onUpdate,
  onDelete,
  onPreview,
  onClose,
}: {
  src: string;
  alt: string;
  width: string | null;
  align: string | null;
  onUpdate: (attrs: { alt: string; width: string | null; align: string | null }) => void;
  onDelete: () => void;
  onPreview: () => void;
  onClose: () => void;
}) {
  const [altText, setAltText] = useState(alt);
  const [imgWidth, setImgWidth] = useState(width ?? "100%");
  const [imgAlign, setImgAlign] = useState(align ?? "center");

  const presetWidths = [
    { label: "Pequeño", value: "300px" },
    { label: "Mediano", value: "500px" },
    { label: "Grande", value: "800px" },
    { label: "Completo", value: "100%" },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = () => {
    onUpdate({
      alt: altText,
      width: imgWidth === "100%" ? null : imgWidth,
      align: imgAlign === "center" ? null : imgAlign,
    });
    onClose();
  };

  const btnBase =
    "px-2.5 py-1.5 text-xs font-sans-ui font-medium rounded-lg transition-all border";
  const btnActive = "bg-gray-900 text-white border-gray-900";
  const btnInactive = "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50";

  return (
    <div className="fixed inset-0 z-[9998] bg-black/20" onClick={onClose}>
      <div
        className="absolute z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 w-[380px] overflow-hidden"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview thumbnail */}
        <div className="relative bg-gray-100 h-40 flex items-center justify-center overflow-hidden">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
          <button
            type="button"
            onClick={onPreview}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            title="Vista previa con zoom"
          >
            <ZoomIn size={15} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Alt text */}
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Texto alternativo (alt)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe la imagen..."
              className="w-full px-3 py-2 text-sm font-sans-ui text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors placeholder-gray-300"
            />
          </div>

          {/* Width presets */}
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Tamaño
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {presetWidths.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setImgWidth(p.value)}
                  className={`${btnBase} ${
                    imgWidth === p.value ? btnActive : btnInactive
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-[11px] font-sans-ui font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Alineación
            </label>
            <div className="flex gap-1.5">
              {[
                { label: "Izquierda", value: "left", icon: <AlignLeft size={14} /> },
                { label: "Centro", value: "center", icon: <AlignCenter size={14} /> },
                { label: "Derecha", value: "right", icon: <AlignRight size={14} /> },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setImgAlign(opt.value)}
                  className={`${btnBase} flex items-center gap-1 ${
                    imgAlign === opt.value ? btnActive : btnInactive
                  }`}
                  title={opt.label}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans-ui text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Eliminar imagen
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-sans-ui text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-sans-ui font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Custom Image extension (supports width + alignment attributes)
// ═══════════════════════════════════════════════════════════════════════════
const CustomImage = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      "data-align": { default: null },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const { width, "data-align": align, ...rest } = HTMLAttributes;
    const style: string[] = [];
    if (width) style.push(`width:${width};max-width:100%`);
    if (align) style.push(`display:block;margin-${align === "left" ? "right" : align === "right" ? "left" : "0 auto"}:0`);
    else style.push("display:block;margin:0 auto");
    return [
      "img",
      {
        ...rest,
        style: style.join(";"),
      },
    ];
  },
  parseHTML() {
    return [{ tag: "img[src]" }];
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Main Editor
// ═══════════════════════════════════════════════════════════════════════════
export default function RichEditor({ value, onChange }: Props) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadingGrid, setUploadingGrid] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );
  const [imageOptions, setImageOptions] = useState<{
    src: string;
    alt: string;
    width: string | null;
    align: string | null;
    nodePos: number;
  } | null>(null);
  const [linkPopover, setLinkPopover] = useState<{
    url: string;
    anchorEl: HTMLElement | null;
  } | null>(null);
  const [videoModal, setVideoModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragDropPreview, setDragDropPreview] = useState<{
    url: string;
    top: number;
  } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
      CustomImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Comienza a escribir…" }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none focus:outline-none min-h-[500px] " +
          "text-[17px] leading-[1.8] text-gray-800 font-serif",
      },
      handleClickOn(_view, pos, node, _nodePos, event) {
        // Handle image click → open image options popover
        if (node.type.name === "image") {
          event.preventDefault();
          const attrs = node.attrs;
          setImageOptions({
            src: attrs.src as string,
            alt: (attrs.alt as string | null) ?? "",
            width: (attrs.width as string | null) ?? null,
            align: (attrs["data-align"] as string | null) ?? null,
            nodePos: _nodePos,
          });
          return true;
        }
        // Handle link click → open popover
        if (node.type.name === "text" && node.marks?.length) {
          const linkMark = node.marks.find((m) => m.type.name === "link");
          if (linkMark) {
            event.preventDefault();
            const href = linkMark.attrs.href as string;
            setLinkPopover({
              url: href,
              anchorEl: event.target as HTMLElement,
            });
            return true;
          }
        }
        return false;
      },
      // Drag & drop handler
      handleDrop(view, event, slice, moved) {
        if (!moved && event.dataTransfer?.files?.length) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter((f) =>
            ACCEPTED_IMAGE_TYPES.some((ext) =>
              f.name.toLowerCase().endsWith(ext),
            ),
          );

          if (imageFiles.length > 0) {
            event.preventDefault();
            const pos = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (pos) {
              imageFiles.forEach((file, i) => {
                // Create placeholder preview
                const reader = new FileReader();
                reader.onload = (e) => {
                  const dataUrl = e.target?.result as string;
                  // Insert at the drop position
                  editor
                    ?.chain()
                    .focus()
                    .setTextSelection(pos.pos)
                    .setImage({
                      src: dataUrl,
                      alt: file.name,
                    })
                    .run();
                };
                reader.readAsDataURL(file);
                // Then upload for real
                handleFileUpload(file).then((url) => {
                  if (url && editor) {
                    // Find the image in the content and replace the data URL with the real URL
                    const html = editor.getHTML();
                    const updated = html.replace(
                      new RegExp(`src="${escapeRegex(file.name)}"`),
                      `src="${url}" alt="${file.name}"`,
                    );
                    editor.commands.setContent(updated);
                  }
                });
              });
            }
            return true;
          }
        }
        return false;
      },
      handleDOMEvents: {
        drop: () => {
          setIsDragOver(false);
          setDragDropPreview(null);
          return false;
        },
        dragover: (view, event) => {
          if (event.dataTransfer?.files?.length) {
            const hasImages = Array.from(event.dataTransfer.files).some((f) =>
              ACCEPTED_IMAGE_TYPES.some((ext) =>
                f.name.toLowerCase().endsWith(ext),
              ),
            );
            if (hasImages) {
              setIsDragOver(true);
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (pos) {
                const coords = view.coordsAtPos(pos.pos);
                setDragDropPreview({ url: "", top: coords.top });
              }
              event.preventDefault();
              return true;
            }
          }
          return false;
        },
        dragleave: () => {
          setIsDragOver(false);
          setDragDropPreview(null);
          return false;
        },
        paste: (_view, event: ClipboardEvent) => {
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) continue;

              setUploading(true);
              setUploadProgress(0);
              const progressInterval = setInterval(() => {
                setUploadProgress((p) => Math.min(90, p + 10));
              }, 200);

              // Insert placeholder (data URL) immediately
              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                editor
                  ?.chain()
                  .focus()
                  .setImage({ src: dataUrl, alt: "Pegando…" })
                  .run();
              };
              reader.onerror = () => {
                clearInterval(progressInterval);
                setUploading(false);
              };
              reader.readAsDataURL(file);

              // Upload to server
              uploadFile(file).then((url) => {
                clearInterval(progressInterval);
                setUploading(false);
                if (url && editor) {
                  const html = editor.getHTML();
                  // Replace the first data:image URL with the real URL
                  const finalHtml = html.replace(
                    /src="data:image\/[^"]+"/,
                    `src="${url}" alt="Pegado desde portapapeles"`,
                  );
                  if (finalHtml !== html) {
                    editor.commands.setContent(finalHtml);
                  }
                }
              });
              return true;
            }
          }
          return false;
        },
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value]);

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al subir archivo");
      }
      const json = await res.json();
      return json.url as string;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  const uploadVideoFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("image", file); // reuse same endpoint
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${apiUrl}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al subir video");
      }
      const json = await res.json();
      return json.url as string;
    } catch (err) {
      console.error("Video upload failed:", err);
      return null;
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert(
        `El archivo "${file.name}" excede el límite de 10MB. Por favor elige un archivo más pequeño.`,
      );
      return null;
    }
    return uploadFile(file);
  };

  // ── Insertar imagen simple ───────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(90, p + 10));
    }, 200);

    const url = await uploadFile(file);
    clearInterval(progressInterval);
    setUploadProgress(100);
    setUploading(false);

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    } else {
      alert(`No se pudo subir "${file.name}". Verifica el tamaño y formato.`);
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

    // Two consecutive images for 2-column grid
    editor
      .chain()
      .focus()
      .setImage({ src: valid[0], alt: "" })
      .setImage({ src: valid[1], alt: "" })
      .run();
  };

  // ── Insertar video local ────────────────────────────────────────────────
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    if (file.size > MAX_FILE_SIZE * 5) {
      alert("El video excede el límite de 50MB.");
      return;
    }

    setUploadingVideo(true);
    const url = await uploadVideoFile(file);
    setUploadingVideo(false);

    if (url) {
      const videoHtml = `<video controls style="width:100%;max-height:500px;background:#000;border-radius:4px" preload="metadata" playsinline><source src="${url}" type="${file.type || 'video/mp4'}" /></video>`;
      editor.chain().focus().insertContent(videoHtml).run();
    } else {
      alert("No se pudo subir el video. Inténtalo de nuevo.");
    }
  };

  // ── Insertar YouTube/Vimeo embed ────────────────────────────────────────
  const handleVideoEmbed = (url: string) => {
    if (!editor) return;

    let embedHtml = "";
    const ytMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    );
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

    if (ytMatch) {
      embedHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:1.5rem 0;background:#000;border-radius:4px"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>`;
    } else if (vimeoMatch) {
      embedHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:1.5rem 0;background:#000;border-radius:4px"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe></div>`;
    }

    if (embedHtml) {
      editor.chain().focus().insertContent(embedHtml).run();
    }
  };

  // ── Link handling ───────────────────────────────────────────────────────
  const addLink = useCallback(() => {
    if (!editor) return;
    const currentHref = editor.getAttributes("link").href ?? "";
    setLinkPopover({
      url: currentHref,
      anchorEl: null,
    });
  }, [editor]);

  const handleLinkSave = useCallback(
    (url: string, openInNewTab: boolean) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href: url,
          target: openInNewTab ? "_blank" : null,
        })
        .run();
      setLinkPopover(null);
    },
    [editor],
  );

  const handleLinkRemove = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setLinkPopover(null);
  }, [editor]);

  // ── Image options handlers ─────────────────────────────────────────
  const handleImageUpdate = useCallback(
    (attrs: { alt: string; width: string | null; align: string | null }) => {
      if (!editor || !imageOptions) return;
      editor
        .chain()
        .focus()
        .setNodeSelection(imageOptions.nodePos)
        .updateAttributes("image", {
          alt: attrs.alt,
          width: attrs.width,
          "data-align": attrs.align,
        })
        .run();
    },
    [editor, imageOptions],
  );

  const handleImageDelete = useCallback(() => {
    if (!editor || !imageOptions) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(imageOptions.nodePos)
      .deleteSelection()
      .run();
    setImageOptions(null);
  }, [editor, imageOptions]);

  const handleImagePreview = useCallback(() => {
    if (!imageOptions) return;
    setLightbox({
      src: imageOptions.src,
      alt: imageOptions.alt,
    });
  }, [imageOptions]);

  if (!editor) return null;

  const separator = <div className="w-px h-5 bg-gray-200" />;

  return (
    <>
      {lightbox && (
        <EditorLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}

      {imageOptions && (
        <ImageOptionsPopover
          src={imageOptions.src}
          alt={imageOptions.alt}
          width={imageOptions.width}
          align={imageOptions.align}
          onUpdate={handleImageUpdate}
          onDelete={handleImageDelete}
          onPreview={handleImagePreview}
          onClose={() => setImageOptions(null)}
        />
      )}

      {linkPopover && (
        <LinkPopover
          initialUrl={linkPopover.url}
          onSave={handleLinkSave}
          onRemove={handleLinkRemove}
          onClose={() => setLinkPopover(null)}
          anchorEl={linkPopover.anchorEl}
        />
      )}

      {videoModal && (
        <VideoEmbedModal
          onClose={() => setVideoModal(false)}
          onEmbed={handleVideoEmbed}
        />
      )}

      <div ref={editorContainerRef} className="relative">
        {/* ── Drag & drop overlay ──────────────────────────────────── */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-6 text-center">
              <ImageIcon size={28} className="mx-auto text-blue-400 mb-2" />
              <p className="text-sm font-sans-ui text-blue-600 font-medium">
                Suelta imágenes aquí
              </p>
            </div>
          </div>
        )}

        {/* ── Drop indicator line ──────────────────────────────────── */}
        {dragDropPreview && (
          <div
            className="absolute left-0 right-0 z-40 pointer-events-none border-t-2 border-blue-400"
            style={{ top: dragDropPreview.top }}
          />
        )}

        {/* ── Bubble toolbar ───────────────────────────────────────── */}
        {editor && (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-0.5 px-1.5 py-1 bg-white rounded-xl shadow-lg border border-gray-200/80 backdrop-blur-sm"
          >
            <BubbleBtn
              title="Negrita"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={14} />
            </BubbleBtn>
            <BubbleBtn
              title="Cursiva"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={14} />
            </BubbleBtn>
            <BubbleBtn
              title="Subrayado"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={14} />
            </BubbleBtn>
            <BubbleBtn
              title="Enlace"
              active={editor.isActive("link")}
              onClick={addLink}
            >
              <LinkIcon size={14} />
            </BubbleBtn>

            {separator}

            <BubbleBtn
              title="Título 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading2 size={14} />
            </BubbleBtn>
            <BubbleBtn
              title="Título 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              <Heading3 size={14} />
            </BubbleBtn>

            {separator}

            <BubbleBtn
              title="Lista"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={14} />
            </BubbleBtn>
            <BubbleBtn
              title="Lista numerada"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={14} />
            </BubbleBtn>
            <BubbleBtn
              title="Cita"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote size={14} />
            </BubbleBtn>

            {separator}

            <BubbleBtn
              title="Alinear izquierda"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft size={14} />
            </BubbleBtn>
            <BubbleBtn
              title="Centrar"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
            >
              <AlignCenter size={14} />
            </BubbleBtn>
            <BubbleBtn
              title="Alinear derecha"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight size={14} />
            </BubbleBtn>

            {separator}

            <BubbleBtn
              title="Línea horizontal"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus size={14} />
            </BubbleBtn>
          </BubbleMenu>
        )}

        {/* ── Editor content ─────────────────────────────────────── */}
        <div
          onDragOver={(e) => {
            if (
              Array.from(e.dataTransfer.files).some((f) =>
                ACCEPTED_IMAGE_TYPES.some((ext) =>
                  f.name.toLowerCase().endsWith(ext),
                ),
              )
            ) {
              e.preventDefault();
              setIsDragOver(true);
            }
          }}
          onDragLeave={() => {
            setIsDragOver(false);
            setDragDropPreview(null);
          }}
          onDrop={(e) => {
            const files = Array.from(e.dataTransfer.files);
            const imageFiles = files.filter((f) =>
              ACCEPTED_IMAGE_TYPES.some((ext) =>
                f.name.toLowerCase().endsWith(ext),
              ),
            );
            if (imageFiles.length > 0) {
              e.preventDefault();
              setIsDragOver(false);
              setDragDropPreview(null);

              imageFiles.forEach(async (file) => {
                const url = await handleFileUpload(file);
                if (url && editor) {
                  editor.chain().focus().setImage({ src: url, alt: file.name }).run();
                }
              });
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>

        {/* ── Upload progress bar ────────────────────────────────── */}
        {uploading && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin inline-block" />
              <span className="text-xs font-sans-ui text-gray-500">
                Subiendo imagen...
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-800 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Floating insert bar ────────────────────────────────── */}
        <div className="flex items-center gap-1 mt-6 pb-2 flex-wrap">
          <button
            type="button"
            title={uploading ? "Subiendo imagen…" : "Insertar imagen"}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            {uploading ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin inline-block" />
            ) : (
              <ImageIcon size={14} />
            )}
            <span>Imagen</span>
          </button>

          <button
            type="button"
            title={uploadingGrid ? "Subiendo imágenes…" : "Galería de 2 imágenes"}
            disabled={uploadingGrid}
            onClick={() => gridInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            {uploadingGrid ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin inline-block" />
            ) : (
              <Images size={14} />
            )}
            <span>Galería</span>
          </button>

          <button
            type="button"
            title="Insertar video (YouTube/Vimeo)"
            onClick={() => setVideoModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Video size={14} />
            <span>Video</span>
          </button>

          <button
            type="button"
            title={uploadingVideo ? "Subiendo video…" : "Subir video local"}
            disabled={uploadingVideo}
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            {uploadingVideo ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin inline-block" />
            ) : (
              <ExternalLink size={14} />
            )}
            <span>Subir video</span>
          </button>
        </div>

        {/* ── Hidden file inputs ─────────────────────────────────── */}
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
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleVideoUpload}
        />
      </div>
    </>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────────
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
