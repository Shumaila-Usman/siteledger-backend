const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    // null = global (admin-managed), ObjectId = per-user (legacy)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
