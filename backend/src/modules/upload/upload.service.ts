import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    configured = true;
    logger.info("Cloudinary configured");
  } else {
    logger.warn("Cloudinary env vars not set — image uploads will fail");
  }
}

export interface UploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(
  file: Express.Multer.File,
): Promise<UploadResult> {
  ensureConfigured();
  if (!configured) {
    throw new Error("Cloudinary not configured");
  }

  const b64 = file.buffer.toString("base64");
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  const result = await new Promise<UploadResult>((resolve, reject) => {
    cloudinary.uploader.upload(
      dataURI,
      {
        folder: "betterfun/avatars",
        transformation: [
          { width: 256, height: 256, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed"));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      },
    );
  });

  return result;
}

export async function deleteImage(publicId: string): Promise<void> {
  ensureConfigured();
  if (!configured) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.error(err, `Failed to delete Cloudinary image: ${publicId}`);
  }
}
