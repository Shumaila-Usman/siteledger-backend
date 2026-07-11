const Payment = require('../models/Payment');
const { computeLedgerFields } = require('./paymentUtils');

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
  const computed = computeLedgerFields(mergedTotal, mergedPaid);

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
  expenseAmount = 0,
  expenseReturn = 0,
  metadata = {},
}) => {
  const addAmt = Number(expenseAmount) || 0;
  const returnAmt = Number(expenseReturn) || 0;
  if (addAmt <= 0 && returnAmt <= 0) {
    const err = new Error('Expense or return amount is required');
    err.statusCode = 400;
    throw err;
  }

  const ledger = await getVendorLedger(userId, projectId, categoryEntityId);
  const existingTotal = ledger?.totalAmount || 0;
  const existingPaid = ledger?.paidAmount || 0;

  if (returnAmt > 0 && !ledger) {
    const err = new Error('No bill found for this team member on this project');
    err.statusCode = 400;
    throw err;
  }

  if (returnAmt > existingTotal + addAmt) {
    const err = new Error('Return amount exceeds total bill on this project');
    err.statusCode = 400;
    throw err;
  }

  const newTotal = Math.max(0, existingTotal + addAmt - returnAmt);

  if (ledger) {
    const computed = computeLedgerFields(newTotal, existingPaid);
    Object.assign(ledger, metadata, computed);
    if (category && !ledger.category) ledger.category = category;
    if (metadata.projectName && !ledger.projectName) ledger.projectName = metadata.projectName;
    await ledger.save();
    return ledger;
  }

  const computed = computeLedgerFields(addAmt, 0);
  return Payment.create({
    userId,
    projectId,
    categoryEntityId,
    category,
    paymentType: 'outgoing_payment',
    projectName: metadata.projectName,
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

  const owedBefore = Math.max(0, ledger.totalAmount - (ledger.paidAmount || 0));
  const advanceOnPayment = Math.max(0, amount - owedBefore);
  const newPaid = (ledger.paidAmount || 0) + amount;
  const computed = computeLedgerFields(ledger.totalAmount, newPaid);
  Object.assign(ledger, metadata, computed, { lastPaymentAdvance: advanceOnPayment });
  if (category && !ledger.category) ledger.category = category;
  if (metadata.projectName && !ledger.projectName) ledger.projectName = metadata.projectName;
  await ledger.save();
  return ledger;
};

module.exports = {
  getVendorLedger,
  consolidateVendorLedgers,
  addVendorExpense,
  recordVendorPayment,
};
