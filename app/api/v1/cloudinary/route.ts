import { NextResponse } from "next/server";
import cloudinary from '@/lib/cloudinary';
import { UploadApiResponse } from 'cloudinary';

export async function POST(request: Request) {
    console.log(await cloudinary.api.ping());

    try {
        const formData = await request.formData();
        const file = formData.get('image');

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary using an upload stream wrapped in a Promise
        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'auto',
                },
                (error, result) => {
                    if (error) {
                        console.log("Error: " + error);
                        return reject(error);
                    }
                    
                    // Explicitly guard against an undefined result
                    if (!result) {
                        return reject(new Error('Cloudinary upload failed: No response received'));
                    }

                    // TypeScript now knows for sure that `result` is a valid UploadApiResponse
                    resolve(result);
                }
            );

            uploadStream.end(buffer);
        });

        console.log('Cloudinary Upload Success:', uploadResult.secure_url);

        //  Return the secure URL and metadata back to the client
        return NextResponse.json({ 
            success: true, 
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            format: uploadResult.format,
            resourceType: uploadResult.resource_type,
        });
    } catch (error: any) {
        console.error('Cloudinary upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' }, 
            { status: 500 }
        );
    }
}