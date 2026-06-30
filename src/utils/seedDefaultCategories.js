const Category = require('../models/Category');

const DEFAULT_CATEGORIES = ['Contractor', 'Material', 'Labour', 'Overhead', 'Project Services'];

/**
 * Seeds default categories for a user if they have none yet.
 * Called after signup/login so every user starts with the standard 6 categories.
 */
const seedDefaultCategories = async (userId) => {
  const existing = await Category.countDocuments({ userId });
  if (existing > 0) return; // Already has categories

  await Category.insertMany(
    DEFAULT_CATEGORIES.map((name) => ({ userId, name }))
  );
};

module.exports = seedDefaultCategories;
