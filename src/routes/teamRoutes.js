const express = require('express');
const { getTeam, addMember, updateMember, deleteMember } = require('../controllers/teamController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(protect);
router.route('/:projectId/team').get(getTeam).post(addMember);
router.route('/:projectId/team/:memberId').put(updateMember).delete(deleteMember);

module.exports = router;
