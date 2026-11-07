import { NextResponse } from 'next/server';
import {
	databaseError,
	deleteVial,
	getVial,
	moveVial,
	parseVialCategory,
	parseVialId,
	parseVialInput,
	updateVial,
} from '@/lib/vials';

type Context = { params: Promise<{ id: string }> };

const notFound = () =>
	NextResponse.json({ error: 'Vial not found' }, { status: 404 });

export async function GET(_request: Request, { params }: Context) {
	const id = parseVialId((await params).id);
	if (!id) return notFound();

	try {
		const vial = await getVial(id);
		return vial ? NextResponse.json({ vial }) : notFound();
	} catch (error) {
		return databaseError('Could not load the vial', error);
	}
}

export async function PUT(request: Request, { params }: Context) {
	const id = parseVialId((await params).id);
	if (!id) return notFound();

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
		const vial = await updateVial(id, parsed.input);
		return vial ? NextResponse.json({ vial }) : notFound();
	} catch (error) {
		return databaseError('Could not save the vial', error);
	}
}

// Changes only the category: { "categoryId": 1 }, or null for uncategorized.
export async function PATCH(request: Request, { params }: Context) {
	const id = parseVialId((await params).id);
	if (!id) return notFound();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	// Required here, so an empty body can't quietly uncategorize a vial.
	if (typeof body !== 'object' || body === null || !('categoryId' in body)) {
		return NextResponse.json(
			{ error: 'categoryId is required' },
			{ status: 400 },
		);
	}
	const category = parseVialCategory(body.categoryId);
	if ('error' in category) {
		return NextResponse.json({ error: category.error }, { status: 400 });
	}

	try {
		const vial = await moveVial(id, category.categoryId);
		return vial ? NextResponse.json({ vial }) : notFound();
	} catch (error) {
		return databaseError('Could not save the vial', error);
	}
}

export async function DELETE(_request: Request, { params }: Context) {
	const id = parseVialId((await params).id);
	if (!id) return notFound();

	try {
		return (await deleteVial(id))
			? new NextResponse(null, { status: 204 })
			: notFound();
	} catch (error) {
		return databaseError('Could not delete the vial', error);
	}
}
