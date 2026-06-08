const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isCloudinaryEnabled, configureCloudinary } = require('../config/cloudinary');

const ALLOWED_EXT = /jpeg|jpg|png|webp|pdf/;
const ALLOWED_MIME = /jpeg|jpg|png|webp|pdf/;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  const ext = ALLOWED_EXT.test(path.extname(file.originalname).toLowerCase());
  const mime = ALLOWED_MIME.test(file.mimetype.toLowerCase());
  if (ext && mime) cb(null, true);
  else cb(new Error('Only JPG, JPEG, PNG, WEBP, and PDF files are allowed'));
};

const createLocalStorage = () => {
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
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
      const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
      return {
        folder: 'siteledger/receipts',
        resource_type: isPdf ? 'raw' : 'image',
        public_id: `receipt-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        format: isPdf ? undefined : path.extname(file.originalname).replace('.', '') || 'jpg',
      };
    },
  });
};

const getStorage = () => {
  if (isCloudinaryEnabled()) {
    return createCloudinaryStorage();
  }
  return createLocalStorage();
};

const upload = multer({
  storage: getStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

module.exports = upload;
