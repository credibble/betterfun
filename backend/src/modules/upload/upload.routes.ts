import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireAuth, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import { uploadImage } from "./upload.service.js";

const VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

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

const videoStorage = multer.diskStorage({
  destination: path.resolve("uploads/videos"),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, `${unique}${ext}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (VIDEO_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only mp4, webm, and mov files are allowed"));
    }
  },
});

export function buildUploadRoutes() {
  const router = Router();

  router.post("/image", requireAuth, imageUpload.single("file"), async (req: AuthenticatedRequest, res) => {
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

  router.post("/video", requireAuth, videoUpload.single("file"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const url = `/uploads/videos/${req.file.filename}`;
      res.json({ url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
