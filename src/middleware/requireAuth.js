import { verifyToken } from '../auth/jwt.js';

/**
 * Requires Authorization: Bearer <jwt>. Sets req.userId from payload.sub on success.
 */
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'missing or invalid authorization header' });
    }
    const raw = header.slice('Bearer '.length).trim();
    if (!raw) {
        return res.status(401).json({ error: 'missing token' });
    }
    try {
        const payload = verifyToken(raw);
        const sub = payload.sub;
        if (sub == null || Number.isNaN(Number(sub))) {
            return res.status(401).json({ error: 'invalid token payload' });
        }
        req.userId = Number(sub);
        next();
    } catch {
        return res.status(401).json({ error: 'invalid or expired token' });
    }
}
