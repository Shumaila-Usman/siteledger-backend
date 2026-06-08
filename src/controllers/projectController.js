const Project = require('../models/Project');
const { calculateProjectSummary } = require('../utils/calculations');

const attachSummary = async (project, userId) => {
  try {
    const summary = await calculateProjectSummary(project._id, userId);
    return { ...project.toObject(), summary: summary ?? undefined };
  } catch {
    return { ...project.toObject(), summary: undefined };
  }
};

const getProjects = async (req, res) => {
  const { status } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;

  const projects = await Project.find(filter).sort({ createdAt: -1 });
  const data = await Promise.all(projects.map((p) => attachSummary(p, req.user._id)));
  res.json({ success: true, message: 'Projects fetched', data });
};

const getProject = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  const data = await attachSummary(project, req.user._id);
  res.json({ success: true, message: 'Project fetched', data });
};

const getProjectSummary = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  const summary = await calculateProjectSummary(project._id, req.user._id);
  res.json({ success: true, message: 'Project summary fetched', data: summary });
};

const createProject = async (req, res) => {
  const { projectName, clientName, location, estimatedBudget, startDate, expectedDays, status } =
    req.body;

  if (!projectName || !clientName || !location || estimatedBudget == null || !startDate || !expectedDays || !status) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: projectName, clientName, location, estimatedBudget, startDate, expectedDays, status',
    });
  }

  if (!req.body.clientPhone) {
    return res.status(400).json({ success: false, message: 'Client phone is required' });
  }

  if (!req.body.projectType) {
    return res.status(400).json({ success: false, message: 'Project type is required' });
  }

  const project = await Project.create({ ...req.body, userId: req.user._id });
  const data = await attachSummary(project, req.user._id);
  res.status(201).json({ success: true, message: 'Project created', data });
};

const updateProject = async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  const data = await attachSummary(project, req.user._id);
  res.json({ success: true, message: 'Project updated', data });
};

const deleteProject = async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  res.json({ success: true, message: 'Project deleted', data: null });
};

module.exports = {
  getProjects,
  getProject,
  getProjectSummary,
  createProject,
  updateProject,
  deleteProject,
};
