const Project = require('../models/Project');
const Payment = require('../models/Payment');

const calculateProjectSummary = async (projectId, userId) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  const payments = await Payment.find({ userId, projectId: project._id });
  const incoming = payments.filter((p) => p.paymentType === 'incoming_client_payment');
  const outgoing = payments.filter((p) => p.paymentType === 'outgoing_payment');

  const clientPaymentsReceived = incoming.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalExpenses = outgoing.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const outgoingPaid = outgoing.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const pendingFromClient = Math.max(0, (project.estimatedBudget || 0) - clientPaymentsReceived);
  const pendingToOutgoing = outgoing.reduce((sum, p) => sum + (p.remainingAmount || 0), 0);
  const totalBudget = project.estimatedBudget || 0;
  const progressPercentage =
    totalBudget > 0 ? Math.min(100, Math.round((clientPaymentsReceived / totalBudget) * 100)) : 0;

  return {
    totalBudget,
    clientPaymentsReceived,
    totalExpenses,
    outgoingPaid,
    pendingFromClient,
    pendingToOutgoing,
    progressPercentage,
  };
};

const calculateDashboardSummary = async (userId) => {
  const projects = await Project.find({ userId });
  const payments = await Payment.find({ userId });

  const totalProjectValue = projects.reduce((sum, p) => sum + (p.estimatedBudget || 0), 0);
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;

  const incoming = payments.filter((p) => p.paymentType === 'incoming_client_payment');
  const outgoing = payments.filter((p) => p.paymentType === 'outgoing_payment');

  const clientPaymentsReceived = incoming.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const outgoingPaid = outgoing.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalExpense = outgoing.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const paidPayments = outgoingPaid;
  const pendingToOutgoing = outgoing.reduce((sum, p) => sum + (p.remainingAmount || 0), 0);

  let pendingFromClients = 0;
  for (const project of projects) {
    const projectIncoming = incoming
      .filter((p) => p.projectId.toString() === project._id.toString())
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    pendingFromClients += Math.max(0, (project.estimatedBudget || 0) - projectIncoming);
  }

  const pendingPayments = pendingFromClients + pendingToOutgoing;

  return {
    totalProjectValue,
    activeProjectsCount,
    clientPaymentsReceived,
    totalExpense,
    paidPayments,
    pendingPayments,
    pendingFromClients,
    pendingToOutgoing,
  };
};

module.exports = { calculateDashboardSummary, calculateProjectSummary };
