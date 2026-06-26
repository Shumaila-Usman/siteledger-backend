const CategoryEntity = require('../models/CategoryEntity');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotifications');

const getPendingTeamMemberRequests = async (req, res) => {
  const data = await CategoryEntity.find({ approvalStatus: 'pending_admin' })
    .sort({ createdAt: -1 });
  res.json({ success: true, message: 'Team member approval requests fetched', data });
};

const approveTeamMemberRequest = async (req, res) => {
  const entity = await CategoryEntity.findOne({
    _id: req.params.id,
    approvalStatus: 'pending_admin',
  });
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Approval request not found' });
  }

  entity.approvalStatus = 'approved';
  entity.adminApprovedBy = req.user.name;
  entity.adminApprovedAt = new Date();
  await entity.save();

  const owner = await User.findById(entity.userId);
  if (owner?.pushToken) {
    await sendPushNotification(
      owner.pushToken,
      'Team Member Approved',
      `Admin approved team member "${entity.name}".`,
      { type: 'team_member_approved', entityId: entity._id.toString() }
    );
  }

  res.json({ success: true, message: 'Team member approved', data: entity });
};

const rejectTeamMemberRequest = async (req, res) => {
  const entity = await CategoryEntity.findOne({
    _id: req.params.id,
    approvalStatus: 'pending_admin',
  });
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Approval request not found' });
  }

  entity.approvalStatus = 'rejected';
  entity.adminApprovedBy = req.user.name;
  entity.adminApprovedAt = new Date();
  await entity.save();

  const owner = await User.findById(entity.userId);
  if (owner?.pushToken) {
    await sendPushNotification(
      owner.pushToken,
      'Team Member Declined',
      `Admin declined team member "${entity.name}".`,
      { type: 'team_member_rejected', entityId: entity._id.toString() }
    );
  }

  res.json({ success: true, message: 'Team member request rejected', data: entity });
};

module.exports = {
  getPendingTeamMemberRequests,
  approveTeamMemberRequest,
  rejectTeamMemberRequest,
};
