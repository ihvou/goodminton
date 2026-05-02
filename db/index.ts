import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// We allow init without DATABASE_URL so `next build` succeeds before deploy.
// Any actual query will throw at runtime if the URL is missing/invalid.
const PLACEHOLDER =
  'postgres://placeholder:placeholder@placeholder.neon.tech/placeholder?sslmode=require';

const url = process.env.DATABASE_URL || PLACEHOLDER;

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn('[goodminton] DATABASE_URL not set — queries will fail.');
}

const sql = neon(url);
export const db = drizzle(sql, { schema });
export { schema };
