const express = require('express');
const {
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} = require('../controllers/subCategoryController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').get(getSubCategories).post(createSubCategory);
router.route('/:id').put(updateSubCategory).delete(deleteSubCategory);

module.exports = router;
