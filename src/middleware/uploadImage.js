import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';

/** Files are stored under ./uploads (created on first upload). */
const uploadDir = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        const lower = ext.toLowerCase();
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
        const extSafe = allowed.includes(lower) ? lower : '.jpg';
        cb(null, `${randomUUID()}${extSafe}`);
    },
});

const allowedMime = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
]);

/**
 * Multer instance for a single field named "image" (use .single("image") on the route).
 */
export const imageUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (allowedMime.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
