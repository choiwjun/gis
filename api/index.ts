import { Hono } from 'hono';
import { handle } from 'hono/vercel';

// Import your existing Hono app
import app from '../src/index';

// Export for Vercel
export default handle(app);
