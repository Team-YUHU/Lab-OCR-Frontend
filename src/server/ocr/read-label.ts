import OpenAI from 'openai';
import { readSampleIdFromBarcode } from './barcode';
import {
	LABEL_PROMPT,
	LABEL_RESPONSE_SCHEMA,
	OCR_FIELD_NAMES,
	type OcrFieldName,
} from './label-prompt';
import { extractVideoFrames } from './video-frames';

// Any OpenAI-compatible API, set in .env.local: Gemini for demos, Ollama for tests.
export const OCR_MODEL = process.env.MODEL ?? 'gemini-3.8-flash';

export type LabelReading = {
	labelType: 'large' | 'small' | null;
	fields: Record<OcrFieldName, string>;
	sampleIdSource: 'barcode' | 'model';
	framesUsed: number;
	model: string;
};

export function isOcrConfigured() {
	return Boolean(process.env.API_KEY);
}

/**
 * Reads a sample label from a photo or a short video. The barcode, when there is one,
 * decides the sample ID; the model reads everything else.
 */
export async function readLabel(file: Buffer, mimeType: string): Promise<LabelReading> {
	const client = new OpenAI({
		apiKey: process.env.API_KEY,
		baseURL: process.env.BASE_URL,
	});
	const isVideo = mimeType.startsWith('video/');
	const images = isVideo ? await extractVideoFrames(file, mimeType) : [file];
	const imageType = isVideo ? 'image/jpeg' : mimeType;

	const [barcodeId, completion] = await Promise.all([
		readSampleIdFromBarcode(images),
		client.chat.completions.create({
			model: OCR_MODEL,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: LABEL_PROMPT },
						...images.map((img) => ({
							type: 'image_url' as const,
							image_url: {
								url: `data:${imageType};base64,${img.toString('base64')}`,
							},
						})),
					],
				},
			],
			response_format: {
				type: 'json_schema',
				json_schema: { name: 'tube_label', schema: LABEL_RESPONSE_SCHEMA },
			},
		}),
	]);

	const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');

	const fields = Object.fromEntries(
		OCR_FIELD_NAMES.map((name) => {
			const value = parsed?.[name];
			return [name, typeof value === 'string' ? value.trim() : ''];
		}),
	) as Record<OcrFieldName, string>;

	// The barcode is exact; the model's reading of the digits is not.
	if (barcodeId) fields.sampleId = barcodeId;
	if (parsed?.labelType === 'large') fields.serialNumber = '';
	if (parsed?.labelType === 'small') fields.referenceLube = '';

	return {
		labelType: parsed?.labelType ?? null,
		fields,
		sampleIdSource: barcodeId ? 'barcode' : 'model',
		framesUsed: images.length,
		model: OCR_MODEL,
	};
}
