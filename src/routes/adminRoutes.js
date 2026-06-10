const express = require('express');
const {
  getUsers, createUser, updateUserRole, deleteUser,
  getPendingRequests, approveRequest, rejectRequest,
  getCategories, createCategory, updateCategory, deleteCategory,
  getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, adminOnly);

// Users
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Signup requests
router.get('/requests', getPendingRequests);
router.post('/requests/:id/approve', approveRequest);
router.post('/requests/:id/reject', rejectRequest);

// Global Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Global SubCategories
router.get('/subcategories', getSubCategories);
router.post('/subcategories', createSubCategory);
router.put('/subcategories/:id', updateSubCategory);
router.delete('/subcategories/:id', deleteSubCategory);

module.exports = router;
