const mongoose = require('mongoose');

const projectTeamMemberSchema = new mongoose.Schema(
  {
    // The project owner's userId
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

    // The invited user's account (set when invite is accepted)
    invitedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    invitedEmail: { type: String, trim: true, lowercase: true },

    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },

    role: {
      type: String,
      enum: ['Admin', 'Owner', 'Manager', 'Site Engineer', 'Accountant', 'Viewer'],
      required: true,
    },

    // Permissions
    canApprove: { type: Boolean, default: false },
    canAddPayment: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true },

    // Invite status
    inviteStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'direct'], // direct = added without email invite
      default: 'direct',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProjectTeamMember', projectTeamMemberSchema);
