import { Pool } from 'pg';
import { TIGER_CA } from './tiger-ca';

// Kept on globalThis so hot reloads in development don't open a new pool each time.
const globalForDb = globalThis as typeof globalThis & { dbPool?: Pool };

export function getDb() {
	if (!process.env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}
	if (!globalForDb.dbPool) {
		globalForDb.dbPool = new Pool({
			connectionString: process.env.DATABASE_URL,
			// Tiger signs with its own CA, so pin it rather than turning verification off.
			ssl: process.env.DATABASE_SSL === 'true' ? { ca: TIGER_CA } : undefined,
			connectionTimeoutMillis: 10_000,
		});
		// Without a listener, a dropped idle connection would crash the server.
		globalForDb.dbPool.on('error', (error) => {
			console.error('Idle database connection failed:', error);
		});
	}
	return globalForDb.dbPool;
}
