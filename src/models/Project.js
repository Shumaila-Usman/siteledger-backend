const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectName: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true },
    country: { type: String },
    currency: { type: String },
    location: { type: String, required: true, trim: true },
    projectType: {
      type: String,
      enum: ['House', 'Plaza', 'Commercial', 'Residential', 'Industrial', 'Other'],
      default: 'Other',
    },
    estimatedBudget: { type: Number, required: true, default: 0 },
    startDate: { type: Date },
    expectedDays: { type: Number },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },
    labourAid: { type: String },
    labourMaterial: { type: String },
    supervision: { type: String },
    percentageType: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
