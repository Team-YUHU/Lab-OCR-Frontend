import { Pool } from 'pg';

// Kept on globalThis so hot reloads in development don't open a new pool each time.
const globalForDb = globalThis as typeof globalThis & { dbPool?: Pool };

export function getDb() {
	if (!process.env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}
	globalForDb.dbPool ??= new Pool({
		connectionString: process.env.DATABASE_URL,
	});
	return globalForDb.dbPool;
}
