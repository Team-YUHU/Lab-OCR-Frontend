import { NextResponse } from 'next/server';
import { isCloudinaryConfigured, signVialUpload } from '@/lib/cloudinary';

// POST /api/v1/cloudinary/signature: what the browser needs to upload one vial
// recording or photo straight to Cloudinary. Signed-in only (see proxy.ts).
export async function POST() {
	if (!isCloudinaryConfigured()) {
		return NextResponse.json(
			{ error: 'Video storage is not set up on this server' },
			{ status: 503 },
		);
	}
	return NextResponse.json(signVialUpload(), {
		headers: { 'Cache-Control': 'no-store' },
	});
}
