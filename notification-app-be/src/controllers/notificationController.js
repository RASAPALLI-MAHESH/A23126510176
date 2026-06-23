const notificationService = require('../services/notificationService');

async function getNotifications(req, res, next) {
  try {
    const data = await notificationService.getRawNotifications();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getTopPriority(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    if (limit <= 0 || limit > 100) {
      const err = new Error('Limit must be between 1 and 100');
      err.status = 400;
      throw err;
    }
    
    const data = await notificationService.getTopPriorityNotifications(limit);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, getTopPriority };
