import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { FieldName, Fields } from '@/features/labels/lib/label-csv';
import { UNCATEGORIZED_ID, UNCATEGORIZED_NAME } from '@/lib/categories';
import {
	deleteVialMedia,
	parseVialMedia,
	type MediaType,
	type VialMedia,
} from './cloudinary';
import { getDb } from '@/server/db/client';

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
const MAX_NAME = 100;
const MAX_DESCRIPTION = 1000;
const MAX_AUTHOR_NAME = 200;
// A little slack for a phone whose clock runs ahead of the server's.
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export type Vial = {
	id: string;
	/** Null means uncategorized. */
	categoryId: string | null;
	categoryName: string;
	fields: Fields;
	labelType: string | null;
	fileName: string | null;
	/** Optional, set by people. Not CSV columns. */
	name: string | null;
	description: string | null;
	/** When the label was read. Null for vials saved before this was recorded. */
	scannedAt: string | null;
	/** Who added the vial, as their name was then. Null for vials saved before sign-in. */
	createdByName: string | null;
	/** The original recording or photo in Cloudinary. Null when none was kept. */
	media: { resourceType: MediaType; url: string } | null;
	createdAt: string;
	updatedAt: string;
};

export type VialInput = {
	categoryId: string | null;
	fields: Fields;
	labelType: string | null;
	fileName: string | null;
	name: string | null;
	description: string | null;
	/** Null means now. Only used when the vial is first saved. */
	scannedAt: string | null;
	/** The uploaded recording or photo. Only used when the vial is first saved. */
	media: VialMedia | null;
};

/** The signed-in person saving a vial. */
export type Author = { userId: string; name: string | null };

const selectFrom = (source: string) => `
	SELECT v.id, v.category_id, c.name AS category_name, v.label_type, v.file_name,
		v.name, v.description, v.scanned_at, v.created_by_name,
		v.media_resource_type, v.media_url,
		v.created_at, v.updated_at, ${COLUMNS.map((column) => `v.${column}`).join(', ')}
	FROM ${source} v
	LEFT JOIN categories c ON c.id = v.category_id`;

// pg returns timestamptz columns as Dates.
function toIso(value: unknown) {
	return value instanceof Date ? value.toISOString() : (value as string | null);
}

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
		name: row.name as string | null,
		description: row.description as string | null,
		scannedAt: toIso(row.scanned_at),
		createdByName: row.created_by_name as string | null,
		media: row.media_url
			? {
					resourceType: row.media_resource_type as MediaType,
					url: row.media_url as string,
				}
			: null,
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
	const {
		categoryId,
		fields,
		labelType,
		fileName,
		name,
		description,
		scannedAt,
		media,
	} = body as Record<string, unknown>;

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
	const title = cleanText(name, 'name', MAX_NAME);
	if (title.error !== undefined) return { error: title.error };
	const notes = cleanText(description, 'description', MAX_DESCRIPTION);
	if (notes.error !== undefined) return { error: notes.error };
	const scanned = parseScannedAt(scannedAt);
	if ('error' in scanned) return scanned;
	const upload = parseVialMedia(media);
	if ('error' in upload) return upload;

	return {
		input: {
			categoryId: category.categoryId,
			fields: cleaned,
			labelType: type.text || null,
			fileName: file.text || null,
			name: title.text || null,
			description: notes.text || null,
			scannedAt: scanned.scannedAt,
			media: upload.media,
		},
	};
}

/** An ISO timestamp from the client, or null for now. A time in the future is refused. */
function parseScannedAt(
	value: unknown,
): { scannedAt: string | null } | { error: string } {
	if (value === undefined || value === null) return { scannedAt: null };
	const time = typeof value === 'string' ? Date.parse(value) : NaN;
	if (Number.isNaN(time) || time > Date.now() + CLOCK_SKEW_MS) {
		return { error: 'scannedAt must be a past date and time' };
	}
	return { scannedAt: new Date(time).toISOString() };
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

export async function createVial(
	{
		categoryId,
		fields,
		labelType,
		fileName,
		name,
		description,
		scannedAt,
		media,
	}: VialInput,
	author: Author,
) {
	const placeholders = COLUMNS.map((_, index) => `$${index + 13}`).join(', ');
	const { rows } = await getDb().query(
		`WITH saved AS (
			INSERT INTO vials (vial_id, category_id, label_type, file_name, name, description,
				scanned_at, created_by, created_by_name,
				media_public_id, media_resource_type, media_url, ${COLUMNS.join(', ')})
			VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()), $8, $9,
				$10, $11, $12, ${placeholders})
			RETURNING *
		) ${selectFrom('saved')}`,
		[
			// vial_id is required by the table, and labels don't carry one of their own.
			randomUUID(),
			categoryId,
			labelType,
			fileName,
			name,
			description,
			scannedAt,
			author.userId,
			author.name?.slice(0, MAX_AUTHOR_NAME) ?? null,
			media?.publicId ?? null,
			media?.resourceType ?? null,
			media?.url ?? null,
			...fieldValues(fields),
		],
	);
	return toVial(rows[0]);
}

/**
 * Replaces the vial's values. An omitted labelType or fileName keeps the current one.
 * The scan time, author and media stay as they were when the vial was first saved.
 */
export async function updateVial(
	id: string,
	{ categoryId, fields, labelType, fileName, name, description }: VialInput,
) {
	const assignments = COLUMNS.map(
		(column, index) => `${column} = $${index + 7}`,
	).join(', ');
	const { rows } = await getDb().query(
		`WITH saved AS (
			UPDATE vials SET category_id = $2,
				label_type = COALESCE($3, label_type),
				file_name = COALESCE($4, file_name),
				name = $5,
				description = $6,
				${assignments},
				updated_at = now()
			WHERE id = $1
			RETURNING *
		) ${selectFrom('saved')}`,
		[
			id,
			categoryId,
			labelType,
			fileName,
			name,
			description,
			...fieldValues(fields),
		],
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

/** Deletes the vial, then its recording or photo in Cloudinary. */
export async function deleteVial(id: string) {
	const { rows } = await getDb().query(
		'DELETE FROM vials WHERE id = $1 RETURNING media_public_id, media_resource_type',
		[id],
	);
	if (!rows[0]) return false;
	const { media_public_id: publicId, media_resource_type: resourceType } = rows[0];
	if (publicId) await deleteVialMedia(publicId, resourceType);
	return true;
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
