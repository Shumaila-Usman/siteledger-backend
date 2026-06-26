const express = require('express');
const { uploadFile } = require('../controllers/uploadController');
const { uploadBase64 } = require('../controllers/uploadBase64Controller');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/base64', protect, uploadBase64);
router.post('/', protect, ...uploadSingle('file'), uploadFile);

module.exports = router;
