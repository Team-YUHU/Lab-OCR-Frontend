import { NextResponse, connection } from 'next/server';
import { getDb } from '@/lib/db';

const MAX_NAME_LENGTH = 100; // matches the check in db/schema.sql

export async function GET() {
	// Always run per request, so a build never prerenders a stale list or error.
	await connection();

	try {
		const { rows } = await getDb().query(
			'SELECT id, name FROM categories ORDER BY lower(name)',
		);
		return NextResponse.json({ categories: rows });
	} catch (error) {
		console.error('Loading categories failed:', error);
		return NextResponse.json(
			{ error: 'Could not load categories' },
			{ status: 503 },
		);
	}
}

export async function POST(request: Request) {
	let name: unknown;
	try {
		({ name } = await request.json());
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const trimmed = typeof name === 'string' ? name.trim() : '';
	if (!trimmed || trimmed.length > MAX_NAME_LENGTH) {
		return NextResponse.json(
			{ error: `Enter a name of 1 to ${MAX_NAME_LENGTH} characters` },
			{ status: 400 },
		);
	}

	try {
		// Creating a name that already exists returns the existing category.
		const { rows } = await getDb().query(
			`INSERT INTO categories (name) VALUES ($1)
			 ON CONFLICT (lower(name)) DO UPDATE SET name = categories.name
			 RETURNING id, name`,
			[trimmed],
		);
		return NextResponse.json({ category: rows[0] });
	} catch (error) {
		console.error('Creating a category failed:', error);
		return NextResponse.json(
			{ error: 'Could not save the category' },
			{ status: 503 },
		);
	}
}
