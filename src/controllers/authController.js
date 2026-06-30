const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const seedDefaultCategories = require('../utils/seedDefaultCategories');
const { sendPushNotification } = require('../utils/pushNotifications');
const { sendOtpEmail } = require('../utils/emailService');

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  country: user.country,
  phoneCode: user.phoneCode,
  currency: user.currency,
  companyName: user.companyName,
  role: user.role,
  status: user.status,
  accountType: user.accountType,
  biometricEnabled: user.biometricEnabled,
  profilePicture: user.profilePicture,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signup = async (req, res) => {
  const { name, email, phone, country, phoneCode, currency, password, companyName, accountType } = req.body;

  if (!name || !email || !phone || !country || !phoneCode || !currency || !password) {
    return res.status(400).json({ success: false, message: 'All required fields must be provided' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    country,
    phoneCode,
    currency,
    passwordHash,
    companyName,
    accountType: accountType || 'user',
    status: 'active',  // Direct signup — no approval needed
    role: 'viewer',
  });

  // Seed default categories
  await seedDefaultCategories(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { user: formatUser(user), token: generateToken(user._id) },
  });
};

const login = async (req, res) => {
  const { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({ success: false, message: 'Email/phone and password required' });
  }

  const user = await User.findOne({
    $or: [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }],
  });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Admin always allowed
  if (user.role === 'admin') {
    return res.json({
      success: true,
      message: 'Login successful',
      data: { user: formatUser(user), token: generateToken(user._id) },
    });
  }

  // Seed default categories if user has none
  await seedDefaultCategories(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: formatUser(user), token: generateToken(user._id) },
  });
};

const getMe = async (req, res) => {
  res.json({ success: true, message: 'Profile fetched', data: formatUser(req.user) });
};

const updateMe = async (req, res) => {
  const allowed = ['name', 'phone', 'country', 'phoneCode', 'currency', 'companyName', 'biometricEnabled', 'pushToken', 'profilePicture'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json({ success: true, message: 'Profile updated', data: formatUser(user) });
};

// ── Request OTP ──────────────────────────────────────────────────────────────
const requestPasswordResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
  }

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.passwordResetOtp = otp;
  user.passwordResetOtpExpiry = expiry;
  await user.save();

  try {
    await sendOtpEmail(user.email, otp);
  } catch (err) {
    console.error('Email send failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send OTP email. Check Gmail SMTP config.' });
  }

  res.json({ success: true, message: 'OTP sent to your email.' });
};

// ── Verify OTP ────────────────────────────────────────────────────────────────
const verifyPasswordResetOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpiry) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  if (user.passwordResetOtpExpiry < new Date()) {
    user.passwordResetOtp = null;
    user.passwordResetOtpExpiry = null;
    await user.save();
    return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
  }

  if (user.passwordResetOtp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
  }

  res.json({ success: true, message: 'OTP verified.' });
};

// ── Reset Password ────────────────────────────────────────────────────────────
const resetPasswordWithOtp = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpiry) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }
  if (user.passwordResetOtpExpiry < new Date()) {
    user.passwordResetOtp = null;
    user.passwordResetOtpExpiry = null;
    await user.save();
    return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
  }
  if (user.passwordResetOtp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'Incorrect OTP.' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordResetOtp = null;
  user.passwordResetOtpExpiry = null;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
};

module.exports = { signup, login, getMe, updateMe, requestPasswordResetOtp, verifyPasswordResetOtp, resetPasswordWithOtp };
