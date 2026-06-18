const Payment = require('../models/Payment');
const Project = require('../models/Project');
const CategoryEntity = require('../models/CategoryEntity');
const { computePaymentFields } = require('../utils/paymentUtils');

const buildFilter = (userId, query) => {
  const filter = { userId };
  if (query.projectId) filter.projectId = query.projectId;
  if (query.categoryEntityId) filter.categoryEntityId = query.categoryEntityId;
  if (query.paymentType) filter.paymentType = query.paymentType;
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  return filter;
};

const getPayments = async (req, res) => {
  const payments = await Payment.find(buildFilter(req.user._id, req.query))
    .populate('projectId', 'projectName clientName currency')
    .populate('categoryEntityId', 'name category phone subCategory')
    .sort({ paymentDate: -1 });
  res.json({ success: true, message: 'Payments fetched', data: payments });
};

const getPayment = async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('projectId', 'projectName clientName currency estimatedBudget')
    .populate('categoryEntityId', 'name category phone subCategory');
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }
  res.json({ success: true, message: 'Payment fetched', data: payment });
};

const validatePaymentBody = async (body, userId) => {
  if (!body.projectId) {
    return 'Project is required';
  }
  const project = await Project.findOne({ _id: body.projectId, userId });
  if (!project) return 'Project not found';

  if (!body.paymentType) return 'Payment type is required';

  if (body.paymentType === 'outgoing_payment') {
    if (!body.category) return 'Category is required for outgoing payments';
    if (!body.categoryEntityId) return 'Entity is required for outgoing payments';
    const entity = await CategoryEntity.findOne({ _id: body.categoryEntityId, userId });
    if (!entity) return 'Entity not found';
  }

  if (body.totalAmount == null || isNaN(Number(body.totalAmount))) {
    return 'Valid total amount is required';
  }
  if (body.paidAmount == null || isNaN(Number(body.paidAmount))) {
    return 'Valid paid amount is required';
  }

  try {
    computePaymentFields(body.totalAmount, body.paidAmount);
  } catch (e) {
    return e.message;
  }

  return null;
};

const ALLOWED_UPDATE_FIELDS = [
  'title',
  'totalAmount',
  'paidAmount',
  'paymentMethod',
  'paymentDate',
  'paidBy',
  'paidTo',
  'approvedBy',
  'notes',
  'receiptUrl',
  'receiptFileName',
  'receiptMimeType',
  'receiptPublicId',
];

const pickUpdateFields = (body) => {
  const update = {};
  ALLOWED_UPDATE_FIELDS.forEach((key) => {
    if (body[key] !== undefined) update[key] = body[key];
  });
  return update;
};

const createPayment = async (req, res) => {
  const validationError = await validatePaymentBody(req.body, req.user._id);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const computed = computePaymentFields(req.body.totalAmount, req.body.paidAmount);
  const payment = await Payment.create({
    ...req.body,
    ...computed,
    userId: req.user._id,
    createdByName: req.user.name,
    createdByEmail: req.user.email,
  });

  const populated = await Payment.findById(payment._id)
    .populate('projectId', 'projectName clientName')
    .populate('categoryEntityId', 'name category');

  res.status(201).json({ success: true, message: 'Payment created', data: populated });
};

const updatePayment = async (req, res) => {
  const existing = await Payment.findOne({ _id: req.params.id, userId: req.user._id });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  const updates = pickUpdateFields(req.body);
  const totalAmount = updates.totalAmount ?? existing.totalAmount;
  const paidAmount = updates.paidAmount ?? existing.paidAmount;

  try {
    const computed = computePaymentFields(totalAmount, paidAmount);
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...updates, ...computed },
      { new: true, runValidators: true }
    )
      .populate('projectId', 'projectName clientName')
      .populate('categoryEntityId', 'name category');

    res.json({ success: true, message: 'Payment updated', data: payment });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

const deletePayment = async (req, res) => {
  const payment = await Payment.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }
  res.json({ success: true, message: 'Payment deleted', data: null });
};

module.exports = { getPayments, getPayment, createPayment, updatePayment, deletePayment };
