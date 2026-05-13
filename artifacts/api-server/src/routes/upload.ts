import { Router, type IRouter } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Tipos MIME permitidos
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "application/pdf"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB (soporta videos)
});

/**
 * Verifica el tipo MIME real del archivo usando magic bytes (file-type).
 * No confía en el `mimetype` enviado por el cliente.
 */
async function validateFileType(
  file: Express.Multer.File,
): Promise<{ valid: boolean; detectedMime: string | null }> {
  try {
    const result = await fileTypeFromBuffer(file.buffer);
    if (!result) {
      return { valid: false, detectedMime: null };
    }

    const isAllowed = ALLOWED_MIME_PREFIXES.some(
      (prefix) =>
        result.mime === prefix ||
        result.mime.startsWith(prefix.replace("/", "")),
    );

    // Permitir explícitamente image/* y video/*
    const isImageOrVideo =
      result.mime.startsWith("image/") || result.mime.startsWith("video/");

    return {
      valid: isAllowed || isImageOrVideo,
      detectedMime: result.mime,
    };
  } catch {
    return { valid: false, detectedMime: null };
  }
}

async function doUpload(file: Express.Multer.File, res: any) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    logger.warn("Cloudinary not configured");
    res
      .status(503)
      .json({
        error:
          "El servidor no tiene Cloudinary configurado. Agrega CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en las variables de entorno de Render.",
      });
    return;
  }

  // Validar tipo MIME real del archivo
  const { valid, detectedMime } = await validateFileType(file);
  if (!valid) {
    logger.warn(
      {
        declaredMime: file.mimetype,
        detectedMime,
        fileName: file.originalname,
      },
      "Upload rejected: invalid file type",
    );
    res.status(400).json({
      error: "Tipo de archivo no permitido. Solo se aceptan imágenes y videos.",
    });
    return;
  }

  // Usar el MIME detectado en vez del declarado por el cliente
  const safeMime = detectedMime ?? file.mimetype;

  try {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const isVideo = safeMime.startsWith("video/");
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataUri = `data:${safeMime};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "el-principe-mestizo",
      resource_type: isVideo ? "video" : "image",
      ...(isVideo
        ? {}
        : {
            transformation: [{ quality: "auto:good", fetch_format: "auto" }],
          }),
    });

    res.json({
      url: result.secure_url,
      resourceType: isVideo ? "video" : "image",
    });
  } catch (err) {
    logger.error({ err }, "Cloudinary upload failed");
    res.status(500).json({ error: "Upload failed" });
  }
}

// ── Ruta que usa el frontend (ArticleEditor + RichEditor) ──────────────────
router.post(
  "/admin/upload",
  requireAuth,
  upload.single("image"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    await doUpload(req.file, res);
  },
);

// ── Ruta original (por compatibilidad) ─────────────────────────────────────
router.post(
  "/upload/image",
  requireAuth,
  upload.single("image"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    await doUpload(req.file, res);
  },
);

export default router;
