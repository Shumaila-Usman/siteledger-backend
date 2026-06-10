const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'siteledger_jwt_secret');
    req.user = await User.findById(decoded.id).select('-passwordHash');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

/** Only admin can access */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

/** Admin or manager */
const managerOrAbove = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Manager access required' });
  }
  next();
};

/** Can write expenses/payments — admin, manager, expense_only */
const canAddExpense = (req, res, next) => {
  if (!['admin', 'manager', 'expense_only'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to add expenses' });
  }
  next();
};

module.exports = { protect, adminOnly, managerOrAbove, canAddExpense };

// Default export for backward compat
module.exports.default = protect;
