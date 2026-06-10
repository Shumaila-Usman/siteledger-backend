const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const { sendPushNotification } = require('../utils/pushNotifications');

// ── User Management ───────────────────────────────────────────────────────

// GET /api/admin/users — all non-admin users
const getUsers = async (req, res) => {
  const filter = { role: { $ne: 'admin' } };
  if (req.query.status) filter.status = req.query.status;
  const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
  res.json({ success: true, message: 'Users fetched', data: users });
};

// GET /api/admin/requests — pending signup requests
const getPendingRequests = async (req, res) => {
  const users = await User.find({ status: 'pending', role: { $ne: 'admin' } })
    .select('-passwordHash')
    .sort({ createdAt: -1 });
  res.json({ success: true, message: 'Pending requests fetched', data: users });
};

// POST /api/admin/requests/:id/approve
const approveRequest = async (req, res) => {
  const { role } = req.body;
  const validRoles = ['manager', 'expense_only', 'viewer'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot modify admin' });

  user.status = 'active';
  if (role) user.role = role;
  await user.save();

  // Notify user
  if (user.pushToken) {
    await sendPushNotification(
      user.pushToken,
      '✅ Account Approved!',
      `Welcome to SiteLedger, ${user.name}! Your account has been approved. You can now log in.`
    );
  }

  res.json({ success: true, message: 'User approved', data: formatUser(user) });
};

// POST /api/admin/requests/:id/reject
const rejectRequest = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot modify admin' });

  user.status = 'rejected';
  await user.save();

  // Notify user
  if (user.pushToken) {
    await sendPushNotification(
      user.pushToken,
      '❌ Account Request Declined',
      'Your account request was not approved. Please contact admin for more information.'
    );
  }

  res.json({ success: true, message: 'User rejected', data: formatUser(user) });
};

// POST /api/admin/users  — admin creates a user
const createUser = async (req, res) => {
  const { name, email, phone, country, phoneCode, currency, password, companyName, role } = req.body;

  if (!name || !email || !phone || !country || !phoneCode || !currency || !password) {
    return res.status(400).json({ success: false, message: 'All required fields must be provided' });
  }

  const validRoles = ['manager', 'expense_only', 'viewer'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });
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
    role: role || 'viewer',
  });

  res.status(201).json({
    success: true,
    message: 'User created',
    data: formatUser(user),
  });
};

// PUT /api/admin/users/:id/role  — change a user's role
const updateUserRole = async (req, res) => {
  const { role } = req.body;
  const validRoles = ['manager', 'expense_only', 'viewer'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot change admin role' });

  user.role = role;
  await user.save();

  res.json({ success: true, message: 'Role updated', data: formatUser(user) });
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete admin' });

  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted', data: null });
};

// ── Global Categories ─────────────────────────────────────────────────────

// GET /api/admin/categories
const getCategories = async (req, res) => {
  const data = await Category.find({ userId: null }).sort({ name: 1 });
  res.json({ success: true, message: 'Categories fetched', data });
};

// POST /api/admin/categories
const createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const exists = await Category.findOne({ userId: null, name: name.trim() });
  if (exists) return res.status(400).json({ success: false, message: 'Category already exists' });

  const cat = await Category.create({ userId: null, name: name.trim() });
  res.status(201).json({ success: true, message: 'Category created', data: cat });
};

// PUT /api/admin/categories/:id
const updateCategory = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const cat = await Category.findOne({ _id: req.params.id, userId: null });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

  const oldName = cat.name;
  cat.name = name.trim();
  await cat.save();

  // Cascade rename subcategories
  await SubCategory.updateMany({ userId: null, category: oldName }, { category: name.trim() });

  res.json({ success: true, message: 'Category updated', data: cat });
};

// DELETE /api/admin/categories/:id
const deleteCategory = async (req, res) => {
  const cat = await Category.findOneAndDelete({ _id: req.params.id, userId: null });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

  await SubCategory.deleteMany({ userId: null, category: cat.name });

  res.json({ success: true, message: 'Category deleted', data: null });
};

// ── Global SubCategories ──────────────────────────────────────────────────

// GET /api/admin/subcategories?category=X
const getSubCategories = async (req, res) => {
  const filter = { userId: null };
  if (req.query.category) filter.category = req.query.category;
  const data = await SubCategory.find(filter).sort({ category: 1, name: 1 });
  res.json({ success: true, message: 'SubCategories fetched', data });
};

// POST /api/admin/subcategories
const createSubCategory = async (req, res) => {
  const { category, name } = req.body;
  if (!category) return res.status(400).json({ success: false, message: 'Category is required' });
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const exists = await SubCategory.findOne({ userId: null, category, name: name.trim() });
  if (exists) return res.status(400).json({ success: false, message: 'SubCategory already exists' });

  const sub = await SubCategory.create({ userId: null, category, name: name.trim() });
  res.status(201).json({ success: true, message: 'SubCategory created', data: sub });
};

// PUT /api/admin/subcategories/:id
const updateSubCategory = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const sub = await SubCategory.findOneAndUpdate(
    { _id: req.params.id, userId: null },
    { name: name.trim() },
    { new: true }
  );
  if (!sub) return res.status(404).json({ success: false, message: 'SubCategory not found' });
  res.json({ success: true, message: 'SubCategory updated', data: sub });
};

// DELETE /api/admin/subcategories/:id
const deleteSubCategory = async (req, res) => {
  const sub = await SubCategory.findOneAndDelete({ _id: req.params.id, userId: null });
  if (!sub) return res.status(404).json({ success: false, message: 'SubCategory not found' });
  res.json({ success: true, message: 'SubCategory deleted', data: null });
};

// ── Helper ────────────────────────────────────────────────────────────────
const formatUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  country: u.country,
  phoneCode: u.phoneCode,
  currency: u.currency,
  companyName: u.companyName,
  role: u.role,
  createdAt: u.createdAt,
});

module.exports = {
  getUsers, createUser, updateUserRole, deleteUser,
  getPendingRequests, approveRequest, rejectRequest,
  getCategories, createCategory, updateCategory, deleteCategory,
  getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory,
};
