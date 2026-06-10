const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');

// GET /api/categories
const getCategories = async (req, res) => {
  const data = await Category.find({ userId: req.user._id }).sort({ name: 1 });
  res.json({ success: true, message: 'Categories fetched', data });
};

// POST /api/categories
const createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const exists = await Category.findOne({ userId: req.user._id, name: name.trim() });
  if (exists) return res.status(400).json({ success: false, message: 'This category already exists' });

  const cat = await Category.create({ userId: req.user._id, name: name.trim() });
  res.status(201).json({ success: true, message: 'Category created', data: cat });
};

// PUT /api/categories/:id
const updateCategory = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

  const oldCat = await Category.findOne({ _id: req.params.id, userId: req.user._id });
  if (!oldCat) return res.status(404).json({ success: false, message: 'Category not found' });

  const oldName = oldCat.name;
  const newName = name.trim();

  oldCat.name = newName;
  await oldCat.save();

  // Cascade rename to subcategories and entities
  await SubCategory.updateMany(
    { userId: req.user._id, category: oldName },
    { category: newName }
  );
  const CategoryEntity = require('../models/CategoryEntity');
  await CategoryEntity.updateMany(
    { userId: req.user._id, category: oldName },
    { category: newName }
  );

  res.json({ success: true, message: 'Category updated', data: oldCat });
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  const cat = await Category.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

  // Also delete all subcategories under this category
  await SubCategory.deleteMany({ userId: req.user._id, category: cat.name });

  res.json({ success: true, message: 'Category deleted', data: null });
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
