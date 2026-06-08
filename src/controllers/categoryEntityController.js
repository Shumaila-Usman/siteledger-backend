const CategoryEntity = require('../models/CategoryEntity');
const { aggregateEntityTotals, buildEntitySummary } = require('../utils/entityUtils');

const getEntities = async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.category) filter.category = req.query.category;

  const entities = await CategoryEntity.find(filter).sort({ name: 1 });
  const totalsMap = await aggregateEntityTotals(
    req.user._id,
    entities.map((e) => e._id)
  );

  const data = entities.map((e) => ({
    ...e.toObject(),
    totals: totalsMap[e._id.toString()] || { totalPaid: 0, totalRemaining: 0, totalBill: 0 },
  }));

  res.json({ success: true, message: 'Entities fetched', data });
};

const getEntity = async (req, res) => {
  const entity = await CategoryEntity.findOne({ _id: req.params.id, userId: req.user._id });
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Entity not found' });
  }
  res.json({ success: true, message: 'Entity fetched', data: entity });
};

const getEntitySummary = async (req, res) => {
  const entity = await CategoryEntity.findOne({ _id: req.params.id, userId: req.user._id });
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Entity not found' });
  }
  const data = await buildEntitySummary(entity, req.user._id);
  res.json({ success: true, message: 'Entity summary fetched', data });
};

const createEntity = async (req, res) => {
  const { name, category } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  if (!category) {
    return res.status(400).json({ success: false, message: 'Category is required' });
  }

  const entity = await CategoryEntity.create({ ...req.body, userId: req.user._id });
  res.status(201).json({ success: true, message: 'Entity created', data: entity });
};

const updateEntity = async (req, res) => {
  const { name, category } = req.body;
  if (name !== undefined && !name?.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  if (category !== undefined && !category) {
    return res.status(400).json({ success: false, message: 'Category is required' });
  }

  const allowed = ['name', 'phone', 'category', 'subCategory', 'notes'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const entity = await CategoryEntity.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Entity not found' });
  }
  res.json({ success: true, message: 'Entity updated', data: entity });
};

const deleteEntity = async (req, res) => {
  const entity = await CategoryEntity.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!entity) {
    return res.status(404).json({ success: false, message: 'Entity not found' });
  }
  res.json({ success: true, message: 'Entity deleted', data: null });
};

module.exports = {
  getEntities,
  getEntity,
  getEntitySummary,
  createEntity,
  updateEntity,
  deleteEntity,
};
