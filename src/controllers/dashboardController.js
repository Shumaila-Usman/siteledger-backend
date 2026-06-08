const Project = require('../models/Project');
const Payment = require('../models/Payment');
const { calculateDashboardSummary } = require('../utils/calculations');

const getSummary = async (req, res) => {
  const summary = await calculateDashboardSummary(req.user._id);
  res.json({ success: true, message: 'Dashboard summary fetched', data: summary });
};

const getActiveProjects = async (req, res) => {
  const projects = await Project.find({ userId: req.user._id, status: 'active' }).sort({ createdAt: -1 });
  res.json({ success: true, message: 'Active projects fetched', data: projects });
};

const getClientPayments = async (req, res) => {
  const payments = await Payment.find({
    userId: req.user._id,
    paymentType: 'incoming_client_payment',
  })
    .populate('projectId', 'projectName clientName')
    .sort({ paymentDate: -1 });
  res.json({ success: true, message: 'Client payments fetched', data: payments });
};

const getPaidPayments = async (req, res) => {
  const payments = await Payment.find({
    userId: req.user._id,
    paymentType: 'outgoing_payment',
    status: { $in: ['Paid', 'Partial'] },
  })
    .populate('projectId', 'projectName')
    .populate('categoryEntityId', 'name category')
    .sort({ paymentDate: -1 });
  res.json({ success: true, message: 'Paid payments fetched', data: payments });
};

const getPendingPayments = async (req, res) => {
  const summary = await calculateDashboardSummary(req.user._id);
  res.json({
    success: true,
    message: 'Pending payments summary fetched',
    data: {
      pendingFromClients: summary.pendingFromClients,
      pendingToOutgoing: summary.pendingToOutgoing,
      totalPending: summary.pendingPayments,
    },
  });
};

const getPendingClientPayments = async (req, res) => {
  const projects = await Project.find({ userId: req.user._id });
  const incoming = await Payment.find({ userId: req.user._id, paymentType: 'incoming_client_payment' });

  const data = projects.map((project) => {
    const received = incoming
      .filter((p) => p.projectId.toString() === project._id.toString())
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    return {
      projectId: project._id,
      projectName: project.projectName,
      clientName: project.clientName,
      estimatedBudget: project.estimatedBudget,
      received,
      pending: Math.max(0, (project.estimatedBudget || 0) - received),
    };
  }).filter((p) => p.pending > 0);

  res.json({ success: true, message: 'Pending client payments fetched', data });
};

const getPendingOutgoingPayments = async (req, res) => {
  const payments = await Payment.find({
    userId: req.user._id,
    paymentType: 'outgoing_payment',
    remainingAmount: { $gt: 0 },
  })
    .populate('projectId', 'projectName')
    .populate('categoryEntityId', 'name category')
    .sort({ paymentDate: -1 });

  res.json({ success: true, message: 'Pending outgoing payments fetched', data: payments });
};

module.exports = {
  getSummary,
  getActiveProjects,
  getClientPayments,
  getPaidPayments,
  getPendingPayments,
  getPendingClientPayments,
  getPendingOutgoingPayments,
};
