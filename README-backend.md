## Backend (Express + PostgreSQL + S3)

This is the backend for MeiMG. It provides:
- Email/password auth and Google OAuth
- Image upload/list/detail
- Save/unsave (favorites) and follow relationships

## Requirements
- Node.js 18+
- PostgreSQL
- AWS S3 (for uploaded images/avatars)

## Setup (local)
1. Install dependencies
   - `pnpm install`
2. Configure environment
   - Copy `.env.example` to `.env` and fill in values.
3. Create DB tables
   - `psql "$DATABASE_URL" -f src/db/schema_users.sql`
   - `psql "$DATABASE_URL" -f src/db/schema_images.sql`
   - `psql "$DATABASE_URL" -f src/db/schema_saves.sql`
   - `psql "$DATABASE_URL" -f src/db/schema_follows.sql`
4. Start the server
   - `pnpm start`

## Environment variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: token signing secret
- `SESSION_SECRET`: express-session secret
- `FRONTEND_URL`: allowed CORS origin (e.g. `http://localhost:5173`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`: Google OAuth config
- `AWS_REGION`, `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (if your environment doesn’t provide IAM role credentials)
- `DEFAULT_AVATAR_BASE_URL` (optional): override default avatar base URL

## S3 object locations
- Default avatars: `default-avatars/<file>.jpg`
- Uploaded images: `images/<uuid>.<ext>`
- Uploaded avatars: `avatars/<uuid>.<ext>`

## API
- `GET /api/images/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/images`
- `GET /api/images/:id`
- `POST /api/images/:id/save` (requires auth)
- `DELETE /api/images/:id/save` (requires auth)
- `DELETE /api/images/:id` (owner only, requires auth)
- `POST /api/images/upload` (multipart field: `image`, requires auth)
- `GET /api/images/:id/file` (download proxy for image bytes)
- `PATCH /api/users/me/profile` (requires auth)
- `GET /api/users/:id/stats`
- `GET /api/users/:id/saved-images` (requires auth, only self)
- `POST /api/users/:id/follow` (requires auth)
- `DELETE /api/users/:id/follow` (requires auth)
- `POST /api/users/me/avatar-upload` (multipart field: `avatar`, requires auth)

## Google OAuth routes
- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /auth/google/failure`

On success, the backend redirects to: `${FRONTEND_URL}/?token=...`.

