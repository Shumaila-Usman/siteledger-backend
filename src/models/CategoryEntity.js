const mongoose = require('mongoose');

const categoryEntitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: { type: String, trim: true },
    notes: { type: String },
    photoUrl: { type: String },
    photoFileName: { type: String },
    photoMimeType: { type: String },
    addedByName: { type: String, trim: true },
    addedByEmail: { type: String, trim: true, lowercase: true },
    approvedBy: { type: String, trim: true },
    approvalStatus: {
      type: String,
      enum: ['none', 'pending_admin', 'approved', 'rejected'],
      default: 'none',
    },
    adminApprovedBy: { type: String, trim: true },
    adminApprovedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CategoryEntity', categoryEntitySchema);
