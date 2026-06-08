const Payment = require('../models/Payment');
const CategoryEntity = require('../models/CategoryEntity');

const aggregateEntityTotals = async (userId, entityIds) => {
  if (!entityIds.length) return {};
  const payments = await Payment.find({
    userId,
    categoryEntityId: { $in: entityIds },
    paymentType: 'outgoing_payment',
  });

  const map = {};
  for (const p of payments) {
    const id = p.categoryEntityId.toString();
    if (!map[id]) map[id] = { totalPaid: 0, totalRemaining: 0, totalBill: 0 };
    map[id].totalPaid += p.paidAmount || 0;
    map[id].totalRemaining += p.remainingAmount || 0;
    map[id].totalBill += p.totalAmount || 0;
  }
  return map;
};

const buildEntitySummary = async (entity, userId) => {
  const payments = await Payment.find({
    userId,
    categoryEntityId: entity._id,
    paymentType: 'outgoing_payment',
  })
    .populate('projectId', 'projectName clientName')
    .sort({ paymentDate: -1 });

  const projectMap = {};
  for (const p of payments) {
    const proj = p.projectId;
    if (!proj) continue;
    const pid = proj._id.toString();
    if (!projectMap[pid]) {
      projectMap[pid] = {
        projectId: pid,
        projectName: proj.projectName,
        totalBill: 0,
        paidAmount: 0,
        remainingAmount: 0,
        payments: [],
      };
    }
    projectMap[pid].totalBill += p.totalAmount || 0;
    projectMap[pid].paidAmount += p.paidAmount || 0;
    projectMap[pid].remainingAmount += p.remainingAmount || 0;
    projectMap[pid].payments.push(p);
  }

  const projects = Object.values(projectMap);
  const totalBillAcrossProjects = projects.reduce((s, x) => s + x.totalBill, 0);
  const totalPaidAcrossProjects = projects.reduce((s, x) => s + x.paidAmount, 0);
  const totalRemainingAcrossProjects = projects.reduce((s, x) => s + x.remainingAmount, 0);

  return {
    entity,
    totalBillAcrossProjects,
    totalPaidAcrossProjects,
    totalRemainingAcrossProjects,
    projects,
    paymentHistory: payments,
  };
};

module.exports = { aggregateEntityTotals, buildEntitySummary };
