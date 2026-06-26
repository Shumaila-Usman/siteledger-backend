const CategoryEntity = require('../models/CategoryEntity');
const User = require('../models/User');
const { aggregateEntityTotals, buildEntitySummary } = require('../utils/entityUtils');
const { isAdminApprovalRequested, resolveApprovalStatus } = require('../utils/teamMemberApproval');
const { sendPushNotification } = require('../utils/pushNotifications');

const notifyAdminsOfTeamMemberRequest = async (entity, requestedBy) => {
  const admins = await User.find({ role: 'admin', pushToken: { $ne: null } });
  await Promise.all(
    admins.map((admin) =>
      sendPushNotification(
        admin.pushToken,
        'Team Member Approval',
        `${requestedBy.name} added "${entity.name}" and requested admin approval.`,
        { type: 'team_member_approval', entityId: entity._id.toString() }
      )
    )
  );
};

const buildEntityPayload = (body, existing) => {
  const payload = {};

  if (body.name !== undefined) payload.name = body.name.trim();
  if (body.phone !== undefined) payload.phone = body.phone.trim() || undefined;
  if (body.category !== undefined) payload.category = body.category;
  if (body.subCategory !== undefined) payload.subCategory = body.subCategory.trim() || undefined;
  if (body.notes !== undefined) payload.notes = body.notes.trim() || undefined;
  if (body.photoUrl !== undefined) payload.photoUrl = body.photoUrl || undefined;
  if (body.photoFileName !== undefined) payload.photoFileName = body.photoFileName || undefined;
  if (body.photoMimeType !== undefined) payload.photoMimeType = body.photoMimeType || undefined;

  if (body.approvedBy !== undefined) {
    const approvedBy = body.approvedBy?.trim() || '';
    payload.approvedBy = approvedBy || undefined;
    payload.approvalStatus = resolveApprovalStatus(approvedBy);
  } else if (!existing) {
    payload.approvalStatus = resolveApprovalStatus(body.approvedBy);
    payload.approvedBy = body.approvedBy?.trim() || undefined;
  }

  return payload;
};
const getEntities = async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.subCategory) filter.subCategory = req.query.subCategory;
  // projectId scopes payment totals only — vendors are reusable across projects
  const projectId = req.query.projectId || null;

  const entities = await CategoryEntity.find(filter).sort({ name: 1 });
  const entityIds = entities.map((e) => e._id);
  const allTotalsMap = await aggregateEntityTotals(req.user._id, entityIds);
  const projectTotalsMap = projectId
    ? await aggregateEntityTotals(req.user._id, entityIds, projectId)
    : allTotalsMap;

  const zeroTotals = { totalPaid: 0, totalRemaining: 0, totalBill: 0 };

  const data = entities.map((e) => {
    const id = e._id.toString();
    return {
      ...e.toObject(),
      totals: projectTotalsMap[id] || zeroTotals,
      allTotals: allTotalsMap[id] || zeroTotals,
    };
  });

  res.json({ success: true, message: 'Team members fetched', data });
};

const getEntity = async (req, res) => {
  const entity = await CategoryEntity.findOne({ _id: req.params.id, userId: req.user._id });
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }
  res.json({ success: true, message: 'Team member fetched', data: entity });
};

const getEntitySummary = async (req, res) => {
  const entity = await CategoryEntity.findOne({ _id: req.params.id, userId: req.user._id });
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }
  const data = await buildEntitySummary(entity, req.user._id);
  res.json({ success: true, message: 'Team member summary fetched', data });
};

const createEntity = async (req, res) => {
  const { name, category } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  if (!category) {
    return res.status(400).json({ success: false, message: 'Category is required' });
  }

  const payload = buildEntityPayload(req.body);
  const entity = await CategoryEntity.create({
    ...payload,
    name: payload.name || name.trim(),
    category: payload.category || category,
    userId: req.user._id,
    projectId: req.body.projectId || null,
    addedByName: req.user.name,
    addedByEmail: req.user.email,
  });

  if (entity.approvalStatus === 'pending_admin') {
    await notifyAdminsOfTeamMemberRequest(entity, req.user);
  }

  res.status(201).json({ success: true, message: 'Team member created', data: entity });
};

const updateEntity = async (req, res) => {
  const { name, category } = req.body;
  if (name !== undefined && !name?.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  if (category !== undefined && !category) {
    return res.status(400).json({ success: false, message: 'Category is required' });
  }

  const existing = await CategoryEntity.findOne({ _id: req.params.id, userId: req.user._id });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }

  const payload = buildEntityPayload(req.body, existing);
  const updates = { ...payload };

  const entity = await CategoryEntity.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  if (
    entity.approvalStatus === 'pending_admin' &&
    existing.approvalStatus !== 'pending_admin'
  ) {
    await notifyAdminsOfTeamMemberRequest(entity, req.user);
  }

  res.json({ success: true, message: 'Team member updated', data: entity });
};

const deleteEntity = async (req, res) => {
  const entity = await CategoryEntity.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }
  res.json({ success: true, message: 'Team member deleted', data: null });
};

module.exports = {
  getEntities,
  getEntity,
  getEntitySummary,
  createEntity,
  updateEntity,
  deleteEntity,
};
