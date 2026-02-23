import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { AppError } from "../utils/app-error";

const uploadsDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedTypes = new Set(["image/jpeg", "image/jpg", "image/png", "application/dicom"]);
const allowedDicomExtensions = new Set([".dcm", ".dicom"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname) || ".png";
    cb(null, `${unique}${extension}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isAllowedMime = allowedTypes.has(file.mimetype);
    const isAllowedDicomByExt = allowedDicomExtensions.has(extension);
    if (!isAllowedMime && !isAllowedDicomByExt) {
      cb(new AppError("Invalid file type. Allowed: jpg, jpeg, png, dicom (.dcm)", 400));
      return;
    }
    cb(null, true);
  }
});
