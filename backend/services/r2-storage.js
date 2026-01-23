/**
 * Cloud Storage Service - Cloudflare R2
 * Handles file uploads to R2 for production environments
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize R2 client only if credentials are provided
let r2Client = null;

const initR2Client = () => {
    if (r2Client) return r2Client;

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        console.log('R2 credentials not found - using local storage');
        return null;
    }

    r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });

    console.log('✓ R2 client initialized');
    return r2Client;
};

/**
 * Upload file to R2
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - Object key (path) in bucket
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - Public URL
 */
const uploadToR2 = async (fileBuffer, key, contentType) => {
    const client = initR2Client();
    if (!client) {
        throw new Error('R2 not configured');
    }

    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
        throw new Error('R2_BUCKET_NAME not set');
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // Make public readable (adjust based on R2 bucket settings)
        // ACL: 'public-read' // R2 doesn't use ACLs
    });

    await client.send(command);

    // Return public URL
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl) {
        return `${publicUrl}/${key}`;
    }

    // Fallback: construct URL from account
    return `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
};

/**
 * Get signed URL for private file access
 * @param {string} key - Object key in bucket
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
const getSignedUrlFromR2 = async (key, expiresIn = 3600) => {
    const client = initR2Client();
    if (!client) {
        throw new Error('R2 not configured');
    }

    const bucketName = process.env.R2_BUCKET_NAME;

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
    });

    return await getSignedUrl(client, command, { expiresIn });
};

/**
 * Check if R2 is configured and available
 * @returns {boolean}
 */
const isR2Available = () => {
    return !!(process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME);
};

module.exports = {
    uploadToR2,
    getSignedUrlFromR2,
    isR2Available
};
