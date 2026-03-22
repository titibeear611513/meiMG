import path from 'path';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { setupGoogleAuth } from './auth/passport.js';
import { authRouter } from './routes/auth.routes.js';
import { imagesRouter } from './routes/images.routes.js';

export function createApp() {
    const app = express();

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

    // Uploaded files on disk (same folder multer uses: ./uploads)
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    app.get('/', (req, res) => {
        res.send('Hello World');
    });

    return app;
}
