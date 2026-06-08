const express = require('express');
const {
  getProjects,
  getProject,
  getProjectSummary,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').get(getProjects).post(createProject);
router.get('/:id/summary', getProjectSummary);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);

module.exports = router;
