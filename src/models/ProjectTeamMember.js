const mongoose = require('mongoose');

const projectTeamMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['Admin', 'Owner', 'Manager', 'Site Engineer', 'Accountant', 'Viewer'],
      required: true,
    },
    canApprove: { type: Boolean, default: false },
    canAddPayment: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProjectTeamMember', projectTeamMemberSchema);
