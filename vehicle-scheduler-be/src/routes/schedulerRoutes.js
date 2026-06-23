const { Router } = require('express');
const { 
  listDepots, 
  listVehicles, 
  optimize 
} = require('../controllers/schedulerController');

const router = Router();

router.get('/depots', listDepots);
router.get('/vehicles', listVehicles);
router.post('/scheduler/optimize', optimize);

module.exports = router;
