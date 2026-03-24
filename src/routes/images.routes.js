import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { imageUpload } from '../middleware/uploadImage.js';

/**
 * Image-related routes (upload, list, etc.).
 * Mount in app.js: app.use('/api/images', imagesRouter)
 */
export const imagesRouter = Router();

// Smoke test: returns { ok: true } when the router is mounted
imagesRouter.get('/health', (req, res) => {
    res.json({ ok: true, scope: 'images' });
});

/**
 * GET list of images (newest first). Public feed for the home grid.
 */
imagesRouter.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT i.id, i.image_url, i.title, i.description,
                    COALESCE(u.display_name, u.email) AS author
             FROM images i
             JOIN users u ON u.id = i.user_id
             ORDER BY i.created_at DESC
             LIMIT 100`,
        );
        const images = rows.map((row) => ({
            id: String(row.id),
            imageUrl: row.image_url,
            title: row.title?.trim() || 'Untitled',
            description: row.description || undefined,
            author: row.author,
            likes: 0,
            saved: false,
        }));
        return res.json({ images });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to list images' });
    }
});

/**
 * GET image details by id.
 */
imagesRouter.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'invalid image id' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT i.id, i.image_url, i.title, i.description, i.created_at,
                    COALESCE(u.display_name, u.email) AS author
             FROM images i
             JOIN users u ON u.id = i.user_id
             WHERE i.id = $1`,
            [id],
        );
        const row = rows[0];
        if (!row) {
            return res.status(404).json({ error: 'image not found' });
        }
        return res.json({
            image: {
                id: String(row.id),
                imageUrl: row.image_url,
                title: row.title?.trim() || 'Untitled',
                description: row.description || '',
                author: row.author,
                createdAt: row.created_at,
                likes: 0,
                saves: 0,
                shares: 0,
                category: null,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to load image' });
    }
});

/**
 * POST multipart/form-data: field "image" (file), optional "title", "description" (text).
 * Requires Authorization: Bearer <jwt>. Inserts row into `images` and returns id + imageUrl.
 */
imagesRouter.post(
    '/upload',
    requireAuth,
    imageUpload.single('image'),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'missing image file (field name must be "image")' });
        }
        const title = req.body.title ? String(req.body.title).slice(0, 500) : null;
        const description = req.body.description ? String(req.body.description).slice(0, 5000) : null;
        const imageUrl = `/uploads/${req.file.filename}`;

        try {
            const { rows } = await pool.query(
                `INSERT INTO images (user_id, file_name, image_url, title, description)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, created_at`,
                [req.userId, req.file.filename, imageUrl, title, description],
            );
            const row = rows[0];
            return res.status(201).json({
                id: row.id,
                imageUrl,
                filename: req.file.filename,
                title,
                description,
                userId: req.userId,
                createdAt: row.created_at,
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'failed to save image record' });
        }
    },
);
