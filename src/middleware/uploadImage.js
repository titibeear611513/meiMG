import multer from 'multer';

const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/avif': '.avif',
};

const allowedMime = new Set(Object.keys(mimeToExt));

export function getSafeImageExtension(file) {
    return mimeToExt[file?.mimetype] || '.jpg';
}

/**
 * Multer instance for a single field named "image" (use .single("image") on the route).
 */
export const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (allowedMime.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
