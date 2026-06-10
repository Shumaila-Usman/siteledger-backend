const express = require('express');
const {
  getTeam, addMember, updateMember, deleteMember,
  getMyInvites, acceptInvite, rejectInvite,
} = require('../controllers/teamController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });
router.use(protect);

// Project team management (owner)
router.route('/:projectId/team').get(getTeam).post(addMember);
router.route('/:projectId/team/:memberId').put(updateMember).delete(deleteMember);

// My invites (invited user)
router.get('/invites/mine', getMyInvites);
router.post('/invites/:memberId/accept', acceptInvite);
router.post('/invites/:memberId/reject', rejectInvite);

module.exports = router;
