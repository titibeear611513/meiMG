import 'dotenv/config';
import pool from './src/db/pool.js';
import { createApp } from './src/app.js';

const app = createApp();

app.listen(3000, async () => {
    console.log('Server is running on port 3000');
    try {
        const r = await pool.query('SELECT NOW()');
        console.log('PostgreSQL OK:', r.rows[0].now);
    } catch (err) {
        console.error('PostgreSQL connection failed:', err.message);
    }
});
