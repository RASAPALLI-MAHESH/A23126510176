const { Router } = require('express');
const { getNotifications, getTopPriority } = require('../controllers/notificationController');

const router = Router();

router.get('/notifications', getNotifications);
router.get('/priority/top', getTopPriority);

module.exports = router;
