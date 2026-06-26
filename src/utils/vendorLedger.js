const Payment = require('../models/Payment');
const { computePaymentFields } = require('./paymentUtils');

const ledgerFilter = (userId, projectId, categoryEntityId) => ({
  userId,
  projectId,
  categoryEntityId,
  paymentType: 'outgoing_payment',
});

/** Consolidate multiple ledger rows into one primary record (legacy data). */
const consolidateVendorLedgers = async (userId, projectId, categoryEntityId) => {
  const ledgers = await Payment.find(ledgerFilter(userId, projectId, categoryEntityId)).sort({
    createdAt: 1,
  });
  if (ledgers.length <= 1) return ledgers[0] || null;

  const primary = ledgers[0];
  const mergedTotal = ledgers.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
  const mergedPaid = ledgers.reduce((sum, row) => sum + (row.paidAmount || 0), 0);
  const computed = computePaymentFields(mergedTotal, mergedPaid);

  Object.assign(primary, computed);
  await primary.save();

  const extraIds = ledgers.slice(1).map((row) => row._id);
  if (extraIds.length) {
    await Payment.deleteMany({ _id: { $in: extraIds }, userId });
  }

  return primary;
};

const getVendorLedger = async (userId, projectId, categoryEntityId) =>
  consolidateVendorLedgers(userId, projectId, categoryEntityId);

const addVendorExpense = async ({
  userId,
  projectId,
  categoryEntityId,
  category,
  expenseAmount,
  metadata = {},
}) => {
  const amount = Number(expenseAmount) || 0;
  if (amount <= 0) {
    const err = new Error('Expense amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  let ledger = await getVendorLedger(userId, projectId, categoryEntityId);
  if (ledger) {
    const computed = computePaymentFields(ledger.totalAmount + amount, ledger.paidAmount);
    Object.assign(ledger, metadata, computed);
    await ledger.save();
    return ledger;
  }

  const computed = computePaymentFields(amount, 0);
  return Payment.create({
    userId,
    projectId,
    categoryEntityId,
    category,
    paymentType: 'outgoing_payment',
    ...metadata,
    ...computed,
  });
};

const recordVendorPayment = async ({
  userId,
  projectId,
  categoryEntityId,
  category,
  payAmount,
  metadata = {},
}) => {
  const amount = Number(payAmount) || 0;
  if (amount <= 0) {
    const err = new Error('Payment amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const ledger = await getVendorLedger(userId, projectId, categoryEntityId);
  if (!ledger) {
    const err = new Error('No outstanding bill found for this team member on this project');
    err.statusCode = 400;
    throw err;
  }

  const newPaid = (ledger.paidAmount || 0) + amount;
  const computed = computePaymentFields(ledger.totalAmount, newPaid);
  Object.assign(ledger, metadata, computed);
  if (category && !ledger.category) ledger.category = category;
  await ledger.save();
  return ledger;
};

module.exports = {
  getVendorLedger,
  consolidateVendorLedgers,
  addVendorExpense,
  recordVendorPayment,
};
