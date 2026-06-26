// uploadMiddleware.js
// IMPORTANT: This file must have ZERO side effects at require() time.
// No fs calls, no Cloudinary init, no multer storage creation — all deferred to request time.

const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = /jpeg|jpg|png|webp|pdf|heic|heif/;
const ALLOWED_MIME = /jpeg|jpg|png|webp|pdf|heic|heif/;

// Read env flags — pure reads, no side effects
const shouldUseCloudinary = () => process.env.USE_CLOUDINARY === 'true';
const isVercel = () => process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isProduction = () => process.env.NODE_ENV === 'production';
const shouldUseLocalUploads = () => !shouldUseCloudinary() && !isVercel() && !isProduction();

const fileFilter = (req, file, cb) => {
  const ext = ALLOWED_EXT.test(path.extname(file.originalname).toLowerCase());
  const mime = ALLOWED_MIME.test(file.mimetype.toLowerCase());
  if (ext && mime) cb(null, true);
  else cb(new Error('Only JPG, JPEG, PNG, WEBP, and PDF files are allowed'));
};

// Called only when an actual upload request arrives on a local dev server
const createLocalStorage = () => {
  const fs = require('fs');
  const uploadDir = path.join(process.cwd(), 'uploads');
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
};

// Called only when an actual upload request arrives in production with Cloudinary enabled
const createCloudinaryStorage = () => {
  const { configureCloudinary, getCloudinary } = require('../config/cloudinary');
  configureCloudinary(); // throws with clear message if env vars missing
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  return new CloudinaryStorage({
    cloudinary: getCloudinary(),
    params: async (req, file) => {
      const isPdf =
        file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf');
      return {
        folder: 'siteledger/receipts',
        resource_type: isPdf ? 'raw' : 'image',
        public_id: `receipt-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        format: isPdf ? undefined : path.extname(file.originalname).replace('.', '') || 'jpg',
      };
    },
  });
};

/**
 * uploadSingle(fieldName) — returns an Express middleware array.
 * Everything (storage creation, env checks, fs access) is deferred until a real
 * upload request arrives. The module itself is completely side-effect-free.
 */
const uploadSingle = (fieldName) => [
  // Step 1: guard — runs synchronously, no I/O
  (req, res, next) => {
    if ((isVercel() || isProduction()) && !shouldUseCloudinary()) {
      return res.status(500).json({
        success: false,
        message:
          'File uploads require Cloudinary in production. Set USE_CLOUDINARY=true and provide Cloudinary credentials.',
      });
    }
    next();
  },

  // Step 2: build multer on-demand and process the file
  (req, res, next) => {
    let storage;
    try {
      if (shouldUseCloudinary()) {
        storage = createCloudinaryStorage();
      } else if (shouldUseLocalUploads()) {
        storage = createLocalStorage();
      } else {
        return res.status(500).json({
          success: false,
          message: 'File uploads are not configured for this environment.',
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });
    // Wrap in try-catch to prevent unhandled promise rejections crashing the server
    try {
      upload.single(fieldName)(req, res, (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: err.message || 'Upload failed' });
        }
        next();
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Upload failed. Check Cloudinary credentials.' });
    }
  },
];

module.exports = { uploadSingle, shouldUseLocalUploads };
