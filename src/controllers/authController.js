const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const seedDefaultCategories = require('../utils/seedDefaultCategories');
const { sendPushNotification } = require('../utils/pushNotifications');

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

  // Block pending users
  if (user.status === 'pending') {
    return res.status(403).json({
      success: false,
      message: 'pending',
      data: { user: formatUser(user) },
    });
  }

  // Block rejected users
  if (user.status === 'rejected') {
    return res.status(403).json({
      success: false,
      message: 'rejected',
      data: { user: formatUser(user) },
    });
  }

  // Seed default categories if user has none (handles existing users)
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

module.exports = { signup, login, getMe, updateMe };
