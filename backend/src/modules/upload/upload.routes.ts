import { Router } from "express";
import multer from "multer";
import { uploadImage } from "./upload.service.js";

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export function buildUploadRoutes() {
  const router = Router();

  // POST /upload/image — upload an avatar/cover image to Cloudinary
  router.post("/image", imageUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const result = await uploadImage(req.file);
      res.json({ url: result.url, publicId: result.publicId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json({ error: message });
    }
  });

  return router;
}