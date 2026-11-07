/**
 * @author Jason Wang
 *
 * Reads the handwritten fields on a sample tube label using a vision model
 * behind an OpenAI-compatible API. Results are a draft: a person reviews and
 * corrects them in the form on the home page.
 *
 * .env.local:
 *   API_KEY=ollama
 *   BASE_URL=http://localhost:11434/v1/
 *   MODEL=qwen3.5:4b      (must be a model with vision support)
 *
 * Test (PowerShell):
 *   curl.exe -F "image=@test.png;type=image/png" http://localhost:3000/api/v1/ocr
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
	apiKey: process.env.API_KEY,
	baseURL: process.env.BASE_URL,
});

const MODEL = process.env.MODEL ?? 'qwen3.5:4b';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const FIELD_NAMES = [
	'sampleId',
	'dateSampled',
	'machine',
	'component',
	'serialNumber',
	'referenceLube',
] as const;

const PROMPT = `Read this sample tube label and return its fields.
Copy each value exactly as written. Never guess or correct a value.
Use null for anything blank, hidden or unreadable.

labelType is one of:
- "large": has the headings Equip ID, Sample point and Ref Lube.
- "small": has the headings RN and SN, with circled numbers and GS/NGS options.

Fields:
- sampleId: the number printed with the barcode, or the Num field.
- dateSampled: the Date field.
- machine: Equip ID on a large label, RN on a small label.
- component: Sample point on a large label. On a small label, the circled number, a space, then the circled GS or NGS.
- serialNumber: SN on a small label. Always null on a large label.
- referenceLube: Ref Lube on a large label. Always null on a small label.`;

const SCHEMA = {
	type: 'object',
	properties: {
		labelType: { type: 'string', enum: ['large', 'small'] },
		...Object.fromEntries(
			FIELD_NAMES.map((name) => [name, { type: ['string', 'null'] }]),
		),
	},
	required: ['labelType', ...FIELD_NAMES],
};

export async function POST(request: Request) {
	let image: FormDataEntryValue | null;

	try {
		image = (await request.formData()).get('image');
	} catch {
		return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
	}

	if (!(image instanceof File)) {
		return NextResponse.json(
			{ error: 'Image file is required' },
			{ status: 400 },
		);
	}
	if (!ALLOWED_TYPES.has(image.type)) {
		return NextResponse.json(
			{ error: 'Image must be a PNG, JPEG or WebP file' },
			{ status: 415 },
		);
	}
	if (image.size > MAX_BYTES) {
		return NextResponse.json(
			{ error: 'Image must be 10 MB or smaller' },
			{ status: 413 },
		);
	}

	try {
		const data = Buffer.from(await image.arrayBuffer()).toString('base64');

		const completion = await client.chat.completions.create({
			model: MODEL,
			temperature: 0,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: PROMPT },
						{
							type: 'image_url',
							image_url: { url: `data:${image.type};base64,${data}` },
						},
					],
				},
			],
			response_format: {
				type: 'json_schema',
				json_schema: { name: 'tube_label', schema: SCHEMA },
			},
		});

		const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '');

		const fields = Object.fromEntries(
			FIELD_NAMES.map((name) => {
				const value = parsed?.[name];
				return [name, typeof value === 'string' ? value.trim() : ''];
			}),
		);

		// The CSV spec leaves these blank for each label type, whatever the model says.
		if (parsed?.labelType === 'large') fields.serialNumber = '';
		if (parsed?.labelType === 'small') fields.referenceLube = '';

		return NextResponse.json({
			labelType: parsed?.labelType ?? null,
			fields,
			model: MODEL,
		});
	} catch (error) {
		// Details stay in the server log so provider errors never reach the caller.
		console.error('OCR request failed:', error);
		return NextResponse.json(
			{ error: 'Could not read the label' },
			{ status: 502 },
		);
	}
}
