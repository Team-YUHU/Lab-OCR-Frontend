// What the model is asked to read from a sample tube label, and the JSON shape it must reply in.

/** The label fields the model reads. Date Received isn't on the label; reviewers fill it in. */
export const OCR_FIELD_NAMES = [
	'sampleId',
	'dateSampled',
	'machine',
	'component',
	'serialNumber',
	'referenceLube',
] as const;

export type OcrFieldName = (typeof OCR_FIELD_NAMES)[number];

export const LABEL_PROMPT = `These images are frames from ONE short video of a single sample tube.
The tube is turned during the video, so each field may be visible in only some frames.
Look at every frame and use the frame where each field is clearest.

Return the label fields. Copy each value exactly as written. Never guess or correct a value.
Use null for anything blank, hidden in every frame, or unreadable.
Handwriting is common: if a character is ambiguous (S vs 5, O vs 0, I vs 1), keep the
reading most frames agree on.

labelType rules:
- "large": has the headings Equip ID, Sample point and Ref Lube.
- "small": has the headings RN and SN, with circled numbers and GS/NGS options.

Fields guide:
- sampleId: the number printed under the barcode, or the Num field.
- dateSampled: the Date field.
- machine: Equip ID on a large label, RN on a small label.
- component: Sample point on a large label. On a small label, the circled number, a space, then the circled GS or NGS.
- serialNumber: SN on a small label. Always null on a large label.
- referenceLube: Ref Lube on a large label. Always null on a small label.

On a large label, each printed heading is followed by its own handwritten value on the same line:
- "Equip ID:" line: the entire handwritten text on that line, however long, is machine. Never split it across fields.
- "Sample point:" line: the handwritten text on that line is component, even if it is only digits.
- "Ref Lube:" line: referenceLube.
Never take a field's value from a different heading's line.`;

const nullableString = { type: ['string', 'null'] };

export const LABEL_RESPONSE_SCHEMA = {
	type: 'object',
	properties: {
		labelType: { type: 'string', enum: ['large', 'small'] },
		...Object.fromEntries(OCR_FIELD_NAMES.map((n) => [n, nullableString])),
	},
	required: ['labelType', ...OCR_FIELD_NAMES],
};
