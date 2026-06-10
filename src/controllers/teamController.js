const ProjectTeamMember = require('../models/ProjectTeamMember');
const Project = require('../models/Project');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotifications');

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

  const { name, phone, role, canApprove, canAddPayment, canViewReports, invitedEmail } = req.body;

  if (!name?.trim() || !role) {
    return res.status(400).json({ success: false, message: 'Name and role are required' });
  }

  let invitedUserId = null;
  let inviteStatus = 'direct';

  if (invitedEmail?.trim()) {
    // Find the invited user by email
    const invitedUser = await User.findOne({ email: invitedEmail.trim().toLowerCase() });

    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        message: `No account found for ${invitedEmail}. Ask them to sign up first.`,
      });
    }

    // Check already in team
    const alreadyMember = await ProjectTeamMember.findOne({
      projectId: req.params.projectId,
      invitedEmail: invitedEmail.trim().toLowerCase(),
    });
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'This user is already in the team' });
    }

    invitedUserId = invitedUser._id;
    inviteStatus = 'pending';

    // Send push notification to invited user
    if (invitedUser.pushToken) {
      await sendPushNotification(
        invitedUser.pushToken,
        '👥 Project Invite',
        `${req.user.name} has invited you to join "${project.projectName}" as ${role}. Open SiteLedger to accept.`,
        { type: 'project_invite', projectId: req.params.projectId }
      );
    }
  }

  const member = await ProjectTeamMember.create({
    userId: req.user._id,
    projectId: req.params.projectId,
    invitedUserId,
    invitedEmail: invitedEmail?.trim().toLowerCase() || undefined,
    name: name.trim(),
    phone: phone?.trim() || undefined,
    role,
    canApprove: canApprove ?? false,
    canAddPayment: canAddPayment ?? false,
    canViewReports: canViewReports ?? true,
    inviteStatus,
  });

  res.status(201).json({
    success: true,
    message: inviteStatus === 'pending'
      ? 'Invite sent successfully'
      : 'Team member added',
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
