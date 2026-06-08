const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isCloudinaryEnabled, configureCloudinary } = require('../config/cloudinary');

const ALLOWED_EXT = /jpeg|jpg|png|webp|pdf/;
const ALLOWED_MIME = /jpeg|jpg|png|webp|pdf/;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Determine environment once at startup — NO filesystem side effects here
const shouldUseCloudinary = process.env.USE_CLOUDINARY === 'true';
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const shouldUseLocalUploads = !shouldUseCloudinary && !isVercel && !isProduction;

const fileFilter = (req, file, cb) => {
  const ext = ALLOWED_EXT.test(path.extname(file.originalname).toLowerCase());
  const mime = ALLOWED_MIME.test(file.mimetype.toLowerCase());
  if (ext && mime) cb(null, true);
  else cb(new Error('Only JPG, JPEG, PNG, WEBP, and PDF files are allowed'));
};

const createLocalStorage = () => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  // Only create the folder at request time (inside diskStorage), never at module load
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
};

const createCloudinaryStorage = () => {
  configureCloudinary();
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('../config/cloudinary').getCloudinary();

  return new CloudinaryStorage({
    cloudinary,
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

// Guard middleware: rejects upload requests on Vercel when Cloudinary is not configured
const requireCloudinaryOnServerless = (req, res, next) => {
  if ((isVercel || isProduction) && !shouldUseCloudinary) {
    return res.status(500).json({
      success: false,
      message: 'File uploads require Cloudinary in production. Set USE_CLOUDINARY=true and provide Cloudinary credentials.',
    });
  }
  next();
};

// Build the multer instance lazily — storage is chosen once, but NO fs calls happen at module load
const buildUpload = () => {
  if (shouldUseCloudinary) {
    return multer({
      storage: createCloudinaryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter,
    });
  }

  if (shouldUseLocalUploads) {
    return multer({
      storage: createLocalStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter,
    });
  }

  // Vercel / production without Cloudinary — return a no-op multer that never touches disk
  // The requireCloudinaryOnServerless guard above will short-circuit before multer runs
  return multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE }, fileFilter });
};

const upload = buildUpload();

// Export a wrapped single-file handler that enforces the serverless guard first
const uploadSingle = (fieldName) => [requireCloudinaryOnServerless, upload.single(fieldName)];

module.exports = upload;
module.exports.uploadSingle = uploadSingle;
module.exports.shouldUseLocalUploads = shouldUseLocalUploads;
