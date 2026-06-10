const mongoose = require('mongoose');

const categoryEntitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: { type: String, trim: true },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CategoryEntity', categoryEntitySchema);
