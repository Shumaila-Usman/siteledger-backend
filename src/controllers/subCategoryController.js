const SubCategory = require('../models/SubCategory');

// GET /api/subcategories?category=Contractor — returns global subcategories
const getSubCategories = async (req, res) => {
  const filter = { userId: null };
  if (req.query.category) filter.category = req.query.category;

  const data = await SubCategory.find(filter).sort({ category: 1, name: 1 });
  res.json({ success: true, message: 'SubCategories fetched', data });
};

// POST /api/subcategories
const createSubCategory = async (req, res) => {
  const { category, name } = req.body;
  if (!category) return res.status(400).json({ success: false, message: 'Category is required' });
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  // Check duplicate
  const exists = await SubCategory.findOne({ userId: req.user._id, category, name: name.trim() });
  if (exists) return res.status(400).json({ success: false, message: 'This subcategory already exists' });

  const sub = await SubCategory.create({ userId: req.user._id, category, name: name.trim() });
  res.status(201).json({ success: true, message: 'SubCategory created', data: sub });
};

// PUT /api/subcategories/:id
const updateSubCategory = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const sub = await SubCategory.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { name: name.trim() },
    { new: true, runValidators: true }
  );
  if (!sub) return res.status(404).json({ success: false, message: 'SubCategory not found' });
  res.json({ success: true, message: 'SubCategory updated', data: sub });
};

// DELETE /api/subcategories/:id
const deleteSubCategory = async (req, res) => {
  const sub = await SubCategory.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!sub) return res.status(404).json({ success: false, message: 'SubCategory not found' });
  res.json({ success: true, message: 'SubCategory deleted', data: null });
};

module.exports = { getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory };
