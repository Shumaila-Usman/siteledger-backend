const Payment = require('../models/Payment');
const Project = require('../models/Project');
const CategoryEntity = require('../models/CategoryEntity');
const { computePaymentFields } = require('../utils/paymentUtils');
const { addVendorExpense, recordVendorPayment, getVendorLedger } = require('../utils/vendorLedger');
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
  const data = await attachProjectDetailsMany(payments, req.user._id);
  res.json({ success: true, message: 'Payments fetched', data });
};

const getPayment = async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('projectId', 'projectName clientName currency estimatedBudget')
    .populate('categoryEntityId', 'name category phone subCategory');
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }
  const data = await attachProjectDetails(payment, req.user._id);
  res.json({ success: true, message: 'Payment fetched', data });
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
    if (!body.categoryEntityId) return 'Team member is required for outgoing payments';
    const entity = await CategoryEntity.findOne({ _id: body.categoryEntityId, userId });
    if (!entity) return 'Team member not found';
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

const validateLedgerBody = async (body, userId) => {
  if (!body.projectId) return 'Project is required';
  const project = await Project.findOne({ _id: body.projectId, userId });
  if (!project) return 'Project not found';
  if (!body.category) return 'Category is required';
  if (!body.categoryEntityId) return 'Team member is required';
  const entity = await CategoryEntity.findOne({ _id: body.categoryEntityId, userId });
  if (!entity) return 'Team member not found';

  const mode = body.ledgerMode;
  if (mode === 'add_expense') {
    const expenseAmount = Number(body.expenseAmount) || 0;
    const expenseReturn = Number(body.expenseReturn) || 0;
    if (expenseAmount <= 0 && expenseReturn <= 0) {
      return 'Expense or return amount is required';
    }
  } else if (mode === 'record_payment') {
    if (body.payAmount == null || Number(body.payAmount) <= 0) {
      return 'Payment amount must be greater than zero';
    }
  } else if (mode === 'expense_and_pay') {
    const expenseAmount = Number(body.expenseAmount) || 0;
    const expenseReturn = Number(body.expenseReturn) || 0;
    const payAmount = Number(body.payAmount) || 0;
    if (expenseAmount <= 0 && expenseReturn <= 0 && payAmount <= 0) {
      return 'Expense, return, or payment amount is required';
    }
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

const getProjectIdValue = (projectRef) => {
  if (!projectRef) return null;
  if (typeof projectRef === 'object' && projectRef._id) return projectRef._id;
  return projectRef;
};

const attachProjectDetails = async (paymentDoc, userId) => {
  const data = paymentDoc.toObject ? paymentDoc.toObject() : { ...paymentDoc };
  if (data.projectName?.trim()) return data;

  const populatedName =
    typeof data.projectId === 'object' && data.projectId?.projectName
      ? data.projectId.projectName
      : '';
  if (populatedName) {
    data.projectName = populatedName;
    return data;
  }

  const pid = getProjectIdValue(data.projectId);
  if (!pid) return data;

  const project = await Project.findOne({ _id: pid, userId }).select(
    'projectName clientName currency estimatedBudget'
  );
  if (!project) return data;

  data.projectName = project.projectName;
  if (data._id && !paymentDoc.projectName?.trim()) {
    Payment.updateOne({ _id: data._id }, { projectName: project.projectName }).catch(() => {});
  }
  data.projectId = {
    _id: project._id,
    projectName: project.projectName,
    clientName: project.clientName,
    currency: project.currency,
    estimatedBudget: project.estimatedBudget,
  };
  return data;
};

const attachProjectDetailsMany = async (paymentDocs, userId) => {
  const ids = [
    ...new Set(
      paymentDocs
        .map((doc) => {
          const raw = doc.toObject ? doc.toObject() : doc;
          if (raw.projectName?.trim()) return null;
          return getProjectIdValue(raw.projectId);
        })
        .filter(Boolean)
        .map(String)
    ),
  ];

  const projects = ids.length
    ? await Project.find({ _id: { $in: ids }, userId }).select(
        'projectName clientName currency estimatedBudget'
      )
    : [];
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));

  return Promise.all(
    paymentDocs.map(async (doc) => {
      const data = doc.toObject ? doc.toObject() : { ...doc };
      if (data.projectName?.trim()) return data;

      const populatedName =
        typeof data.projectId === 'object' && data.projectId?.projectName
          ? data.projectId.projectName
          : '';
      if (populatedName) {
        data.projectName = populatedName;
        return data;
      }

      const pid = getProjectIdValue(data.projectId);
      const project = pid ? projectMap.get(String(pid)) : null;
      if (!project) return data;

      data.projectName = project.projectName;
      if (data._id && !doc.projectName?.trim()) {
        Payment.updateOne({ _id: data._id }, { projectName: project.projectName }).catch(() => {});
      }
      data.projectId = {
        _id: project._id,
        projectName: project.projectName,
        clientName: project.clientName,
        currency: project.currency,
        estimatedBudget: project.estimatedBudget,
      };
      return data;
    })
  );
};

