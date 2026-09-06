import { Router } from "express";
import multer from "multer";
import { requireAuth, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import { uploadImage } from "./upload.service.js";

const upload = multer({
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

  router.post("/image", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res) => {
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
