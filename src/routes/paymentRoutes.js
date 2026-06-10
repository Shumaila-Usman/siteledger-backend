const express = require('express');
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.route('/').get(getPayments).post(createPayment);
router.route('/:id').get(getPayment).put(updatePayment).delete(deletePayment);

module.exports = router;
