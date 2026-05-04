/**
 * Sube una imagen DIRECTAMENTE a Cloudinary desde el navegador.
 * No pasa por el servidor backend — evita el timeout de Render/Cloudflare.
 *
 * Requiere un Upload Preset "unsigned" en Cloudinary:
 * Settings → Upload → Upload Presets → Add preset → Signing Mode: Unsigned
 */

// ── Configura estos dos valores con los tuyos ──────────────
const CLOUDINARY_CLOUD_NAME  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME  ?? "";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? "";
// ───────────────────────────────────────────────────────────

export interface UploadResult {
  url:       string;
  publicId:  string;
  width:     number;
  height:    number;
}

export async function uploadToCloudinary(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Faltan variables VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en el .env del frontend"
    );
  }

  const url      = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append("file",         file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder",        "el-principe-mestizo");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url:      data.secure_url,
          publicId: data.public_id,
          width:    data.width,
          height:   data.height,
        });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message ?? "Cloudinary upload failed"));
        } catch {
          reject(new Error(`Cloudinary error ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Error de red al subir a Cloudinary"));
    xhr.send(formData);
  });
}
