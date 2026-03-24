import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../db/pool.js';
import { findOrCreateGoogleUser } from './googleUserService.js';
import { signToken } from './jwt.js';

export function setupGoogleAuth(app) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn(
            'Google OAuth disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
        );
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL:
                    process.env.GOOGLE_CALLBACK_URL ||
                    'http://localhost:3000/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const user = await findOrCreateGoogleUser(profile);
                    done(null, user);
                } catch (err) {
                    done(err);
                }
            },
        ),
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const { rows } = await pool.query(
                `SELECT id, email, display_name, avatar_url FROM users WHERE id = $1`,
                [id],
            );
            done(null, rows[0] ?? null);
        } catch (err) {
            done(err);
        }
    });

    app.get(
        '/auth/google',
        passport.authenticate('google', { scope: ['profile', 'email'] }),
    );

    app.get(
        '/auth/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/auth/google/failure',
        }),
        (req, res) => {
            const user = req.user;
            const token = signToken({
                sub: user.id,
                email: user.email,
                displayName: user.display_name ?? null,
                avatarUrl: user.avatar_url ?? null,
            });
            const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
                /\/$/,
                '',
            );
            const url = `${base}/?token=${encodeURIComponent(token)}`;
            res.redirect(url);
        },
    );

    app.get('/auth/google/failure', (req, res) => {
        const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        res.redirect(`${base}/login?error=google`);
    });
}
