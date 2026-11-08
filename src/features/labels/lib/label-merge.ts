import type { FieldName } from './label-csv';

export type OcrFieldName = Exclude<FieldName, 'dateReceived'>;

export type FrameResult = {
	labelType: string | null;
	fields: Record<OcrFieldName, string>;
};

export type MergedResult = FrameResult & {
	/** Other non-empty values frames read for a field, for the reviewer to check. */
	alternatives: Partial<Record<OcrFieldName, string[]>>;
};

/** Ranks values by how often they appear; ties keep the earliest frame's value. */
function rankByCount(values: string[]) {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([value]) => value);
}

/**
 * Combines separate reads of one label. A blank read means that frame couldn't
 * see the field, so any value read elsewhere is preferred over a blank.
 */
export function mergeFrameResults(results: FrameResult[]): MergedResult {
	const labelTypes = results.flatMap((result) => result.labelType ?? []);
	const fieldNames = Object.keys(results[0].fields) as OcrFieldName[];

	const fields = {} as Record<OcrFieldName, string>;
	const alternatives: MergedResult['alternatives'] = {};

	for (const name of fieldNames) {
		const [best = '', ...others] = rankByCount(
			results.map((result) => result.fields[name]).filter(Boolean),
		);
		fields[name] = best;
		if (others.length > 0) alternatives[name] = others;
	}

	return { labelType: rankByCount(labelTypes)[0] ?? null, fields, alternatives };
}
