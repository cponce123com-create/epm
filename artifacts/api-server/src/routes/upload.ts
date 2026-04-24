import { Router, type IRouter } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload/image", requireAuth, upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No image provided" });
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    // If Cloudinary is not configured, return a placeholder
    logger.warn("Cloudinary not configured, returning placeholder URL");
    res.json({ url: `https://picsum.photos/seed/${Date.now()}/1200/600` });
    return;
  }

  try {
    // Upload to Cloudinary via REST API
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "el-principe-mestizo",
      resource_type: "image",
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    logger.error({ err }, "Cloudinary upload failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
