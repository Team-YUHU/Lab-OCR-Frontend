import { NextResponse, connection, type NextRequest } from 'next/server';
import {
	createVial,
	databaseError,
	listVials,
	parseVialCategory,
	parseVialInput,
} from '@/lib/vials';

// GET /api/v1/vials for all, ?categoryId=1 for one category, ?categoryId=uncategorized for the rest.
export async function GET(request: NextRequest) {
	await connection();

	const requested = request.nextUrl.searchParams.get('categoryId');
	const category = requested === null ? null : parseVialCategory(requested);
	if (category && 'error' in category) {
		return NextResponse.json({ error: category.error }, { status: 400 });
	}

	try {
		return NextResponse.json({
			vials: await listVials(category ? category.categoryId : undefined),
		});
	} catch (error) {
		return databaseError('Could not load vials', error);
	}
}

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = parseVialInput(body);
	if ('error' in parsed) {
		return NextResponse.json({ error: parsed.error }, { status: 400 });
	}

	try {
		const vial = await createVial(parsed.input);
		return NextResponse.json({ vial }, { status: 201 });
	} catch (error) {
		return databaseError('Could not save the vial', error);
	}
}
