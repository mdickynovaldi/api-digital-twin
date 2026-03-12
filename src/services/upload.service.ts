import { v2 as cloudinary } from 'cloudinary';

// ─── Cloudinary Config ────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type FileCategory = 'pdfs' | 'images' | 'videos';

/**
 * Generate a Cloudinary signed upload signature.
 * Client can use this to upload directly to Cloudinary without passing the file through our server.
 * This bypasses Vercel's 4.5MB serverless payload limit for large files.
 *
 * @param folder  - 'pdfs' | 'images' | 'videos'
 * @param publicId - optional custom public_id
 */
export function generateUploadSignature(folder: FileCategory, publicId?: string): {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId?: string;
} {
  const timestamp = Math.round(Date.now() / 1000);
  const cloudFolder = `digital-twin/${folder}`;

  const paramsToSign: Record<string, string | number> = {
    folder: cloudFolder,
    timestamp,
  };
  if (publicId) paramsToSign.public_id = publicId;

  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder: cloudFolder,
    ...(publicId && { publicId }),
  };
}
