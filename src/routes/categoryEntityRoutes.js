const express = require('express');
const {
  getEntities,
  getEntity,
  getEntitySummary,
  createEntity,
  updateEntity,
  deleteEntity,
} = require('../controllers/categoryEntityController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').get(getEntities).post(createEntity);
router.get('/:id/summary', getEntitySummary);
router.route('/:id').get(getEntity).put(updateEntity).delete(deleteEntity);

module.exports = router;
