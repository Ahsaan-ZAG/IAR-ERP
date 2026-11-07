import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'backups', 'uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `upload-${Date.now()}.sqlite`)
});

export const uploadBackup = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.sqlite') || file.originalname.endsWith('.db') || file.mimetype === 'application/x-sqlite3') {
      cb(null, true);
    } else {
      cb(new Error('Only .sqlite or .db files are allowed'));
    }
  }
});