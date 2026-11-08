// Uploads a vial's photo (or a still from its video) from the browser straight to Cloudinary,
// using a short-lived signature from our server. Nothing secret reaches the browser.

export type UploadedMedia = {
	publicId: string;
	resourceType: 'video' | 'image';
	url: string;
};

type Signature = {
	cloudName: string;
	apiKey: string;
	timestamp: number;
	folder: string;
	signature: string;
};

export async function uploadVialMedia(file: File): Promise<UploadedMedia> {
	const signed = await fetch('/api/v1/cloudinary/signature', { method: 'POST' });
	const signature: Signature & { error?: string } = await signed.json().catch(() => ({}));
	if (!signed.ok) throw new Error(signature.error ?? 'Could not start the upload');

	const body = new FormData();
	body.append('file', file);
	body.append('api_key', signature.apiKey);
	body.append('timestamp', String(signature.timestamp));
	body.append('folder', signature.folder);
	body.append('signature', signature.signature);

	// Only stills are kept: a photo as is, or a video's sharpest frame.
	const response = await fetch(
		`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
		{ method: 'POST', body },
	);
	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(result.error?.message ?? 'Could not upload the file');
	}
	if (result.resource_type !== 'image') {
		throw new Error('Cloudinary stored the file as an unexpected type');
	}
	return {
		publicId: result.public_id,
		resourceType: result.resource_type,
		url: result.secure_url,
	};
}
