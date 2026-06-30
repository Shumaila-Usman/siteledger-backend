const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true },
    phoneCode: { type: String, required: true },
    currency: { type: String, required: true },
    passwordHash: { type: String, required: true },
    companyName: { type: String, trim: true },
    role: { 
      type: String, 
      enum: ['admin', 'manager', 'expense_only', 'viewer'],
      default: 'viewer' 
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected'],
      default: 'pending',
    },
    accountType: {
      type: String,
      enum: ['client', 'user'],
      default: 'user',
    },
    pushToken: { type: String, default: null },
    profilePicture: { type: String, default: null },
    biometricEnabled: { type: Boolean, default: false },
    passwordResetOtp: { type: String, default: null },
    passwordResetOtpExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
