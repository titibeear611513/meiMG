import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { imageUpload } from '../middleware/uploadImage.js';
import { defaultAvatarDefinitions, getDefaultAvatarSvgById } from '../constants/defaultAvatars.js';

export const usersRouter = Router();

function parseUserId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

/**
 * Update current user's editable profile fields.
 * For now we persist display_name in DB.
 */
usersRouter.patch('/me/profile', requireAuth, async (req, res) => {
    const { displayName, avatarUrl } = req.body ?? {};
    if (displayName !== undefined && typeof displayName !== 'string') {
        return res.status(400).json({ error: 'displayName must be a string' });
    }
    if (avatarUrl !== undefined && typeof avatarUrl !== 'string') {
        return res.status(400).json({ error: 'avatarUrl must be a string' });
    }
    const nextDisplayName =
        typeof displayName === 'string'
            ? displayName.trim().slice(0, 120) || null
            : null;
    const nextAvatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim().slice(0, 600) || null : null;
    try {
        const { rows } = await pool.query(
            `UPDATE users
             SET display_name = COALESCE($1, display_name),
                 avatar_url = COALESCE($2, avatar_url)
             WHERE id = $3
             RETURNING id, email, display_name, avatar_url`,
            [nextDisplayName, nextAvatarUrl, req.userId],
        );
        const user = rows[0];
        if (!user) {
            return res.status(404).json({ error: 'user not found' });
        }
        return res.json({
            user: {
                id: Number(user.id),
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to update profile' });
    }
});

usersRouter.get('/default-avatars', (req, res) => {
    return res.json({
        avatars: defaultAvatarDefinitions.map((item) => ({
            id: item.id,
            url: `/api/users/default-avatars/${item.id}`,
        })),
    });
});

usersRouter.get('/default-avatars/:id', (req, res) => {
    const svg = getDefaultAvatarSvgById(req.params.id);
    if (!svg) {
        return res.status(404).json({ error: 'avatar not found' });
    }
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(svg);
});

usersRouter.post('/me/avatar-upload', requireAuth, imageUpload.single('avatar'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'missing avatar file (field name must be "avatar")' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    try {
        const { rows } = await pool.query(
            `UPDATE users
             SET avatar_url = $1
             WHERE id = $2
             RETURNING id, email, display_name, avatar_url`,
            [avatarUrl, req.userId],
        );
        const user = rows[0];
        if (!user) {
            return res.status(404).json({ error: 'user not found' });
        }
        return res.json({
            user: {
                id: Number(user.id),
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to update avatar' });
    }
});

/**
 * Public user stats for profile pages.
 */
usersRouter.get('/:id/stats', async (req, res) => {
    const targetUserId = parseUserId(req.params.id);
    if (!targetUserId) {
        return res.status(400).json({ error: 'invalid user id' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT
                (SELECT COUNT(*)::INTEGER FROM images i WHERE i.user_id = $1) AS uploaded_count,
                (SELECT COUNT(*)::INTEGER FROM saved_images s WHERE s.user_id = $1) AS saved_count,
                (SELECT COUNT(*)::INTEGER FROM follows f WHERE f.following_id = $1) AS followers_count,
                (SELECT COUNT(*)::INTEGER FROM follows f WHERE f.follower_id = $1) AS following_count`,
            [targetUserId],
        );
        return res.json({
            uploadedCount: Number(rows[0]?.uploaded_count ?? 0),
            savedCount: Number(rows[0]?.saved_count ?? 0),
            followersCount: Number(rows[0]?.followers_count ?? 0),
            followingCount: Number(rows[0]?.following_count ?? 0),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to fetch user stats' });
    }
});

/**
 * Saved images for current user profile.
 */
usersRouter.get('/:id/saved-images', requireAuth, async (req, res) => {
    const targetUserId = parseUserId(req.params.id);
    if (!targetUserId) {
        return res.status(400).json({ error: 'invalid user id' });
    }
    if (targetUserId !== req.userId) {
        return res.status(403).json({ error: 'forbidden' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT i.id, i.user_id, i.image_url, i.title, i.description,
                    COALESCE(u.display_name, u.email) AS author,
                    (
                        SELECT COUNT(*)::INTEGER
                        FROM saved_images s2
                        WHERE s2.image_id = i.id
                    ) AS saves_count
             FROM saved_images s
             JOIN images i ON i.id = s.image_id
             JOIN users u ON u.id = i.user_id
             WHERE s.user_id = $1
             ORDER BY s.created_at DESC
             LIMIT 100`,
            [targetUserId],
        );
        const images = rows.map((row) => ({
            id: String(row.id),
            userId: Number(row.user_id),
            imageUrl: row.image_url,
            title: row.title?.trim() || 'Untitled',
            description: row.description || undefined,
            author: row.author,
            likes: 0,
            saves: Number(row.saves_count ?? 0),
            saved: true,
        }));
        return res.json({ images });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to fetch saved images' });
    }
});

/**
 * Follow a user.
 * Rule: users cannot follow themselves.
 */
usersRouter.post('/:id/follow', requireAuth, async (req, res) => {
    const targetUserId = parseUserId(req.params.id);
    if (!targetUserId) {
        return res.status(400).json({ error: 'invalid user id' });
    }
    if (targetUserId === req.userId) {
        return res.status(400).json({ error: 'cannot follow yourself' });
    }
    try {
        const exists = await pool.query(`SELECT 1 FROM users WHERE id = $1`, [targetUserId]);
        if (!exists.rows[0]) {
            return res.status(404).json({ error: 'user not found' });
        }
        await pool.query(
            `INSERT INTO follows (follower_id, following_id)
             VALUES ($1, $2)
             ON CONFLICT (follower_id, following_id) DO NOTHING`,
            [req.userId, targetUserId],
        );
        return res.json({ followed: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to follow user' });
    }
});

/**
 * Unfollow a user.
 */
usersRouter.delete('/:id/follow', requireAuth, async (req, res) => {
    const targetUserId = parseUserId(req.params.id);
    if (!targetUserId) {
        return res.status(400).json({ error: 'invalid user id' });
    }
    if (targetUserId === req.userId) {
        return res.status(400).json({ error: 'cannot unfollow yourself' });
    }
    try {
        await pool.query(
            `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
            [req.userId, targetUserId],
        );
        return res.json({ followed: false });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to unfollow user' });
    }
});
