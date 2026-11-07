import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

// fluent-ffmpeg is only a wrapper, so it has to be told where the binaries are.
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobe.path);

const client = new OpenAI({
	apiKey: process.env.API_KEY || 'ollama',
	baseURL: process.env.BASE_URL || 'http://localhost:11434/v1/',
});

const MODEL = process.env.MODEL ?? 'qwen3.5:4b';
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB for videos
const ALLOWED_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/webp',
	'video/mp4',
	'video/quicktime', // .mov
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

const PROMPT = `Read this sample tube label and return its fields as a JSON object matching this structure:
{
  "labelType": "large" or "small",
  "sampleId": string or null,
  "dateSampled": string or null,
  "machine": string or null,
  "component": string or null,
  "serialNumber": string or null,
  "referenceLube": string or null
}

Copy each value exactly as written. Never guess or correct a value.
Use null for anything blank, hidden or unreadable.

labelType rules:
- "large": has the headings Equip ID, Sample point and Ref Lube.
- "small": has the headings RN and SN, with circled numbers and GS/NGS options.

Fields guide:
- sampleId: the number printed with the barcode, or the Num field.
- dateSampled: the Date field.
- machine: Equip ID on a large label, RN on a small label.
- component: Sample point on a large label. On a small label, the circled number, a space, then the circled GS or NGS.
- serialNumber: SN on a small label. Always null on a large label.
- referenceLube: Ref Lube on a large label. Always null on a small label.`;

// Helper to extract a frame from a video file
async function extractFrameFromVideo(
	videoBuffer: Buffer,
	mimeType: string,
): Promise<Buffer> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-video-'));
	const ext = mimeType.includes('quicktime') ? 'mov' : 'mp4';
	const inputPath = path.join(tmpDir, `input.${ext}`);
	const outputPath = path.join(tmpDir, 'output.jpg');

	try {
		await fs.writeFile(inputPath, videoBuffer);

		await new Promise((resolve, reject) => {
			ffmpeg(inputPath)
				.on('end', resolve)
				.on('error', reject)
				.screenshots({
					timestamps: ['30%'], // Take frame at 30% into the video where the label is clear
					filename: 'output.jpg',
					folder: tmpDir,
					size: '1280x?',
				});
		});

		return await fs.readFile(outputPath);
	} finally {
		// Runs on failure too, so uploaded videos never pile up in the temp folder.
		await fs.rm(tmpDir, { recursive: true, force: true });
	}
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
			{ error: 'File must be an image (PNG, JPEG, WebP) or video (MP4, MOV)' },
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
		let imageBuffer: Buffer = buffer;
		let imageType = file.type;

		// If it's a video, extract a clear frame first
		if (file.type.startsWith('video/')) {
			imageBuffer = await extractFrameFromVideo(buffer, file.type);
			imageType = 'image/jpeg';
		}

		const base64Data = imageBuffer.toString('base64');

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
							image_url: { url: `data:${imageType};base64,${base64Data}` },
						},
					],
				},
			],
			response_format: { type: 'json_object' },
		});

		const rawContent = completion.choices[0]?.message?.content ?? '{}';
		const cleanedContent = rawContent.replace(/```json\s*|\s*```/g, '').trim();
		const parsed = JSON.parse(cleanedContent);

		const fields = Object.fromEntries(
			FIELD_NAMES.map((name) => {
				const value = parsed?.[name];
				return [name, typeof value === 'string' ? value.trim() : ''];
			}),
		);

		if (parsed?.labelType === 'large') fields.serialNumber = '';
		if (parsed?.labelType === 'small') fields.referenceLube = '';

		return NextResponse.json({
			labelType: parsed?.labelType ?? null,
			fields,
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
