import path from 'path';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { setupGoogleAuth } from './auth/passport.js';
import { authRouter } from './routes/auth.routes.js';
import { imagesRouter } from './routes/images.routes.js';
import { usersRouter } from './routes/users.routes.js';

export function createApp() {
    const app = express();
    const allowedOrigins = new Set(
        [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean),
    );

    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && allowedOrigins.has(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Vary', 'Origin');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header(
                'Access-Control-Allow-Headers',
                'Content-Type, Authorization',
            );
            res.header(
                'Access-Control-Allow-Methods',
                'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            );
        }
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        return next();
    });

    app.use(express.json());
    app.use(
        session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: { secure: process.env.NODE_ENV === 'production' },
        }),
    );
    app.use(passport.initialize());
    app.use(passport.session());

    setupGoogleAuth(app);

    app.use('/api/auth', authRouter);
    app.use('/api/images', imagesRouter);
    app.use('/api/users', usersRouter);

    // Uploaded files on disk (same folder multer uses: ./uploads)
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    app.get('/', (req, res) => {
        res.send('Hello World');
    });

    return app;
}
