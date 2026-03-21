import pool from '../db/pool.js';

export async function findOrCreateGoogleUser(profile) {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    const displayName = profile.displayName ?? null;
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    if (!email) {
        const err = new Error('Google account has no email');
        err.code = 'NO_EMAIL';
        throw err;
    }

    const existingGoogle = await pool.query(
        `SELECT id, email, display_name FROM users WHERE google_id = $1`,
        [googleId],
    );
    if (existingGoogle.rows[0]) {
        return existingGoogle.rows[0];
    }

    const existingEmail = await pool.query(
        `SELECT id, email, display_name, google_id FROM users WHERE email = $1`,
        [email],
    );
    if (existingEmail.rows[0]) {
        const u = existingEmail.rows[0];
        if (!u.google_id) {
            await pool.query(
                `UPDATE users SET google_id = $1,
                 display_name = COALESCE(display_name, $2),
                 avatar_url = COALESCE(avatar_url, $3)
                 WHERE id = $4`,
                [googleId, displayName, avatarUrl, u.id],
            );
        }
        const { rows } = await pool.query(
            `SELECT id, email, display_name FROM users WHERE id = $1`,
            [u.id],
        );
        return rows[0];
    }

    const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, google_id, display_name, avatar_url)
         VALUES ($1, NULL, $2, $3, $4)
         RETURNING id, email, display_name`,
        [email, googleId, displayName, avatarUrl],
    );
    return rows[0];
}
