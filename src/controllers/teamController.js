const ProjectTeamMember = require('../models/ProjectTeamMember');
const Project = require('../models/Project');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotifications');
const { TEAM_ACCESS_LEVELS, isValidAccessLevel } = require('../constants/teamAccess');
// GET /api/projects/:projectId/team
const getTeam = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, userId: req.user._id });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  const members = await ProjectTeamMember.find({ projectId: req.params.projectId });
  res.json({ success: true, message: 'Team fetched', data: members });
};

// POST /api/projects/:projectId/team
// If invitedEmail is provided → lookup user → send invite notification
// Otherwise → add directly (legacy)
const addMember = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, userId: req.user._id });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const { accessLevel, invitedEmail } = req.body;

  if (!invitedEmail?.trim()) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  if (!isValidAccessLevel(accessLevel)) {
    return res.status(400).json({ success: false, message: 'Access level is required' });
  }

  const access = TEAM_ACCESS_LEVELS[accessLevel];
  const normalizedEmail = invitedEmail.trim().toLowerCase();

  const invitedUser = await User.findOne({ email: normalizedEmail });
  if (!invitedUser) {
    return res.status(404).json({
      success: false,
      message: `No account found for ${invitedEmail}. Ask them to sign up first.`,
    });
  }

  const alreadyMember = await ProjectTeamMember.findOne({
    projectId: req.params.projectId,
    invitedEmail: normalizedEmail,
  });
  if (alreadyMember) {
    return res.status(400).json({ success: false, message: 'This user is already in the team' });
  }

  if (invitedUser.pushToken) {
    await sendPushNotification(
      invitedUser.pushToken,
      '👥 Project Invite',
      `${req.user.name} has invited you to join "${project.projectName}" with ${access.label.toLowerCase()}. Open SiteLedger to accept.`,
      { type: 'project_invite', projectId: req.params.projectId }
    );
  }

  const member = await ProjectTeamMember.create({
    userId: req.user._id,
    projectId: req.params.projectId,
    invitedUserId: invitedUser._id,
    invitedEmail: normalizedEmail,
    name: invitedUser.name,
    phone: invitedUser.phone || undefined,
    role: access.role,
    accessLevel,
    canApprove: access.canApprove,
    canAddExpense: access.canAddExpense,
    canAddPayment: access.canAddPayment,
    canViewReports: access.canViewReports,
    inviteStatus: 'pending',
  });

  res.status(201).json({
    success: true,
    message: 'Invite sent successfully',
    data: member,
  });
};

// PUT /api/projects/:projectId/team/:memberId
const updateMember = async (req, res) => {
  const member = await ProjectTeamMember.findOneAndUpdate(
    { _id: req.params.memberId, projectId: req.params.projectId, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!member) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }
  res.json({ success: true, message: 'Team member updated', data: member });
};

// DELETE /api/projects/:projectId/team/:memberId
const deleteMember = async (req, res) => {
  const member = await ProjectTeamMember.findOneAndDelete({
    _id: req.params.memberId,
    projectId: req.params.projectId,
    userId: req.user._id,
  });
  if (!member) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }
  res.json({ success: true, message: 'Team member removed', data: null });
};

// GET /api/team/invites — get pending invites for logged-in user
const getMyInvites = async (req, res) => {
  const invites = await ProjectTeamMember.find({
    invitedUserId: req.user._id,
    inviteStatus: 'pending',
  }).populate('projectId', 'projectName clientName location');

  res.json({ success: true, message: 'Invites fetched', data: invites });
};

// POST /api/team/invites/:memberId/accept
const acceptInvite = async (req, res) => {
  const member = await ProjectTeamMember.findOne({
    _id: req.params.memberId,
    invitedUserId: req.user._id,
    inviteStatus: 'pending',
  });
  if (!member) {
    return res.status(404).json({ success: false, message: 'Invite not found' });
  }

  member.inviteStatus = 'accepted';
  await member.save();

  // Notify project owner
  const project = await Project.findById(member.projectId);
  if (project) {
    const owner = await User.findById(member.userId);
    if (owner?.pushToken) {
      await sendPushNotification(
        owner.pushToken,
        '✅ Invite Accepted',
        `${req.user.name} has accepted your invite to join "${project.projectName}".`
      );
    }
  }

  res.json({ success: true, message: 'Invite accepted', data: member });
};

// POST /api/team/invites/:memberId/reject
const rejectInvite = async (req, res) => {
  const member = await ProjectTeamMember.findOne({
    _id: req.params.memberId,
    invitedUserId: req.user._id,
    inviteStatus: 'pending',
  });
  if (!member) {
    return res.status(404).json({ success: false, message: 'Invite not found' });
  }

  member.inviteStatus = 'rejected';
  await member.save();

  res.json({ success: true, message: 'Invite rejected', data: member });
};

module.exports = {
  getTeam, addMember, updateMember, deleteMember,
  getMyInvites, acceptInvite, rejectInvite,
};
