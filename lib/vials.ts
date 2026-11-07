import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { FieldName, Fields } from '@/app/label-csv';
import { UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from './categories';
import { getDb } from './db';

// Column names and limits match the vials table. Blank fields are stored as NULL.
const FIELD_COLUMNS: Record<FieldName, { column: string; max: number }> = {
	sampleId: { column: 'sample_id', max: 100 },
	dateSampled: { column: 'date_sampled', max: 50 },
	dateReceived: { column: 'date_received', max: 50 },
	machine: { column: 'machine', max: 100 },
	component: { column: 'component', max: 100 },
	serialNumber: { column: 'serial_number', max: 100 },
	referenceLube: { column: 'reference_lube', max: 100 },
};
const FIELD_NAMES = Object.keys(FIELD_COLUMNS) as FieldName[];
const COLUMNS = FIELD_NAMES.map((name) => FIELD_COLUMNS[name].column);
const MAX_LABEL_TYPE = 20;
const MAX_FILE_NAME = 255;
const MAX_VIAL_ID = 2_147_483_647; // vials.id is an integer column

export type Vial = {
	id: string;
	/** Null means uncategorized. */
	categoryId: string | null;
	categoryName: string;
	fields: Fields;
	labelType: string | null;
	fileName: string | null;
	createdAt: string;
	updatedAt: string;
};

export type VialInput = {
	categoryId: string | null;
	fields: Fields;
	labelType: string | null;
	fileName: string | null;
};

const selectFrom = (source: string) => `
	SELECT v.id, v.category_id, c.name AS category_name, v.label_type, v.file_name,
		v.created_at, v.updated_at, ${COLUMNS.map((column) => `v.${column}`).join(', ')}
	FROM ${source} v
	LEFT JOIN categories c ON c.id = v.category_id`;

function toVial(row: Record<string, unknown>): Vial {
	return {
		id: String(row.id),
		categoryId: row.category_id === null ? null : String(row.category_id),
		categoryName: (row.category_name as string | null) ?? UNCATEGORIZED_NAME,
		fields: Object.fromEntries(
			FIELD_NAMES.map((name) => [
				name,
				(row[FIELD_COLUMNS[name].column] as string | null) ?? '',
			]),
		) as Fields,
		labelType: row.label_type as string | null,
		fileName: row.file_name as string | null,
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	};
}

/** A bigint id as a string, or null if it can't be one. */
export function parseCategoryId(value: unknown) {
	const text = typeof value === 'number' ? String(value) : value;
	return typeof text === 'string' && /^[1-9]\d{0,17}$/.test(text) ? text : null;
}

/** A category to put a vial in. Leaving it out means uncategorized. */
export function parseVialCategory(
	value: unknown,
): { categoryId: string | null } | { error: string } {
	if (value === undefined || value === null || value === UNCATEGORIZED_ID) {
		return { categoryId: null };
	}
	const categoryId = parseCategoryId(value);
	return categoryId ? { categoryId } : { error: 'Invalid categoryId' };
}

/** An id in the vials.id range, or null, so a huge id is "not found" rather than a database error. */
export function parseVialId(value: string) {
	return /^[1-9]\d{0,9}$/.test(value) && Number(value) <= MAX_VIAL_ID
		? value
		: null;
}

function cleanText(value: unknown, name: string, max: number) {
	if (value === undefined || value === null) return { text: '' };
	if (typeof value !== 'string' || value.includes('\0')) {
		return { error: `${name} must be text` };
	}
	const text = value.trim();
	if (text.length > max) {
		return { error: `${name} must be ${max} characters or fewer` };
	}
	return { text };
}

export function parseVialInput(
	body: unknown,
): { input: VialInput } | { error: string } {
	if (typeof body !== 'object' || body === null) {
		return { error: 'Send a JSON object' };
	}
	const { categoryId, fields, labelType, fileName } = body as Record<
		string,
		unknown
	>;

	const category = parseVialCategory(categoryId);
	if ('error' in category) return category;
	if (typeof fields !== 'object' || fields === null) {
		return { error: 'fields is required' };
	}

	const cleaned = {} as Fields;
	for (const name of FIELD_NAMES) {
		const result = cleanText(
			(fields as Record<string, unknown>)[name],
			name,
			FIELD_COLUMNS[name].max,
		);
		if (result.error !== undefined) return { error: result.error };
		cleaned[name] = result.text;
	}

	const type = cleanText(labelType, 'labelType', MAX_LABEL_TYPE);
	if (type.error !== undefined) return { error: type.error };
	const file = cleanText(fileName, 'fileName', MAX_FILE_NAME);
	if (file.error !== undefined) return { error: file.error };

	return {
		input: {
			categoryId: category.categoryId,
			fields: cleaned,
			labelType: type.text || null,
			fileName: file.text || null,
		},
	};
}

const fieldValues = (fields: Fields) =>
	FIELD_NAMES.map((name) => fields[name] || null);

/** All vials, or one category's. A categoryId of null means the uncategorized ones. */
export async function listVials(categoryId?: string | null) {
	const where =
		categoryId === undefined
			? ''
			: categoryId === null
				? 'WHERE v.category_id IS NULL'
				: 'WHERE v.category_id = $1';
	const { rows } = await getDb().query(
		`${selectFrom('vials')} ${where} ORDER BY v.id`,
		categoryId ? [categoryId] : [],
	);
	return rows.map(toVial);
}

export async function getVial(id: string) {
	const { rows } = await getDb().query(
		`${selectFrom('vials')} WHERE v.id = $1`,
		[id],
	);
	return rows[0] ? toVial(rows[0]) : null;
}

export async function createVial({
	categoryId,
	fields,
	labelType,
	fileName,
}: VialInput) {
	const placeholders = COLUMNS.map((_, index) => `$${index + 5}`).join(', ');
	const { rows } = await getDb().query(
		`WITH saved AS (
			INSERT INTO vials (vial_id, category_id, label_type, file_name, ${COLUMNS.join(', ')})
			VALUES ($1, $2, $3, $4, ${placeholders})
			RETURNING *
		) ${selectFrom('saved')}`,
		// vial_id is required by the table, and labels don't carry one of their own.
		[randomUUID(), categoryId, labelType, fileName, ...fieldValues(fields)],
	);
	return toVial(rows[0]);
}

/** Replaces the vial's values. An omitted labelType or fileName keeps the current one. */
export async function updateVial(
	id: string,
	{ categoryId, fields, labelType, fileName }: VialInput,
) {
	const assignments = COLUMNS.map(
		(column, index) => `${column} = $${index + 5}`,
	).join(', ');
	const { rows } = await getDb().query(
		`WITH saved AS (
			UPDATE vials SET category_id = $2,
				label_type = COALESCE($3, label_type),
				file_name = COALESCE($4, file_name),
				${assignments},
				updated_at = now()
			WHERE id = $1
			RETURNING *
		) ${selectFrom('saved')}`,
		[id, categoryId, labelType, fileName, ...fieldValues(fields)],
	);
	return rows[0] ? toVial(rows[0]) : null;
}

/** Moves a vial to another category, or to uncategorized with null. */
export async function moveVial(id: string, categoryId: string | null) {
	const { rows } = await getDb().query(
		`WITH saved AS (
			UPDATE vials SET category_id = $2, updated_at = now()
			WHERE id = $1
			RETURNING *
		) ${selectFrom('saved')}`,
		[id, categoryId],
	);
	return rows[0] ? toVial(rows[0]) : null;
}

export async function deleteVial(id: string) {
	const { rowCount } = await getDb().query('DELETE FROM vials WHERE id = $1', [
		id,
	]);
	return rowCount === 1;
}

/** The response for a failed query. Details go to the server log, not the client. */
export function databaseError(message: string, error: unknown) {
	const code = (error as { code?: string }).code;
	if (code === '23503') {
		return NextResponse.json(
			{ error: 'That category does not exist' },
			{ status: 400 },
		);
	}
	console.error(`${message}:`, error);
	return NextResponse.json({ error: message }, { status: 503 });
}
