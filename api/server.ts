/**
 * server.ts in /api was moved to the project root as `server-dev.ts` to avoid
 * starting a listening server inside the `api/` folder which is served by
 * serverless functions on platforms like Vercel.
 *
 * This file now simply re-exports the app from `app.ts` so serverless entry
 * points can still import it if necessary.
 */

import app from './app.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Create and export a Supabase client so routes can import it from ../server.js
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing Supabase configuration');
	// do not exit here during type-check/build; just warn. (avoids breaking serverless builds)
} 

export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

export default app;