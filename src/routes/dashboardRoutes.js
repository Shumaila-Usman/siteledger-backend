const express = require('express');
const {
  getSummary,
  getActiveProjects,
  getClientPayments,
  getPaidPayments,
  getPendingPayments,
  getPendingClientPayments,
  getPendingOutgoingPayments,
} = require('../controllers/dashboardController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/summary', getSummary);
router.get('/active-projects', getActiveProjects);
router.get('/client-payments', getClientPayments);
router.get('/paid-payments', getPaidPayments);
router.get('/pending-payments', getPendingPayments);
router.get('/pending-client-payments', getPendingClientPayments);
router.get('/pending-outgoing-payments', getPendingOutgoingPayments);

module.exports = router;
