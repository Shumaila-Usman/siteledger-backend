const { isCloudinaryEnabled } = require('../config/cloudinary');

const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const useCloudinary = isCloudinaryEnabled();

  if (useCloudinary) {
    // multer-storage-cloudinary sets path = secure_url, filename = public_id
    return res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: req.file.path,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        publicId: req.file.filename,
      },
    });
  }

  // Local development — files served from /uploads
  return res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      url: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    },
  });
};

module.exports = { uploadFile };
