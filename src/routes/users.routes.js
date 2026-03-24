import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const usersRouter = Router();

function parseUserId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

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
                (SELECT COUNT(*)::INTEGER FROM follows f WHERE f.following_id = $1) AS followers_count,
                (SELECT COUNT(*)::INTEGER FROM follows f WHERE f.follower_id = $1) AS following_count`,
            [targetUserId],
        );
        return res.json({
            uploadedCount: Number(rows[0]?.uploaded_count ?? 0),
            followersCount: Number(rows[0]?.followers_count ?? 0),
            followingCount: Number(rows[0]?.following_count ?? 0),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to fetch user stats' });
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
