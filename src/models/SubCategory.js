const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// One user can't have duplicate subcategory name within same category
subCategorySchema.index({ userId: 1, category: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);