const resolveProjectNameForBody = async (projectId, userId) => {
  const project = await Project.findOne({ _id: projectId, userId }).select('projectName');
  return project?.projectName;
};

const createPayment = async (req, res) => {
  const { ledgerMode } = req.body;

  if (ledgerMode === 'add_expense' || ledgerMode === 'record_payment' || ledgerMode === 'expense_and_pay') {
    const validationError = await validateLedgerBody(req.body, req.user._id);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    try {
      const projectName = await resolveProjectNameForBody(req.body.projectId, req.user._id);
      const metadata = {
        title: req.body.title?.trim() || undefined,
        projectName: projectName || undefined,
        paymentMethod: req.body.paymentMethod,
        paymentDate: req.body.paymentDate,
        paidBy: req.body.paidBy?.trim() || undefined,
        paidTo: req.body.paidTo?.trim() || undefined,
        approvedBy: req.body.approvedBy?.trim() || undefined,
        notes: req.body.notes?.trim() || undefined,
        receiptUrl: req.body.receiptUrl,
        receiptFileName: req.body.receiptFileName,
        receiptMimeType: req.body.receiptMimeType,
        receiptPublicId: req.body.receiptPublicId,
        createdByName: req.user.name,
        createdByEmail: req.user.email,
      };

      let payment;
      if (ledgerMode === 'add_expense') {
        payment = await addVendorExpense({
          userId: req.user._id,
          projectId: req.body.projectId,
          categoryEntityId: req.body.categoryEntityId,
          category: req.body.category,
          expenseAmount: req.body.expenseAmount,
          expenseReturn: req.body.expenseReturn,
          metadata,
        });
      } else if (ledgerMode === 'record_payment') {
        payment = await recordVendorPayment({
          userId: req.user._id,
          projectId: req.body.projectId,
          categoryEntityId: req.body.categoryEntityId,
          category: req.body.category,
          payAmount: req.body.payAmount,
          metadata,
        });
      } else {
        const expenseAmount = Number(req.body.expenseAmount) || 0;
        const expenseReturn = Number(req.body.expenseReturn) || 0;
        const payAmount = Number(req.body.payAmount) || 0;
        if (expenseAmount > 0 || expenseReturn > 0) {
          await addVendorExpense({
            userId: req.user._id,
            projectId: req.body.projectId,
            categoryEntityId: req.body.categoryEntityId,
            category: req.body.category,
            expenseAmount,
            expenseReturn,
            metadata,
          });
        }
        if (payAmount > 0) {
          payment = await recordVendorPayment({
            userId: req.user._id,
            projectId: req.body.projectId,
            categoryEntityId: req.body.categoryEntityId,
            category: req.body.category,
            payAmount,
            metadata,
          });
        } else {
          payment = await getVendorLedger(
            req.user._id,
            req.body.projectId,
            req.body.categoryEntityId
          );
        }
      }

      if (!payment) {
        return res.status(400).json({ success: false, message: 'Nothing to record' });
      }

      const populated = await Payment.findById(payment._id)
        .populate('projectId', 'projectName clientName')
        .populate('categoryEntityId', 'name category');
      const data = await attachProjectDetails(populated, req.user._id);

      const message =
        ledgerMode === 'add_expense'
          ? 'Expense recorded'
          : ledgerMode === 'record_payment'
            ? 'Payment recorded'
            : 'Expense and payment recorded';

      return res.status(201).json({ success: true, message, data });
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }
  }

  const validationError = await validatePaymentBody(req.body, req.user._id);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const computed = computePaymentFields(req.body.totalAmount, req.body.paidAmount);
  const projectName = await resolveProjectNameForBody(req.body.projectId, req.user._id);
  const payment = await Payment.create({
    ...req.body,
    ...computed,
    projectName: projectName || undefined,
    userId: req.user._id,
    createdByName: req.user.name,
    createdByEmail: req.user.email,
  });

  const amountReturn = Number(req.body.amountReturn) || 0;
  if (req.body.paymentType === 'incoming_client_payment' && amountReturn > 0) {
    const project = await Project.findOne({ _id: req.body.projectId, userId: req.user._id }).select(
      'estimatedBudget'
    );
    if (project) {
      const nextBudget = Math.max(0, (project.estimatedBudget || 0) - amountReturn);
      await Project.updateOne(
        { _id: project._id, userId: req.user._id },
        { $set: { estimatedBudget: nextBudget } }
      );
    }
  }

  const populated = await Payment.findById(payment._id)
    .populate('projectId', 'projectName clientName')
    .populate('categoryEntityId', 'name category');
  const data = await attachProjectDetails(populated, req.user._id);

  res.status(201).json({ success: true, message: 'Payment created', data });
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
