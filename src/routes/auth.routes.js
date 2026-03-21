import bcrypt from 'bcryptjs';
import { Router } from 'express';
import pool from '../db/pool.js';
import { signToken } from '../auth/jwt.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
    const { email, password, displayName } = req.body ?? {};
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'email and password must be strings' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const { rows } = await pool.query(
            `INSERT INTO users (email, password_hash, display_name)
             VALUES ($1, $2, $3)
             RETURNING id, email, display_name`,
            [email.trim().toLowerCase(), passwordHash, displayName ?? null],
        );
        const user = rows[0];
        const token = signToken({ sub: user.id, email: user.email });
        return res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
            },
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'email already registered' });
        }
        console.error(err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'email and password must be strings' });
    }

    try {
        const { rows } = await pool.query(
            `SELECT id, email, display_name, password_hash FROM users WHERE email = $1`,
            [email.trim().toLowerCase()],
        );
        const user = rows[0];
        const ok =
            user?.password_hash &&
            (await bcrypt.compare(password, user.password_hash));
        if (!ok) {
            return res.status(401).json({ error: 'invalid email or password' });
        }
        const token = signToken({ sub: user.id, email: user.email });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'internal server error' });
    }
});
