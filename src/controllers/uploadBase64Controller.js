const fs = require('fs');
const path = require('path');
const { getCloudinary, isCloudinaryEnabled, configureCloudinary } = require('../config/cloudinary');

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = /\.(jpe?g|png|webp|pdf|heic|heif)$/i;
const ALLOWED_MIME = /^(image\/(jpeg|jpg|png|webp|heic|heif)|application\/pdf)$/i;

const isAllowedUpload = (fileName, mimeType) => {
  const nameOk = ALLOWED_EXT.test(fileName || '');
  const mimeOk = ALLOWED_MIME.test(mimeType || '');
  return nameOk || mimeOk;
};

const uploadToCloudinary = async (buffer, fileName, mimeType) => {
  const cloudinary = require('cloudinary').v2;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(`Cloudinary env vars missing: cloud_name=${!!cloudName} api_key=${!!apiKey} api_secret=${!!apiSecret}`);
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const base64 = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  return cloudinary.uploader.upload(dataUri, {
    folder: 'siteledger/uploads',
    resource_type: isPdf ? 'raw' : 'image',
    public_id: `upload-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  });
};

const saveLocalFile = (buffer, fileName) => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const ext = path.extname(fileName) || '.jpg';
  const storedName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  fs.writeFileSync(path.join(uploadDir, storedName), buffer);
  return storedName;
};

const uploadBase64 = async (req, res) => {
  try {
    const { base64, fileName, mimeType } = req.body || {};
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ success: false, message: 'No file data provided' });
    }

    const safeName = String(fileName || 'upload.jpg').replace(/[^\w.\-]/g, '_');
    const mime = String(mimeType || 'image/jpeg');

    if (!isAllowedUpload(safeName, mime)) {
      return res.status(400).json({
        success: false,
        message: 'Only JPG, JPEG, PNG, WEBP, HEIC, and PDF files are allowed',
      });
    }

    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ success: false, message: 'Invalid file data' });
    }
    if (buffer.length > MAX_BYTES) {
      return res.status(400).json({ success: false, message: 'File size exceeds 10MB limit' });
    }

    // Try Cloudinary first if enabled
    if (isCloudinaryEnabled()) {
      try {
        const result = await uploadToCloudinary(buffer, safeName, mime);
        return res.json({
          success: true,
          message: 'File uploaded successfully',
          data: {
            url: result.secure_url,
            fileName: safeName,
            mimeType: mime,
            publicId: result.public_id,
          },
        });
      } catch (cloudErr) {
        console.error('Cloudinary failed, falling back to base64 storage:', cloudErr.message);
        // Fall through to base64 storage below
      }
    }

    // Fallback: store base64 data URI directly in MongoDB
    // Works on any hosting — no file system or Cloudinary needed
    const isPdf = mime.includes('pdf') || safeName.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      const dataUri = `data:${mime};base64,${base64}`;
      return res.json({
        success: true,
        message: 'File stored successfully',
        data: {
          url: dataUri,
          fileName: safeName,
          mimeType: mime,
        },
      });
    }

    // For local dev with disk access
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isVercel && !isProduction) {
      const storedName = saveLocalFile(buffer, safeName);
      return res.json({
        success: true,
        message: 'File uploaded successfully',
        data: { url: `/uploads/${storedName}`, fileName: safeName, mimeType: mime },
      });
    }

    // PDF on production without Cloudinary — store as base64
    const dataUri = `data:${mime};base64,${base64}`;
    return res.json({
      success: true,
      message: 'File stored successfully',
      data: { url: dataUri, fileName: safeName, mimeType: mime },
    });

  } catch (err) {
    console.error('uploadBase64 error:', JSON.stringify(err));
    const message = err.message || 'Upload failed';
    return res.status(500).json({ success: false, message });
  }
};

module.exports = { uploadBase64, isAllowedUpload };
