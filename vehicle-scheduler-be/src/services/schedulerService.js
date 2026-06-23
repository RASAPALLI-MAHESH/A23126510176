const axios = require('axios');
const { optimizeMaintenanceTasks } = require('../algorithms/knapsack');

// mock logger
async function Log(service, level, message) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, service, level, message }));
}

async function fetchDepots(query) {
  await Log("backend", "info", "Fetching depots");
  
  const baseURL = process.env.DEPOT_API_BASE_URL || 'http://localhost:3002/depots';
  const token = process.env.DEPOT_API_TOKEN || 'EVALUATION_API_TOKEN';
  
  const response = await axios.get(baseURL, {
    params: query,
    timeout: Number(process.env.EXTERNAL_API_TIMEOUT_MS) || 10000,
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return response.data;
}

async function fetchVehicles(query) {
  await Log("backend", "info", "Fetching vehicles");
  
  const baseURL = process.env.VEHICLES_API_BASE_URL || 'http://localhost:3002/vehicles';
  const token = process.env.VEHICLES_API_TOKEN || 'EVALUATION_API_TOKEN';
  
  const response = await axios.get(baseURL, {
    params: query,
    timeout: Number(process.env.EXTERNAL_API_TIMEOUT_MS) || 10000,
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return response.data;
}

async function optimizeSchedule(payload) {
  await Log("backend", "info", "Running scheduler optimization");
  const result = optimizeMaintenanceTasks(payload.mechanicHours, payload.tasks);
  await Log("backend", "info", "Scheduler optimization completed successfully");
  return result;
}

module.exports = { fetchDepots, fetchVehicles, optimizeSchedule };
