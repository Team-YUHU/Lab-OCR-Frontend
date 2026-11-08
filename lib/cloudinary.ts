import { v2 as cloudinary } from 'cloudinary';

// Either name works: .env.local may use the public-style name for the cloud.
const CLOUD_NAME =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_NAME;

cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;

/** Where vial photos (and stills from vial videos) are kept in Cloudinary. */
export const VIAL_MEDIA_FOLDER = 'lab-ocr/vials';

export type MediaType = 'video' | 'image';

/** The original recording or photo a vial was read from. */
export type VialMedia = { publicId: string; resourceType: MediaType; url: string };

export function isCloudinaryConfigured() {
    return Boolean(
        CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET,
    );
}

/**
 * Lets the browser upload one file straight to Cloudinary, into the vials folder only.
 * The secret stays on the server; the signature expires after an hour.
 */
export function signVialUpload() {
    const timestamp = Math.round(Date.now() / 1000);
    const params = { timestamp, folder: VIAL_MEDIA_FOLDER };
    return {
        cloudName: CLOUD_NAME!,
        apiKey: process.env.CLOUDINARY_API_KEY!,
        ...params,
        signature: cloudinary.utils.api_sign_request(
            params,
            process.env.CLOUDINARY_API_SECRET!,
        ),
    };
}

/**
 * Media details from a client, or null when there are none. Only accepts files in our own
 * cloud and folder, so a vial can't be pointed at someone else's URL.
 */
export function parseVialMedia(value: unknown): { media: VialMedia | null } | { error: string } {
    if (value === undefined || value === null) return { media: null };
    const { publicId, resourceType, url } = value as Record<string, unknown>;
    const cloud = CLOUD_NAME;
    if (
        typeof publicId !== 'string' ||
        typeof url !== 'string' ||
        // Only stills are kept: a photo, or a video's sharpest frame.
        resourceType !== 'image' ||
        !cloud ||
        !publicId.startsWith(`${VIAL_MEDIA_FOLDER}/`) ||
        publicId.length > 255 ||
        url.length > 1000 ||
        !url.startsWith(`https://res.cloudinary.com/${cloud}/${resourceType}/upload/`) ||
        !url.includes(publicId)
    ) {
        return { error: 'media is not a valid upload' };
    }
    return { media: { publicId, resourceType, url } };
}

/** Removes a vial's file from Cloudinary. Failures are logged, not thrown: the vial is already gone. */
export async function deleteVialMedia(publicId: string, resourceType: MediaType) {
    if (!isCloudinaryConfigured()) return;
    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
        });
    } catch (error) {
        console.error(`Could not delete ${publicId} from Cloudinary:`, error);
    }
}
