import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

const s3Client = new S3Client({
    region,
    credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
});

function assertS3Configured() {
    if (!region || !bucket) {
        throw new Error('S3 is not configured: missing AWS_REGION or AWS_S3_BUCKET');
    }
}

export function buildS3PublicUrl(key) {
    assertS3Configured();
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadBufferToS3({ key, body, contentType, cacheControl }) {
    assertS3Configured();
    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: cacheControl || 'public, max-age=31536000, immutable',
        }),
    );
    return buildS3PublicUrl(key);
}

/**
 * Fetch object from S3 (for server-side proxy / download).
 * @param {string} key
 * @returns {Promise<import('@aws-sdk/client-s3').GetObjectCommandOutput>}
 */
export async function getObjectFromS3(key) {
    assertS3Configured();
    return s3Client.send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    );
}

export async function deleteObjectFromS3(key) {
    if (!key) return;
    assertS3Configured();
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    );
}
