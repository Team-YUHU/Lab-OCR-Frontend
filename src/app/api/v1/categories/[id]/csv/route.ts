import { NextResponse, connection } from 'next/server';
import { buildCsv, toCsvFileName } from '@/features/labels/lib/label-csv';
import { UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '@/lib/categories';
import { getDb } from '@/server/db/client';
import { databaseError, listVials, parseCategoryId } from '@/server/vials';

type Context = { params: Promise<{ id: string }> };

const notFound = () =>
	NextResponse.json({ error: 'Category not found' }, { status: 404 });

// Downloads every vial in a category as the 7-column CSV. The id can also be "uncategorized".
export async function GET(_request: Request, { params }: Context) {
	await connection();

	const { id: requested } = await params;
	const isUncategorized = requested === UNCATEGORIZED_ID;
	const id = isUncategorized ? null : parseCategoryId(requested);
	if (!isUncategorized && !id) return notFound();

	try {
		let name = UNCATEGORIZED_NAME;
		if (id) {
			const { rows } = await getDb().query(
				'SELECT name FROM categories WHERE id = $1',
				[id],
			);
			if (!rows[0]) return notFound();
			name = rows[0].name;
		}

		const vials = await listVials(id);
		const fileName = toCsvFileName(name) ?? `category-${id}.csv`;
		// Headers only allow ASCII: filename is the fallback, filename* the real name.
		const asciiName = fileName.replace(/[^\x20-\x7e]/g, '_');

		return new NextResponse(buildCsv(vials.map((vial) => vial.fields)), {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
			},
		});
	} catch (error) {
		return databaseError('Could not build the CSV', error);
	}
}
