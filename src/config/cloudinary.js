const isCloudinaryEnabled = () => process.env.USE_CLOUDINARY === 'true';

const getCloudinary = () => {
  // Lazy load — local dev (USE_CLOUDINARY=false) never needs this package at startup
  // eslint-disable-next-line global-require
  return require('cloudinary').v2;
};

const configureCloudinary = () => {
  if (!isCloudinaryEnabled()) return false;

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

  return true;
};

module.exports = { getCloudinary, isCloudinaryEnabled, configureCloudinary };
