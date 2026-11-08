import { NextResponse } from 'next/server';
import { isOcrConfigured, readLabel } from '@/server/ocr/read-label';

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/webp',
	'video/mp4',
	'video/quicktime',
	'video/webm',
]);

// POST /api/v1/ocr with a photo or video as "image", "file" or "video": reads the label on it.
export async function POST(request: Request) {
	if (!isOcrConfigured()) {
		return NextResponse.json(
			{ error: 'OCR service is not configured. Set API_KEY to enable OCR.' },
			{ status: 503 },
		);
	}

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
		return NextResponse.json(await readLabel(buffer, file.type));
	} catch (error) {
		console.error('OCR request failed:', error);
		return NextResponse.json(
			{ error: 'Could not read the label from the file' },
			{ status: 502 },
		);
	}
}
