import jwt from 'jsonwebtoken';

export function signToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify a JWT string. Throws if invalid or expired (caller can catch).
 * @param {string} token
 * @returns {jwt.JwtPayload & { sub?: number; email?: string }}
 */
export function verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}
