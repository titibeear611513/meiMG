import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { imageUpload } from '../middleware/uploadImage.js';
import { verifyToken } from '../auth/jwt.js';

/**
 * Image-related routes (upload, list, etc.).
 * Mount in app.js: app.use('/api/images', imagesRouter)
 */
export const imagesRouter = Router();

function getViewerIdFromAuthorization(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    const raw = header.slice('Bearer '.length).trim();
    if (!raw) return null;
    try {
        const payload = verifyToken(raw);
        const id = Number(payload.sub);
        if (!Number.isInteger(id) || id <= 0) return null;
        return id;
    } catch {
        return null;
    }
}

// Smoke test: returns { ok: true } when the router is mounted
imagesRouter.get('/health', (req, res) => {
    res.json({ ok: true, scope: 'images' });
});

/**
 * GET list of images (newest first). Public feed for the home grid.
 */
imagesRouter.get('/', async (req, res) => {
    const userIdRaw = req.query.userId;
    const userId = userIdRaw != null ? Number(userIdRaw) : null;
    if (userIdRaw != null && (!Number.isInteger(userId) || userId <= 0)) {
        return res.status(400).json({ error: 'invalid userId query' });
    }
    try {
        const queryText =
            userId == null
                ? `SELECT i.id, i.user_id, i.image_url, i.title, i.description,
                        COALESCE(u.display_name, u.email) AS author
                        ,(
                            SELECT COUNT(*)::INTEGER
                            FROM saved_images s
                            WHERE s.image_id = i.id
                        ) AS saves_count
                        ,EXISTS(
                            SELECT 1
                            FROM saved_images s
                            WHERE s.user_id = $1 AND s.image_id = i.id
                        ) AS is_saved_by_viewer
                 FROM images i
                 JOIN users u ON u.id = i.user_id
                 ORDER BY i.created_at DESC
                 LIMIT 100`
                : `SELECT i.id, i.user_id, i.image_url, i.title, i.description,
                        COALESCE(u.display_name, u.email) AS author
                        ,(
                            SELECT COUNT(*)::INTEGER
                            FROM saved_images s
                            WHERE s.image_id = i.id
                        ) AS saves_count
                        ,EXISTS(
                            SELECT 1
                            FROM saved_images s
                            WHERE s.user_id = $2 AND s.image_id = i.id
                        ) AS is_saved_by_viewer
                 FROM images i
                 JOIN users u ON u.id = i.user_id
                 WHERE i.user_id = $1
                 ORDER BY i.created_at DESC
                 LIMIT 100`;
        const viewerId = getViewerIdFromAuthorization(req) ?? 0;
        const params = userId == null ? [viewerId] : [userId, viewerId];
        const { rows } = await pool.query(queryText, params);
        const images = rows.map((row) => ({
            id: String(row.id),
            userId: Number(row.user_id),
            imageUrl: row.image_url,
            title: row.title?.trim() || 'Untitled',
            description: row.description || undefined,
            author: row.author,
            likes: 0,
            saves: Number(row.saves_count ?? 0),
            saved: Boolean(row.is_saved_by_viewer),
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
    const viewerId = getViewerIdFromAuthorization(req);
    try {
        const { rows } = await pool.query(
            `SELECT i.id, i.image_url, i.title, i.description, i.created_at,
                    u.id AS author_id,
                    COALESCE(u.display_name, u.email) AS author,
                    (
                        SELECT COUNT(*)::INTEGER
                        FROM saved_images s
                        WHERE s.image_id = i.id
                    ) AS saves_count,
                    (
                        SELECT COUNT(*)::INTEGER
                        FROM follows f
                        WHERE f.following_id = u.id
                    ) AS followers_count,
                    (
                        SELECT COUNT(*)::INTEGER
                        FROM follows f
                        WHERE f.follower_id = u.id
                    ) AS following_count,
                    EXISTS(
                        SELECT 1
                        FROM saved_images s
                        WHERE s.user_id = $2 AND s.image_id = i.id
                    ) AS is_saved_by_viewer,
                    EXISTS(
                        SELECT 1
                        FROM follows f
                        WHERE f.follower_id = $2 AND f.following_id = u.id
                    ) AS is_following_author
             FROM images i
             JOIN users u ON u.id = i.user_id
             WHERE i.id = $1`,
            [id, viewerId ?? 0],
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
                authorId: Number(row.author_id),
                author: row.author,
                createdAt: row.created_at,
                likes: 0,
                saves: Number(row.saves_count ?? 0),
                shares: 0,
                category: null,
                isSavedByViewer: Boolean(row.is_saved_by_viewer),
                followersCount: Number(row.followers_count ?? 0),
                followingCount: Number(row.following_count ?? 0),
                isFollowingAuthor: Boolean(row.is_following_author),
                isOwnAuthor: viewerId != null && Number(row.author_id) === viewerId,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to load image' });
    }
});

/**
 * Save an image for current user.
 */
imagesRouter.post('/:id/save', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'invalid image id' });
    }
    try {
        const exists = await pool.query(`SELECT 1 FROM images WHERE id = $1`, [id]);
        if (!exists.rows[0]) {
            return res.status(404).json({ error: 'image not found' });
        }
        await pool.query(
            `INSERT INTO saved_images (user_id, image_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, image_id) DO NOTHING`,
            [req.userId, id],
        );
        const count = await pool.query(
            `SELECT COUNT(*)::INTEGER AS saves_count FROM saved_images WHERE image_id = $1`,
            [id],
        );
        return res.json({ saved: true, savesCount: Number(count.rows[0]?.saves_count ?? 0) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to save image' });
    }
});

/**
 * Unsave an image for current user.
 */
imagesRouter.delete('/:id/save', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'invalid image id' });
    }
    try {
        await pool.query(
            `DELETE FROM saved_images WHERE user_id = $1 AND image_id = $2`,
            [req.userId, id],
        );
        const count = await pool.query(
            `SELECT COUNT(*)::INTEGER AS saves_count FROM saved_images WHERE image_id = $1`,
            [id],
        );
        return res.json({ saved: false, savesCount: Number(count.rows[0]?.saves_count ?? 0) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to unsave image' });
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
