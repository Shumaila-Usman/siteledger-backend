const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema(
  {
    // null = global (admin-managed), ObjectId = per-user (legacy)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    category: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

subCategorySchema.index({ userId: 1, category: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);
