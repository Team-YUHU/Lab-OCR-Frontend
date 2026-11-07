import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobe.path);

// Any OpenAI-compatible API, set in .env.local: Gemini for demos, Ollama for tests.
const client = new OpenAI({
	apiKey: process.env.API_KEY,
	baseURL: process.env.BASE_URL,
});

const MODEL = process.env.MODEL ?? 'gemini-3.8-flash';
const MAX_BYTES = 50 * 1024 * 1024;
const FRAMES_TO_SEND = 8; // the tube rotates, so the fields are spread across frames
const ALLOWED_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/webp',
	'video/mp4',
	'video/quicktime',
	'video/webm',
]);

const FIELD_NAMES = [
	'sampleId',
	'dateSampled',
	'machine',
	'component',
	'serialNumber',
	'referenceLube',
] as const;

const PROMPT = `These images are frames from ONE short video of a single sample tube.
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
const RESPONSE_SCHEMA = {
	type: 'object',
	properties: {
		labelType: { type: 'string', enum: ['large', 'small'] },
		...Object.fromEntries(FIELD_NAMES.map((n) => [n, nullableString])),
	},
	required: ['labelType', ...FIELD_NAMES],
};

function probeDuration(file: string): Promise<number> {
	return new Promise((resolve, reject) =>
		ffmpeg.ffprobe(file, (err, data) =>
			err ? reject(err) : resolve(Number(data.format.duration) || 0),
		),
	);
}

// Pulls evenly spaced frames at the video's native resolution.
// No upscaling: it adds no detail and only makes the image bigger.
async function extractFrames(
	videoBuffer: Buffer,
	mimeType: string,
	count = FRAMES_TO_SEND,
): Promise<Buffer[]> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-video-'));
	const ext = mimeType.includes('quicktime')
		? 'mov'
		: mimeType.includes('webm')
			? 'webm'
			: 'mp4';
	const inputPath = path.join(tmpDir, `input.${ext}`);

	try {
		await fs.writeFile(inputPath, videoBuffer);
		const duration = await probeDuration(inputPath);
		const fps = duration > 0 ? count / duration : 1;

		await new Promise<void>((resolve, reject) => {
			ffmpeg(inputPath)
				.outputOptions([
					'-vf',
					`fps=${fps}`,
					'-q:v',
					'2',
					'-frames:v',
					String(count),
				])
				.output(path.join(tmpDir, 'frame_%02d.jpg'))
				.on('end', () => resolve())
				.on('error', reject)
				.run();
		});

		const names = (await fs.readdir(tmpDir))
			.filter((f) => f.startsWith('frame_'))
			.sort();
		return Promise.all(names.map((n) => fs.readFile(path.join(tmpDir, n))));
	} finally {
		await fs.rm(tmpDir, { recursive: true, force: true });
	}
}

// zxing-wasm downloads its .wasm from a CDN by default; load the local copy instead.
// Read by path because the bundler tries to compile a require.resolve() of a .wasm file.
const ZXING_WASM_PATH = path.join(
	process.cwd(),
	'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
);
let zxingReady: Promise<unknown> | null = null;
function loadZXing() {
	zxingReady ??= fs
		.readFile(ZXING_WASM_PATH)
		.then((wasm) =>
			prepareZXingModule({
				overrides: {
					wasmBinary: wasm.buffer.slice(
						wasm.byteOffset,
						wasm.byteOffset + wasm.byteLength,
					) as ArrayBuffer,
				},
				fireImmediately: true,
			}),
		);
	return zxingReady;
}

// Decodes the printed barcode exactly. Returns the value seen in the most frames.
async function readSampleIdFromBarcode(
	images: Buffer[],
): Promise<string | null> {
	await loadZXing();
	const votes = new Map<string, number>();
	for (const img of images) {
		const results = await readBarcodes(new Blob([new Uint8Array(img)]), {
			formats: ['Code128', 'Code39', 'EAN13', 'ITF'],
			tryHarder: true,
			tryRotate: true,
		});
		for (const r of results) {
			if (r.isValid && r.text) votes.set(r.text, (votes.get(r.text) ?? 0) + 1);
		}
	}
	const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
	return best?.[0] ?? null;
}

export async function POST(request: Request) {
	let file: FormDataEntryValue | null;

	try {
		const formData = await request.formData();
		file =
			formData.get('image') || formData.get('file') || formData.get('video');
	} catch {
		return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
	}

	if (!(file instanceof File)) {
		return NextResponse.json({ error: 'File is required' }, { status: 400 });
	}
	if (!ALLOWED_TYPES.has(file.type)) {
		return NextResponse.json(
			{
				error:
					'File must be an image (PNG, JPEG, WebP) or video (MP4, MOV, WebM)',
			},
			{ status: 415 },
		);
	}
	if (file.size > MAX_BYTES) {
		return NextResponse.json(
			{ error: 'File must be 50 MB or smaller' },
			{ status: 413 },
		);
	}

	try {
		const buffer = Buffer.from(await file.arrayBuffer());
		const isVideo = file.type.startsWith('video/');
		const images = isVideo ? await extractFrames(buffer, file.type) : [buffer];
		const imageType = isVideo ? 'image/jpeg' : file.type;

		const [barcodeId, completion] = await Promise.all([
			readSampleIdFromBarcode(images),
			client.chat.completions.create({
				model: MODEL,
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: PROMPT },
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
					json_schema: { name: 'tube_label', schema: RESPONSE_SCHEMA },
				},
			}),
		]);

		const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');

		const fields = Object.fromEntries(
			FIELD_NAMES.map((name) => {
				const value = parsed?.[name];
				return [name, typeof value === 'string' ? value.trim() : ''];
			}),
		) as Record<(typeof FIELD_NAMES)[number], string>;

		// The barcode is exact; the model's reading of the digits is not.
		if (barcodeId) fields.sampleId = barcodeId;
		if (parsed?.labelType === 'large') fields.serialNumber = '';
		if (parsed?.labelType === 'small') fields.referenceLube = '';

		return NextResponse.json({
			labelType: parsed?.labelType ?? null,
			fields,
			sampleIdSource: barcodeId ? 'barcode' : 'model',
			framesUsed: images.length,
			model: MODEL,
		});
	} catch (error) {
		console.error('OCR request failed:', error);
		return NextResponse.json(
			{ error: 'Could not read the label from the file' },
			{ status: 502 },
		);
	}
}
