const ProjectTeamMember = require('../models/ProjectTeamMember');
const Project = require('../models/Project');

const getTeam = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, userId: req.user._id });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  const members = await ProjectTeamMember.find({ projectId: req.params.projectId, userId: req.user._id });
  res.json({ success: true, message: 'Team fetched', data: members });
};

const addMember = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, userId: req.user._id });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  const member = await ProjectTeamMember.create({
    ...req.body,
    userId: req.user._id,
    projectId: req.params.projectId,
  });
  res.status(201).json({ success: true, message: 'Team member added', data: member });
};

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

module.exports = { getTeam, addMember, updateMember, deleteMember };
