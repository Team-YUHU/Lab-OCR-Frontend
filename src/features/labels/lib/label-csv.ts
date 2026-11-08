export const CSV_COLUMNS = [
	{ name: 'sampleId', label: 'Sample ID' },
	{ name: 'dateSampled', label: 'Date Sampled' },
	{ name: 'dateReceived', label: 'Date Received' },
	{ name: 'machine', label: 'Machine' },
	{ name: 'component', label: 'Component' },
	{ name: 'serialNumber', label: 'Serial Number' },
	{ name: 'referenceLube', label: 'Reference Lube' },
] as const;

export type FieldName = (typeof CSV_COLUMNS)[number]['name'];
export type Fields = Record<FieldName, string>;

function escapeCell(value: string) {
	return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Builds the CSV from one label or many, one row each. */
export function buildCsv(fields: Fields | Fields[]) {
	const header = CSV_COLUMNS.map((column) => escapeCell(column.label));
	const rows = [fields]
		.flat()
		.map((row) => CSV_COLUMNS.map((column) => escapeCell(row[column.name])));
	return [header, ...rows].map((cells) => `${cells.join(',')}\r\n`).join('');
}

/** Returns a safe file name ending in .csv, or null if nothing usable is left. */
export function toCsvFileName(input: string) {
	const base = input
		// Characters that aren't allowed in Windows file names.
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
		.trim()
		.replace(/\.csv$/i, '')
		.replace(/[. ]+$/, '');
	return base ? `${base}.csv` : null;
}

/** Today's date on the reviewer's own computer, as YYYY-MM-DD. */
export function todayLocal(now = new Date()) {
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
}
