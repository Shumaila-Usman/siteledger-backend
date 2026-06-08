const express = require('express');
const { uploadFile } = require('../controllers/uploadController');
const protect = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

const router = express.Router();

// uploadSingle returns [requireCloudinaryOnServerless, upload.single(field)]
router.post('/', protect, ...uploadSingle('file'), uploadFile);

module.exports = router;
