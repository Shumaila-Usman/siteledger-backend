const isCloudinaryEnabled = () => process.env.USE_CLOUDINARY === 'true';

const getCloudinary = () => {
  return require('cloudinary').v2;
};

let _configured = false;

const configureCloudinary = () => {
  if (!isCloudinaryEnabled()) return false;

  // Already configured — skip to avoid overwriting with potentially stale values
  if (_configured) return true;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'USE_CLOUDINARY=true but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing'
    );
  }

  const cloudinary = getCloudinary();
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  _configured = true;
  return true;
};

module.exports = { getCloudinary, isCloudinaryEnabled, configureCloudinary };
