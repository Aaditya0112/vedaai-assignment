import multer from "multer";

// Store in memory — we'll stream directly to Cloudinary
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});