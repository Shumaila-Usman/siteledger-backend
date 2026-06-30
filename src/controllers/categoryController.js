const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const CategoryEntity = require('../models/CategoryEntity');

// GET /api/categories — global categories
const getCategories = async (req, res) => {
  const data = await Category.find({ userId: null }).sort({ name: 1 });
  res.json({ success: true, message: 'Categories fetched', data });
};

// POST /api/categories — create global category
const createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const exists = await Category.findOne({ userId: null, name: name.trim() });
  if (exists) return res.status(400).json({ success: false, message: 'Category already exists' });

  const cat = await Category.create({ userId: null, name: name.trim() });
  res.status(201).json({ success: true, message: 'Category created', data: cat });
};

// PUT /api/categories/:id — update global category
const updateCategory = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const cat = await Category.findOne({ _id: req.params.id, userId: null });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

  const oldName = cat.name;
  const newName = name.trim();
  cat.name = newName;
  await cat.save();

  // Cascade rename subcategories and entities
  await SubCategory.updateMany({ userId: null, category: oldName }, { category: newName });
  await CategoryEntity.updateMany({}, { $set: { category: newName } }).where('category').equals(oldName);

  res.json({ success: true, message: 'Category updated', data: cat });
};

// DELETE /api/categories/:id — delete global category
const deleteCategory = async (req, res) => {
  const cat = await Category.findOneAndDelete({ _id: req.params.id, userId: null });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

  await SubCategory.deleteMany({ userId: null, category: cat.name });

  res.json({ success: true, message: 'Category deleted', data: null });
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
