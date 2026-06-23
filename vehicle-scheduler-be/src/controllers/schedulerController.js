const schedulerService = require('../services/schedulerService');

async function listDepots(req, res, next) {
  try {
    const depots = await schedulerService.fetchDepots(req.query);
    res.status(200).json({ success: true, data: depots });
  } catch (err) {
    next(err);
  }
}

async function listVehicles(req, res, next) {
  try {
    const vehicles = await schedulerService.fetchVehicles(req.query);
    res.status(200).json({ success: true, data: vehicles });
  } catch (err) {
    next(err);
  }
}

async function optimize(req, res, next) {
  try {
    const { mechanicHours, tasks } = req.body || {};
    
    // basic validation
    if (!mechanicHours || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      const err = new Error('Invalid request payload. Expected mechanicHours and tasks array.');
      err.status = 400;
      throw err;
    }

    const result = await schedulerService.optimizeSchedule(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDepots, listVehicles, optimize };
