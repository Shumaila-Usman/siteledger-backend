const express = require('express');
const { signup, login, getMe, updateMe, requestPasswordResetOtp, verifyPasswordResetOtp, resetPasswordWithOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

// OTP-based password reset
router.post('/forgot-password/request-otp', requestPasswordResetOtp);
router.post('/forgot-password/verify-otp', verifyPasswordResetOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);

module.exports = router;
