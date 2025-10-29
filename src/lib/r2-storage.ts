import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = '8cb0db3d90f1e157c16a59a6a5ebe212';
const R2_ACCESS_KEY_ID = '625a91c9599cc24794da6480aa1b0c81';
const R2_SECRET_ACCESS_KEY = '0e7ed4b7dca00409d2d03a595cc265f63642b8baeb0a21a2e13c01bad9146540';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Create S3 client for R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Bucket name for all uploads
const BUCKET_NAME = 'app-storage';

/**
 * Upload a file to R2 storage
 * @param file - File to upload
 * @param path - Path including folder structure (e.g., "deposit-proofs/user-id/filename.jpg")
 * @returns The path that can be stored in the database
 */
export async function uploadToR2(file: File, path: string): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await r2Client.send(command);
    return path;
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a file from R2 storage
 * @param path - Path to the file to delete
 */
export async function deleteFromR2(path: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a signed URL for viewing/downloading a file from R2
 * @param path - Path to the file
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL
 */
export async function getR2SignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
  try {
    // If the path is already a full URL, return it as-is (for public URLs)
    if (path.startsWith('http')) {
      return path;
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('R2 signed URL error:', error);
    throw new Error(`Failed to get signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get public URL for a file (if bucket is configured for public access)
 * Note: This assumes you have set up a custom domain or public bucket
 * For private files, use getR2SignedUrl instead
 */
export function getR2PublicUrl(path: string, customDomain?: string): string {
  if (path.startsWith('http')) {
    return path;
  }

  if (customDomain) {
    return `${customDomain}/${path}`;
  }

  // Fallback to signed URL (you should configure a custom domain for public access)
  return path;
}

/**
 * Helper function to get image URL (handles both R2 paths and full URLs)
 * Use this for displaying images throughout the app
 */
export async function getImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  
  // If it's already a full URL (http/https) or local path, return as-is
  if (path.startsWith('http') || path.startsWith('/')) {
    return path;
  }
  
  // Otherwise, it's an R2 path - get signed URL
  try {
    return await getR2SignedUrl(path, 3600);
  } catch (error) {
    console.error('Error getting image URL:', error);
    return null;
  }
}
